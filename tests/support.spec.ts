import {mkdir,readFile} from 'node:fs/promises';
import {expect,test,type BrowserContext} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function signIn(context:BrowserContext,role:'supportMember'|'officer'|'administrator'|'auditor'){
 const f=JSON.parse(await readFile('.platform-test/browser.json','utf8'));
 await context.addCookies([{name:role==='supportMember'?'agap_member_session':'agap_session',value:f[role],url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);
}
test.describe('HLT-01 actual confirmed support journey',()=>{
 test.describe.configure({mode:'serial',retries:0});
 let id:string;
 test('member confirmation, lost response retry, administrator assignment and private officer response',async({browser})=>{
  const member=await browser.newContext({viewport:{width:320,height:800}});await signIn(member,'supportMember');const page=await member.newPage();
  let lost=false;const keys:string[]=[];
  await page.route('**/api/v1/member/support-requests',async route=>{
   if(route.request().method()==='POST'){keys.push(route.request().headers()['idempotency-key']);if(!lost){lost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');return;}}await route.continue();
  });
  await page.goto('/#/member/help');
  await page.getByLabel('What changed, and what help do you need?').fill('Fictional member is paying on time but cannot cover essentials. Please arrange a conversation.');
  await page.getByLabel('Can you currently meet essential expenses?').selectOption('no');
  await page.getByLabel('Have you borrowed to make repayments?').selectOption('declined');
  await page.getByLabel('Would you like to report financial strain?').selectOption('reported');
  await page.getByRole('button',{name:'Review request',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Review what will be shared'})).toBeFocused();
  await expect(page.getByText('Have you borrowed to make repayments? Prefer not to answer')).toBeVisible();
  await page.getByLabel('I agree to send this message for staff review.').check();await page.getByRole('button',{name:'Send request',exact:true}).click();
  await expect(page.getByRole('alert')).toContainText('uncertain');await page.getByRole('button',{name:'Retry same submission',exact:true}).click();
  await expect(page.getByText('Your payment-help request was sent for staff review. Your current payment terms remain unchanged.')).toBeVisible();expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  const history=await (await page.request.get('/api/v1/member/support-requests')).json();expect(history.data).toHaveLength(1);id=history.data[0].id;
  const admin=await browser.newContext();await signIn(admin,'administrator');const assignment=await admin.newPage();await assignment.goto('/#/staff/support-requests');
  const target=assignment.getByRole('button',{name:`Open support request ${id}`,exact:true}),rows=assignment.getByRole('region',{name:'Support request queue'}).locator('tbody tr');
  await expect(rows).not.toHaveCount(0);
  for(let batch=0;batch<10&&await target.count()===0;batch++){
   const more=assignment.getByRole('button',{name:'Load more requests',exact:true});await expect(more).toBeVisible();if(await target.count())break;
   const before=await rows.count(),[response]=await Promise.all([assignment.waitForResponse(response=>response.request().method()==='GET'&&response.url().includes('/api/v1/support-requests?cursor=')),more.click()]);
   const next=await response.json();await expect(rows).toHaveCount(before+next.items.length);
  }
  await assignment.getByRole('button',{name:`Open support request ${id}`,exact:true}).click();
  await expect(assignment.getByRole('heading',{name:'Confirmed member concern'})).toHaveCount(0);
  await assignment.getByLabel('Responsible officer',{exact:true}).selectOption({label:'Fictional Officer'});
  await assignment.getByLabel('Assignment reason',{exact:true}).fill('Fictional branch follow-up responsibility.');await assignment.getByRole('button',{name:'Assign officer',exact:true}).click();
  await expect(assignment.getByText(`${id} · Version 2`)).toBeVisible();
  const officer=await browser.newContext({viewport:{width:1366,height:900}});await signIn(officer,'officer');const queue=await officer.newPage();await queue.goto('/#/staff/support-requests');
  await queue.getByRole('button',{name:`Open support request ${id}`,exact:true}).click();await expect(queue.getByRole('heading',{name:'Confirmed member concern'})).toBeVisible();
  await expect(queue.getByText('Declined',{exact:true})).toBeVisible();await expect(queue.getByText('Reported',{exact:true})).toBeVisible();
  await queue.getByLabel('Response shared with member',{exact:true}).fill('We received your request. An officer will discuss the available options with you.');
  await queue.getByLabel('Internal staff action / note',{exact:true}).fill('Fictional private staff follow-up note.');await queue.getByRole('button',{name:'Publish response',exact:true}).click();
  await expect(queue.getByText(`${id} · Version 3`)).toBeVisible();await expect(queue.getByText('Internal action: Fictional private staff follow-up note.')).toBeVisible();
  await page.reload();await expect(page.getByText('We received your request. An officer will discuss the available options with you.')).toBeVisible();await expect(page.getByText('Fictional private staff follow-up note.')).toHaveCount(0);
  await mkdir('.platform-test/support-screenshots',{recursive:true});await queue.evaluate(()=>document.fonts.ready);await queue.evaluate(()=>window.scrollTo(0,0));await queue.screenshot({path:'.platform-test/support-screenshots/support-desktop.png',fullPage:true});
  await queue.setViewportSize({width:320,height:800});await queue.evaluate(()=>window.scrollTo(0,0));await queue.screenshot({path:'.platform-test/support-screenshots/support-320.png',fullPage:true});await page.screenshot({path:'.platform-test/support-screenshots/member-support-320.png',fullPage:true});
  expect(await queue.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
  const values=queue.getByRole('region',{name:'Selected support request'}).locator('dd');for(const value of await values.all())expect((await value.boundingBox())!.width).toBeGreaterThanOrEqual(200);
  const region=queue.getByRole('region',{name:'Support request queue'});await region.focus();await expect(region).toBeFocused();expect((await new AxeBuilder({page:queue}).analyze()).violations).toEqual([]);
  await member.close();await admin.close();await officer.close();
 });
 test('clears cached disclosures when a later permission check denies access',async({page,context})=>{
  await signIn(context,'officer');await page.goto('/#/staff/support-requests');await page.getByRole('button',{name:`Open support request ${id}`,exact:true}).click();await expect(page.getByRole('heading',{name:'Confirmed member concern'})).toBeVisible();
  await page.route('**/api/v1/support-requests',r=>r.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'support_forbidden',message:'Fictional permission denial',correlationId:'fictional-browser-test'}})}));
  await page.getByRole('button',{name:'Refresh queue',exact:true}).click();await expect(page.getByText('Support requires an assigned officer or branch administrator. Reload after your access is reviewed.')).toBeVisible();await expect(page.getByText('Fictional private staff follow-up note.')).toHaveCount(0);
 });
 test('financial auditing does not grant support-disclosure access',async({page,context})=>{
  await signIn(context,'auditor');await page.goto('/#/staff/support-requests');await expect(page.getByRole('button',{name:'Publish response',exact:true})).toHaveCount(0);await expect(page.getByText('Support requires an assigned officer or branch administrator. Reload after your access is reviewed.')).toBeVisible();expect((await page.request.get('/api/v1/support-requests')).status()).toBe(403);
 });
});
