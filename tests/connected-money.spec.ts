import {readFile,mkdir} from 'node:fs/promises';
import {expect,test,type Browser,type BrowserContext,type Page} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
type Fixture={appId:string;day:string;officer:string;reviewer:string;cashier:string;authorizer:string;auditor:string;administrator:string;member:string;officerId:string};
type Role=Exclude<keyof Fixture,'appId'|'day'|'officerId'>;
const origin=`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`;
let f:Fixture,loanId:string;
async function open(browser:Browser,role:Role){const context=await browser.newContext({baseURL:origin,viewport:{width:1366,height:900}});await context.addCookies([{name:role==='member'?'agap_member_session':'agap_session',value:f[role],url:origin,httpOnly:true,sameSite:'Lax'}]);return {context,page:await context.newPage()};}
async function json(context:BrowserContext,path:string,body?:unknown,version?:number){
 const member=path.startsWith('/member/'),session=body===undefined?null:await(await context.request.get(`/api/v1/${member?'member/':''}session`)).json();
 const response=body===undefined?await context.request.get(`/api/v1${path}`):await context.request.post(`/api/v1${path}`,{headers:{Origin:origin,'X-CSRF-Token':session.csrfToken,'Idempotency-Key':crypto.randomUUID(),...(version===undefined?{}:{'If-Match':`"${version}"`})},data:body});
 const data=await response.json();expect(response.status(),JSON.stringify(data)).toBe(body===undefined?200:201);return data;
}
async function approve(officer:BrowserContext,reviewer:BrowserContext,member:BrowserContext){
 const path=`/applications/${f.appId}`;
 for(const context of [officer,reviewer]){const review=await json(context,`${path}/decision-review`);await json(context,`${path}/decision-review/conflicts`,{status:'clear',reference:'Automated fictional browser self-declaration.'},review.version);}
 const r=await json(officer,`${path}/decision-review`);await json(officer,`${path}/decision-review/confirmations`,{evidenceBasisHash:r.evidenceBasisHash,mode:'manual',reviewedSources:true,reviewedScenarios:true,reason:'Automated fictional browser setup; not independent user acceptance.'},r.version);
 const w=await json(officer,`${path}/decision-workspace`),offer=w.offers[0],recommendation=await json(officer,`${path}/recommendations`,{assessmentId:w.assessment.id,offerVersionId:offer.id,inputVersion:w.assessment.inputVersion,reason:'Fictional checked offer for browser financial integration.'},w.application.version);
 const current=await json(reviewer,`${path}/decision-workspace`),body={outcome:'approve',assessmentId:w.assessment.id,recommendationId:recommendation.id,offerVersionId:offer.id,rationale:'Fictional separate reviewer checked exact terms.',departureReason:'',exceptions:[],reviewDate:'2026-12-31'},preview=await json(reviewer,`${path}/decision-previews`,body,current.application.version);
 const decision=await json(reviewer,`${path}/decisions`,{previewId:preview.id,decision:{...body,explanationReviewed:true}},current.application.version),terms=await json(member,`/member${path}/decision`),application=await json(member,`/member${path}`);
 await json(member,`/member${path}/acceptances`,{decisionId:decision.id,documentVersionId:terms.data.documentVersionId,acknowledgment:true},application.version);
}
async function capture(page:Page,name:string){await mkdir('.platform-test/connected-money-screenshots',{recursive:true});await page.evaluate(()=>document.fonts.ready);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await page.screenshot({path:`.platform-test/connected-money-screenshots/${name}.png`,fullPage:true});}
async function act(page:Page,reason:string,button:string){await page.getByLabel('Action reason',{exact:true}).fill(reason);await page.getByRole('button',{name:button,exact:true}).click();await expect(page.getByRole('status').filter({hasText:'Action recorded.'})).toBeVisible();}

