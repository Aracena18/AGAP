import {mkdir,readFile} from 'node:fs/promises';
import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Actual staff follow-up workflow',()=>{
 test.describe.configure({mode:'serial',retries:0});
 let fixture:{officer:string;administrator:string;supportFollowUps:{dueTaskId:string;overdueTaskId:string;scheduledTaskId:string;today:string;tomorrow:string;memberToken:string}};
 test.beforeAll(async()=>{fixture=JSON.parse(await readFile('.platform-test/browser.json','utf8'));});
 test.beforeEach(async({context,page})=>{await context.addCookies([{name:'agap_session',value:fixture.officer,url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);await page.goto('/#/staff/support-requests');await page.getByRole('button',{name:'Follow-ups',exact:true}).click();await expect(page.getByRole('heading',{name:'Officer follow-ups'})).toBeVisible();});

 test('reschedules, preserves history and completes exactly once across a lost successful response',async({page})=>{
  const id=fixture.supportFollowUps.dueTaskId;await page.getByLabel('Follow-up status',{exact:true}).selectOption('due');await page.getByRole('button',{name:`Open follow-up ${id}`,exact:true}).click();
  const history=page.getByRole('region',{name:'Follow-up history'});await expect(history.locator('article')).toHaveCount(25);
  await page.getByLabel('Action',{exact:true}).selectOption('reschedule');await page.getByLabel('New follow-up date',{exact:true}).fill(fixture.supportFollowUps.tomorrow);await page.getByLabel('Reason for rescheduling',{exact:true}).fill('Private fictional browser reason: member requested tomorrow.');
  await expect(page.getByRole('button',{name:'Support requests',exact:true})).toBeDisabled();
  let fail=true;await page.route(`**/api/v1/support-follow-ups/${id}/events?*`,async route=>{if(fail){fail=false;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'unavailable',message:'Fictional history outage.',correlationId:'follow-up-history'}})});}else await route.continue();});
  await history.getByRole('button',{name:'Load older follow-up history'}).click();await expect(history.getByRole('alert')).toContainText('draft is preserved');await history.getByRole('button',{name:'Retry follow-up history'}).click();await expect(history.locator('article')).toHaveCount(28);await expect(history.getByRole('heading',{name:'Follow-up history'})).toBeFocused();
  await expect(page.getByLabel('Reason for rescheduling',{exact:true})).toHaveValue('Private fictional browser reason: member requested tomorrow.');
  await mkdir('.platform-test/follow-up-screenshots',{recursive:true});await page.getByRole('heading',{name:'Selected follow-up'}).scrollIntoViewIfNeeded();await page.screenshot({path:'.platform-test/follow-up-screenshots/follow-up-desktop.png'});
  await page.getByRole('heading',{name:'Record follow-up action'}).evaluate(element=>element.scrollIntoView({block:'start'}));await page.screenshot({path:'.platform-test/follow-up-screenshots/follow-up-form-desktop.png'});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:320,height:800});await page.getByRole('heading',{name:'Selected follow-up'}).scrollIntoViewIfNeeded();await page.screenshot({path:'.platform-test/follow-up-screenshots/follow-up-320.png'});
  await page.getByRole('heading',{name:'Record follow-up action'}).evaluate(element=>element.scrollIntoView({block:'start'}));await page.screenshot({path:'.platform-test/follow-up-screenshots/follow-up-form-320.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.getByRole('button',{name:'Reschedule follow-up',exact:true}).click();await expect(page.getByText('Follow-up action saved. The queue has been refreshed.')).toBeVisible();await expect(page.getByText('No follow-ups match this status.')).toBeVisible();
  await page.getByLabel('Follow-up status',{exact:true}).selectOption('scheduled');await page.getByRole('button',{name:`Open follow-up ${id}`,exact:true}).click();await expect(page.getByText(`Original follow-up date: ${fixture.supportFollowUps.today}`,{exact:false})).toBeVisible();
  await page.getByLabel('Action taken',{exact:true}).fill('Private fictional browser completion: conversation recorded.');const keys:string[]=[];let lost=false;
  await page.route(`**/api/v1/support-follow-ups/${id}/completions`,async route=>{keys.push(route.request().headers()['idempotency-key']);if(!lost){lost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Complete follow-up',exact:true}).click();await expect(page.getByRole('alert')).toContainText('uncertain');await expect(page.getByLabel('Action taken',{exact:true})).toBeDisabled();await page.getByRole('button',{name:'Retry same follow-up action'}).click();
  await expect(page.getByText('Follow-up action saved. The queue has been refreshed.')).toBeVisible();expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  await page.getByLabel('Follow-up status',{exact:true}).selectOption('completed');await page.getByRole('button',{name:`Open follow-up ${id}`,exact:true}).click();await expect(page.getByText('This follow-up was completed at',{exact:false})).toBeVisible();await expect(page.getByLabel('Action taken',{exact:true})).toHaveCount(0);
  const result=await (await page.request.get(`/api/v1/support-follow-ups/${id}`)).json();expect(result.task.version).toBe(30);expect(result.source.followUpDate).toBe(fixture.supportFollowUps.today);
  const member=await page.request.get('/api/v1/member/support-requests',{headers:{Cookie:`agap_member_session=${fixture.supportFollowUps.memberToken}`}});expect(member.status()).toBe(200);const memberBody=await member.json();expect(memberBody.data[0].response).toBe('Fictional scheduled follow-up source.');expect(JSON.stringify(memberBody)).not.toContain('Private fictional browser');
 });

 test('preserves a stale draft without overwriting a concurrent server action',async({page})=>{
  const id=fixture.supportFollowUps.scheduledTaskId;await page.getByRole('button',{name:`Open follow-up ${id}`,exact:true}).click();await page.getByLabel('Action taken',{exact:true}).fill('Private stale browser draft.');
  const session=await (await page.request.get('/api/v1/session')).json();
  const changed=await page.request.post(`/api/v1/support-follow-ups/${id}/reschedules`,{headers:{'X-CSRF-Token':session.csrfToken,'Idempotency-Key':crypto.randomUUID(),'If-Match':'"1"',Origin:new URL(page.url()).origin},data:{date:fixture.supportFollowUps.tomorrow,reason:'Private concurrent browser reschedule.'}});expect(changed.status()).toBe(201);
  await page.getByRole('button',{name:'Complete follow-up',exact:true}).click();await expect(page.getByRole('alert')).toContainText('changed');await expect(page.getByLabel('Action taken',{exact:true})).toHaveValue('Private stale browser draft.');
  await page.getByRole('button',{name:'Discard changes',exact:true}).click();await page.getByRole('button',{name:'Refresh follow-ups',exact:true}).click();await page.getByRole('button',{name:`Open follow-up ${id}`,exact:true}).click();await expect(page.getByText('Private concurrent browser reschedule.',{exact:true})).toBeVisible();
  expect((await (await page.request.get(`/api/v1/support-follow-ups/${id}`)).json()).task.status).toBe('open');
 });

 test('clears private history and drafts after a later access denial',async({page})=>{
  const id=fixture.supportFollowUps.dueTaskId;await page.getByLabel('Follow-up status',{exact:true}).selectOption('completed');await page.getByRole('button',{name:`Open follow-up ${id}`,exact:true}).click();
  // Database reassignment and revocation are exercised by the actual API tests.
  await page.route(`**/api/v1/support-follow-ups/${id}/events?*`,route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'support_forbidden',message:'Fictional later access denial.',correlationId:'follow-up-denied'}})}));
  await page.getByRole('button',{name:'Load older follow-up history'}).click();await expect(page.getByText('Support requires an assigned officer or branch administrator. Reload after your access is reviewed.')).toBeVisible();
  await expect(page.getByRole('region',{name:'Follow-up history'})).toHaveCount(0);await expect(page.getByText('Private due source note.',{exact:false})).toHaveCount(0);
 });
});
