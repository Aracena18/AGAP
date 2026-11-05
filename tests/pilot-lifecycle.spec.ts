import { test,expect,type BrowserContext,type Page } from '@playwright/test';
import { spawn,type ChildProcess } from 'node:child_process';
import { readFile,mkdir } from 'node:fs/promises';

test.describe.configure({mode:'serial'});
let server:ChildProcess,fixture:{applicationId:string;officer:string;reviewer:string;cashier:string;authorizer:string;member:string};
const apiPort=Number(process.env.AGAP_PILOT_TEST_API_PORT??4114),origin=`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`;
test.beforeAll(async()=>{
 server=spawn(process.execPath,['node_modules/tsx/dist/cli.mjs','--tsconfig','tsconfig.platform.json','apps/api/test/pilot-browser-server.ts'],{env:{...process.env,AGAP_TEST_DATABASE_URL:'postgresql://agap_owner:development-owner@127.0.0.1:55435/agap_test',AGAP_PILOT_TEST_API_PORT:String(apiPort)},stdio:['ignore','pipe','pipe']});
 let failure='';server.stderr?.on('data',b=>{failure+=String(b);});
 const deadline=Date.now()+25000;let ready=false;
 while(Date.now()<deadline){if(server.exitCode!==null)throw new Error('Pilot browser API stopped: '+failure);try{ready=(await fetch(`http://127.0.0.1:${apiPort}/api/v1/health`)).ok;if(ready)break;}catch{/* bounded readiness poll */}await new Promise(resolve=>setTimeout(resolve,200));}
 if(!ready)throw new Error('Pilot API did not become ready: '+failure);
 fixture=JSON.parse(await readFile('.platform-test/pilot-browser.json','utf8'));
});
test.afterAll(async()=>{if(server?.exitCode===null){server.kill('SIGTERM');await new Promise<void>(resolve=>{server.once('exit',()=>resolve());setTimeout(resolve,10000);});}});
async function connect(context:BrowserContext,token:string,member=false){
 await context.addCookies([{name:member?'agap_member_session':'agap_session',value:token,domain:'127.0.0.1',path:member?'/api/v1/member':'/',httpOnly:true,sameSite:'Lax'}]);
 // This is a forwarding proxy to the real isolated API, not a mocked response.
 await context.route('**/api/v1/**',async route=>{const url=new URL(route.request().url());const response=await route.fetch({url:`http://127.0.0.1:${apiPort}${url.pathname}${url.search}`});await route.fulfill({response});});
}
async function declaration(page:Page){const form=page.locator('form').filter({has:page.getByRole('heading',{name:'Declare your current conflict status'})});await page.getByLabel('Your status',{exact:true}).selectOption('clear');await form.getByLabel('Reason and reviewed evidence').fill('Fictional explicit declaration after checking the applicable restriction.');await page.getByRole('button',{name:'Save your declaration'}).click();await expect(page.getByText('The command was saved.',{exact:true})).toBeVisible();}
async function movement(page:Page,kind:'disbursement'|'repayment',step:'prepare'|'authorize'|'settle'|'post'){
 if(step==='prepare'){const section=page.locator('form').filter({has:page.getByRole('heading',{name:kind==='disbursement'?'Prepare simulated release':'Prepare exact scheduled repayment'})});await section.getByLabel('Effective calendar date').fill('2026-11-05');await section.getByLabel('Fictional instrument reference').fill('FICTIONAL-BROWSER-'+kind);await section.getByLabel('Reason and reviewed evidence').fill('Fictional exact principal movement; no actual funds.');await section.getByRole('button',{name:'Prepare command'}).click();}
 else{await expect(page.getByLabel('Saved command',{exact:true})).toBeVisible();const expectedState=step==='authorize'?'prepared':step==='settle'?'authorized':'confirmed_unposted';const option=page.getByLabel('Saved command',{exact:true}).locator('option').filter({hasText:new RegExp(`^${kind} · ${expectedState} ·`)});await expect(option).toHaveCount(1);await page.getByLabel('Saved command',{exact:true}).selectOption((await option.getAttribute('value'))!);
  if(step==='authorize')await page.getByRole('button',{name:'Authorize movement',exact:true}).click();
  if(step==='settle'){await page.getByRole('button',{name:'Record submission intent'}).click();await expect(page.getByLabel('Server simulation outcome')).toBeVisible();await page.getByLabel('Server simulation outcome').selectOption('confirmed');await page.getByLabel('Reason and reviewed evidence',{exact:true}).last().fill('Fictional server-established confirmed settlement.');await page.getByRole('button',{name:'Record simulated outcome'}).click();}
  if(step==='post')await page.getByRole('button',{name:'Post confirmed movement and journal'}).click();
 }
 await expect(page.getByText(step==='post'?'The simulated movement and balanced journal were posted together.':'The financial command was saved. No real funds moved.',{exact:true})).toBeVisible();
}
test('completes the supported lifecycle through real HTTP with separate staff/member browser sessions',async({browser})=>{
 test.setTimeout(90000);
 const contexts=await Promise.all(Array.from({length:5},()=>browser.newContext()));
 try{
  const [officer,reviewer,cashier,authorizer,member]=contexts;
  await Promise.all([connect(officer,fixture.officer),connect(reviewer,fixture.reviewer),connect(cashier,fixture.cashier),connect(authorizer,fixture.authorizer),connect(member,fixture.member,true)]);
  const [op,rp,cp,ap,mp]=await Promise.all(contexts.map(c=>c.newPage()));const lifecycle=`${origin}/#/staff/applications/${fixture.applicationId}/lifecycle`;
  await op.goto(lifecycle);await declaration(op);await rp.goto(lifecycle);await declaration(rp);await op.reload();
  const recommend=op.locator('form').filter({has:op.getByRole('heading',{name:'Officer recommendation',exact:true})});await recommend.getByLabel('Reason and reviewed evidence').fill('Confirmed household dates and the supported principal-only offer.');await recommend.getByRole('button',{name:'Save recommendation'}).click();await expect(op.getByText('The command was saved.',{exact:true})).toBeVisible();
  await rp.reload();const decision=rp.locator('form').filter({has:rp.getByRole('heading',{name:'Prepare a human decision preview'})});await decision.getByLabel('Reason and reviewed evidence').fill('Separate authorized review of the current checked terms.');await decision.getByLabel('Review date / approval validity').fill('2026-12-01');await decision.getByRole('button',{name:'Prepare preview'}).click();await expect(rp.getByRole('heading',{name:'Review the exact preview'})).toBeVisible();await rp.getByLabel('I read this exact explanation and document and take responsibility for this decision.').check();await rp.getByRole('button',{name:'Record reviewed decision'}).click();
  await mp.goto(`${origin}/#/member/applications/${fixture.applicationId}`);await expect(mp.getByRole('heading',{name:'Approved for these saved terms'})).toBeVisible();await mp.getByLabel('I reviewed and accept this exact document, schedule and full costs.').check();await mp.getByRole('button',{name:'Accept these terms'}).click();await expect(mp.getByText('Your acceptance of the saved document is recorded.')).toBeVisible();
  await cp.goto(lifecycle);await cp.getByRole('button',{name:'Create pending loan'}).click();await expect(cp.getByRole('heading',{name:'Prepare simulated release'})).toBeVisible();
  for(const kind of ['disbursement','repayment']as const){if(kind==='repayment')await cp.reload();await movement(cp,kind,'prepare');await ap.goto(lifecycle);await ap.getByRole('button',{name:'Refresh financial status'}).click();await movement(ap,kind,'authorize');await cp.reload();await movement(cp,kind,'settle');await ap.reload();await movement(ap,kind,'post');}
  await expect(ap.getByText('settled',{exact:false}).first()).toBeVisible();await mp.goto(`${origin}/#/member/loans`);await expect(mp.getByRole('heading',{name:'My loans',exact:true})).toBeVisible();const loans=await mp.evaluate(async()=>{const response=await fetch('/api/v1/member/loans');return response.json();});expect(loans.data[0].position.principalCentavos).toBe(0);expect(loans.data[0].receipts).toHaveLength(1);
  await mkdir('docs/screenshots/experiment-f-pilot',{recursive:true});await ap.screenshot({path:'docs/screenshots/experiment-f-pilot/financial-desktop.png',fullPage:true});await op.goto(`${origin}/#/staff/review-queue`);await op.setViewportSize({width:320,height:900});await op.screenshot({path:'docs/screenshots/experiment-f-pilot/queue-320.png',fullPage:true});
 }finally{await Promise.all(contexts.map(c=>c.close()));}
});