test.describe('Connected money through actual financial UI and services',()=>{
 test.describe.configure({mode:'serial',retries:0});
 test.beforeAll(async()=>{f=JSON.parse(await readFile('.platform-test/browser.json','utf8')).connectedMoney;});
 test('separate roles release, recover unknown movement, repay, print, reconcile and respond to confirmed strain',async({browser})=>{
  test.setTimeout(180000);
  const cashier=await open(browser,'cashier'),authorizer=await open(browser,'authorizer'),officer=await open(browser,'officer'),reviewer=await open(browser,'reviewer'),member=await open(browser,'member'),auditor=await open(browser,'auditor'),admin=await open(browser,'administrator');
  const contexts=[cashier,authorizer,officer,reviewer,member,auditor,admin];
  try{
   await approve(officer.context,reviewer.context,member.context);
   const page=cashier.page,a=authorizer.page;
   await page.goto('/#/staff');await expect(page.getByRole('heading',{name:'Financial applications',exact:true})).toBeVisible();await page.getByRole('link',{name:'Open financial application',exact:true}).click();
   await page.getByRole('button',{name:'Create pending loan',exact:true}).click();await expect(page.getByRole('heading',{name:'Pending loan created',exact:true})).toBeFocused();
   loanId=(await json(cashier.context,`/applications/${f.appId}/financial-workspace`)).loanId;expect(loanId).toBeTruthy();
   await page.getByLabel('Fictional instrument reference',{exact:true}).fill('FICTIONAL-BROWSER-RELEASE');await page.getByLabel('Release preparation reason',{exact:true}).fill('Fictional cashier checked the displayed principal and date.');
   const attempts:{key:string|undefined;body:string|null}[]=[];let lost=true;
   await page.route(`**/api/v1/loans/${loanId}/disbursements`,async route=>{attempts.push({key:route.request().headers()['idempotency-key'],body:route.request().postData()});if(lost){lost=false;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();});
   await page.getByRole('button',{name:'Prepare release command',exact:true}).click();await expect(page.getByRole('alert')).toContainText('uncertain');await expect(page.getByRole('button',{name:'Refresh financial status',exact:true})).toBeDisabled();
   await page.getByRole('button',{name:'Retry same financial submission',exact:true}).click();await expect(page.getByRole('heading',{name:'Release command prepared',exact:true})).toBeFocused();expect(attempts).toHaveLength(2);expect(attempts[1]).toEqual(attempts[0]);
   await page.getByRole('link',{name:'Open saved loan and payments',exact:true}).click();await expect(page.getByRole('heading',{name:'Loan and payments',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Authorize release',exact:true})).toHaveCount(0);
   await a.goto(`/#/staff/loans/${loanId}`);await act(a,'Separate fictional authorizer reviewed the release.','Authorize release');
   await page.getByRole('button',{name:'Refresh saved position',exact:true}).click();await act(page,'Fictional cashier records the original submission intent.','Record submission intent');
   await act(page,'Fictional settlement is unknown; reconcile this original intent.','Record unknown simulation outcome');await expect(page.getByText('Reconcile this existing movement. Do not prepare another transfer.',{exact:true})).toBeVisible();await page.reload();await expect(page.getByRole('button',{name:'Resolve original simulated movement',exact:true})).toBeVisible();
   expect((await json(cashier.context,`/loans/${loanId}/workspace?asOfDate=${f.day}`)).position).toBeNull();
   await act(page,'Fictional evidence now confirms the original movement.','Resolve original simulated movement');
   await a.getByRole('button',{name:'Refresh saved position',exact:true}).click();let failRead=false;
   await a.route(`**/api/v1/financial-commands/*/postings`,async route=>{const response=await route.fetch();expect(response.status()).toBe(201);failRead=true;await route.fulfill({response});});
   await a.route(`**/api/v1/loans/${loanId}/workspace?*`,route=>failRead?route.fulfill({status:503,json:{error:{code:'unavailable',message:'Fictional independent post-save read failure',correlationId:'fictional-money-read'}}}):route.continue());
   await act(a,'Separate authorizer posts the original confirmed release.','Post recorded movement');await expect(a.getByRole('alert')).toContainText('post-save read failure');await expect(a.getByRole('button',{name:'Retry same submission',exact:true})).toHaveCount(0);failRead=false;await a.unroute('**/api/v1/financial-commands/*/postings');await a.getByRole('button',{name:'Refresh saved position',exact:true}).click();
   await expect(a.getByText('₱1,000.00',{exact:true}).first()).toBeVisible();await capture(a,'release-desktop');
   await page.getByRole('button',{name:'Refresh saved position',exact:true}).click();await act(page,'Cashier reviewed the exact next scheduled principal payment.','Prepare scheduled repayment');
   await a.getByRole('button',{name:'Refresh saved position',exact:true}).click();await act(a,'Separate authorizer reviewed the exact scheduled payment.','Authorize repayment');
   await page.getByRole('button',{name:'Refresh saved position',exact:true}).click();await act(page,'Cashier records the existing repayment intent.','Record submission intent');await act(page,'Fictional exact scheduled payment was received.','Record simulated settlement');
   await a.getByRole('button',{name:'Refresh saved position',exact:true}).click();await act(a,'Separate authorizer posts the verified fictional payment.','Post recorded movement');
   await a.getByLabel('Selected saved receipt',{exact:true}).selectOption({index:1});await expect(a.getByRole('article',{name:'Saved repayment receipt'})).toContainText('₱500.00');await a.evaluate(()=>{(window as Window&{printed?:boolean}).printed=false;window.print=()=>{(window as Window&{printed?:boolean}).printed=true;};});await a.getByRole('button',{name:'Print selected receipt',exact:true}).click();expect(await a.evaluate(()=>(window as Window&{printed?:boolean}).printed)).toBe(true);
   await a.setViewportSize({width:320,height:800});await capture(a,'repayment-320');await a.setViewportSize({width:1366,height:900});await capture(a,'repayment-desktop');
   const position=await json(cashier.context,`/loans/${loanId}/workspace?asOfDate=${f.day}`);expect(position.position.principalCentavos).toBe(50000);expect(position.position.receipts).toHaveLength(1);expect(position.commands.filter((c:{state:string})=>c.state==='confirmed')).toHaveLength(2);
   await member.page.goto('/#/member/loans');await expect(member.page.getByText('₱500.00',{exact:true}).first()).toBeVisible();
   await auditor.page.goto('/#/staff/reconciliations');await auditor.page.getByLabel('From date',{exact:true}).fill(f.day);await auditor.page.getByLabel('Through date',{exact:true}).fill(f.day);await auditor.page.getByRole('button',{name:'Run reconciliation',exact:true}).click();await expect(auditor.page.getByRole('region',{name:'Saved reconciliation result'})).toContainText('Matched');await capture(auditor.page,'reconciliation-desktop');
   await member.page.goto('/#/member/help');await member.page.getByLabel('What changed, and what help do you need?').fill('Fictional member paid the scheduled amount but needs help with essential expenses.');await member.page.getByText('Add a loan or check-in (optional)',{exact:true}).click();await member.page.getByLabel('Related loan (optional)',{exact:true}).selectOption(loanId);await member.page.getByLabel('Can you currently meet essential expenses?').selectOption('no');await member.page.getByLabel('Would you like to report financial strain?').selectOption('reported');await member.page.getByRole('button',{name:'Review request',exact:true}).click();await member.page.getByLabel('I agree to send this message for staff review.').check();
   const sent=member.page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/api/v1/member/support-requests'));await member.page.getByRole('button',{name:'Send request',exact:true}).click();const support=await(await sent).json();
   await json(admin.context,`/support-requests/${support.id}/assignments`,{officerId:f.officerId,reason:'Fictional normal support responsibility.'},1);
   await officer.page.goto('/#/staff/support-requests');await officer.page.getByRole('button',{name:`Open support request ${support.id}`,exact:true}).click();await expect(officer.page.getByRole('heading',{name:'Confirmed member concern',exact:true})).toBeVisible();const current=await json(officer.context,`/support-requests/${support.id}/position`);expect(current).toMatchObject({state:'available',data:{principalCentavos:50000,overdueCentavos:0}});
   await officer.page.getByLabel('Response shared with member',{exact:true}).fill('Fictional conversation arranged; the original loan terms remain unchanged.');await officer.page.getByLabel('Internal staff action / note',{exact:true}).fill('PRIVATE CONNECTED MONEY STAFF NOTE');await officer.page.getByRole('button',{name:'Publish response',exact:true}).click();await member.page.reload();await expect(member.page.getByText('Fictional conversation arranged; the original loan terms remain unchanged.',{exact:true})).toBeVisible();await expect(member.page.getByText('PRIVATE CONNECTED MONEY STAFF NOTE')).toHaveCount(0);await capture(member.page,'member-help-desktop');
  }finally{for(const c of contexts)await c.context.close();}
 });
 test('later permission denial clears the financial workspace and unsent reason',async({browser})=>{
  const actor=await open(browser,'authorizer');try{await actor.page.goto(`/#/staff/loans/${loanId}`);await actor.page.getByLabel('Action reason',{exact:true}).fill('PRIVATE UNSENT FINANCIAL REASON');await actor.page.route(`**/api/v1/loans/${loanId}/workspace?*`,route=>route.fulfill({status:403,json:{error:{code:'access_changed',message:'Fictional later denial',correlationId:'fictional-financial-denial'}}}));await actor.page.getByRole('button',{name:'Refresh saved position',exact:true}).click();await expect(actor.page.getByText('Loan information is unavailable to the current account. Sign in again or contact the servicing owner.',{exact:true})).toBeVisible();await expect(actor.page.getByLabel('Action reason',{exact:true})).toHaveCount(0);await expect(actor.page.getByText('PRIVATE UNSENT FINANCIAL REASON')).toHaveCount(0);}finally{await actor.context.close();}
 });
});
