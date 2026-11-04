import {mkdir,readFile} from 'node:fs/promises';
import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Actual member support history beyond 100 requests',()=>{
 test.describe.configure({mode:'serial',retries:0});
 let fixture:{memberSupportHistory:{memberToken:string;otherMemberToken:string}};
 test.beforeAll(async()=>{fixture=JSON.parse(await readFile('.platform-test/browser.json','utf8'));});
 test.beforeEach(async({context,page})=>{await context.addCookies([{name:'agap_member_session',value:fixture.memberSupportHistory.memberToken,url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);await page.goto('/#/member/help');});
 test('loads 125 requests, preserves draft and consent through a read failure and resets history after an exactly-once submission',async({page})=>{
  const history=page.getByRole('region',{name:'My requests',exact:true});await expect(history.locator('article')).toHaveCount(25);await expect(history.getByText('Published fictional response for the member.',{exact:true})).toBeVisible();
  const draft='Fictional new request after reading all 125 older requests.';await page.getByLabel('What changed, and what help do you need?',{exact:true}).fill(draft);await page.getByRole('button',{name:'Review request',exact:true}).click();await page.getByLabel('I agree to send this message for staff review.').check();
  let failed=false;await page.route('**/api/v1/member/support-history?*',async route=>{if(!failed){failed=true;await route.fulfill({status:503,json:{error:{code:'unavailable',message:'Fictional page outage.',correlationId:'member-history-outage'}}});}else await route.continue();});
  await history.getByRole('button',{name:'Load older requests'}).click();await expect(history.getByRole('alert')).toContainText('draft is preserved');await history.getByRole('button',{name:'Retry older requests'}).click();await expect(history.locator('article')).toHaveCount(50);await expect(page.getByLabel('I agree to send this message for staff review.')).toBeChecked();
  await mkdir('.platform-test/member-history-screenshots',{recursive:true});await history.getByRole('button',{name:'Load older requests'}).evaluate(element=>element.scrollIntoView({block:'end'}));await page.screenshot({path:'.platform-test/member-history-screenshots/member-history-desktop.png'});expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:320,height:800});await history.getByRole('button',{name:'Load older requests'}).evaluate(element=>element.scrollIntoView({block:'end'}));await page.screenshot({path:'.platform-test/member-history-screenshots/member-history-320.png'});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  for(const count of [75,100,125]){await history.getByRole('button',{name:'Load older requests'}).click();await expect(history.locator('article')).toHaveCount(count);}
  await expect(history.getByText('All requests loaded.')).toBeVisible();await expect(history.getByRole('heading',{name:'My requests'})).toBeFocused();expect(new Set(await history.locator('article > p:first-of-type').allTextContents()).size).toBe(125);await expect(page.getByText('PRIVATE browser staff history note.',{exact:false})).toHaveCount(0);
  const keys:string[]=[];let lost=false;await page.route('**/api/v1/member/support-requests',async route=>{keys.push(route.request().headers()['idempotency-key']);if(!lost){lost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');}else await route.continue();});
  await page.getByRole('button',{name:'Send request',exact:true}).click();await expect(page.getByRole('alert')).toContainText('uncertain');await expect(history.getByRole('button',{name:'Refresh requests'})).toBeDisabled();
  let freshReadUnavailable=true;await page.route('**/api/v1/member/support-history',async route=>{if(freshReadUnavailable){await route.fulfill({status:503,json:{error:{code:'unavailable',message:'Fictional post-save read outage.',correlationId:'member-history-fresh'}}});}else await route.continue();});
  await page.getByRole('button',{name:'Retry same submission'}).click();await expect(page.getByRole('status').filter({hasText:'sent for staff review'})).toBeVisible();await expect(history.getByRole('button',{name:'Retry request history'})).toBeVisible();freshReadUnavailable=false;await history.getByRole('button',{name:'Retry request history'}).click();
  await expect(page.getByRole('status').filter({hasText:'sent for staff review'})).toBeVisible();await expect(history.locator('article')).toHaveCount(25);await expect(history.locator('article').first()).toContainText(draft);expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  const result=await (await page.request.get('/api/v1/member/support-history')).json();expect(result.data.items[0].message).toBe(draft);
 });
 test('discards a delayed older page after changing to a different member session',async({page,context})=>{
  const history=page.getByRole('region',{name:'My requests',exact:true});await expect(history.locator('article')).toHaveCount(25);
  let release!:()=>void,started!:()=>void;const gate=new Promise<void>(done=>release=done),ready=new Promise<void>(done=>started=done);
  await page.route('**/api/v1/member/support-history?*',async route=>{const response=await route.fetch();started();await gate;try{await route.fulfill({response});}catch{/* The old member view canceled its read. */}});
  await history.getByRole('button',{name:'Load older requests'}).click();await ready;await context.clearCookies();await context.addCookies([{name:'agap_member_session',value:fixture.memberSupportHistory.otherMemberToken,url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);await page.reload();release();
  await expect(history.getByText('No support requests are recorded.')).toBeVisible();await expect(history.locator('article')).toHaveCount(0);await expect(page.getByText('Fictional member history request 125.',{exact:true})).toHaveCount(0);
 });
 test('clears history and the unsent form after a later access denial',async({page})=>{
  const history=page.getByRole('region',{name:'My requests',exact:true});await expect(history.locator('article')).toHaveCount(25);await page.getByLabel('What changed, and what help do you need?',{exact:true}).fill('Private unsent member draft.');
  // Actual member-link revocation and expiry are covered by the PostgreSQL/API suite.
  await page.route('**/api/v1/member/support-history?*',route=>route.fulfill({status:403,json:{error:{code:'access_changed',message:'Fictional later denial.',correlationId:'member-history-denial'}}}));
  await history.getByRole('button',{name:'Load older requests'}).click();await expect(page.getByText('Your support history is no longer available for this account. Reload or sign in again.')).toBeVisible();await expect(history).toHaveCount(0);await expect(page.getByLabel('What changed, and what help do you need?',{exact:true})).toHaveCount(0);
 });
});
