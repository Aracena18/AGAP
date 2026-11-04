import {mkdir,readFile} from 'node:fs/promises';
import {expect,test} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Staff history beyond 100 actions',()=>{
 test.describe.configure({mode:'serial',retries:0});
 let fixture:{officer:string;supportHistory:{requestId:string;otherRequestId:string}};
 test.beforeAll(async()=>{fixture=JSON.parse(await readFile('.platform-test/browser.json','utf8'));});
 test.beforeEach(async({context,page})=>{await context.addCookies([{name:'agap_session',value:fixture.officer,url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);await page.goto('/#/staff/support-requests');await page.getByRole('button',{name:`Open support request ${fixture.supportHistory.requestId}`,exact:true}).click();});
 test('loads 125 actions, preserves a draft through a failed page, and retries a lost successful response once',async({page})=>{
  const history=page.getByRole('region',{name:'Response history'});await expect(history.locator('article')).toHaveCount(25);
  await expect(history.getByText('Fictional historical response 125',{exact:true})).toBeVisible();
  const draft='Fictional new response after all 125 historical actions.';await page.getByLabel('Response shared with member',{exact:true}).fill(draft);await page.getByLabel('Internal staff action / note',{exact:true}).fill('Private browser pagination note.');
  let failed=false;await page.route(`**/api/v1/support-requests/${fixture.supportHistory.requestId}/actions?*`,async route=>{if(!failed){failed=true;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'unavailable',message:'Fictional page outage.',correlationId:'history-page'}})});}else await route.continue();});
  await history.getByRole('button',{name:'Load older responses'}).focus();await page.keyboard.press('Enter');await expect(history.getByRole('alert')).toContainText('Your draft is preserved');
  await history.getByRole('button',{name:'Retry older responses'}).click();await expect(history.locator('article')).toHaveCount(50);await expect(page.getByLabel('Response shared with member',{exact:true})).toHaveValue(draft);
  for(const count of [75,100,125]){await history.getByRole('button',{name:'Load older responses'}).click();await expect(history.locator('article')).toHaveCount(count);}
  await expect(history.getByText('All responses loaded.')).toBeVisible();await expect(history.getByRole('heading',{name:'Response history'})).toBeFocused();
  expect(new Set(await history.locator('article .small').allTextContents()).size).toBe(125);
  const keys:string[]=[];let lost=false;await page.route(`**/api/v1/support-requests/${fixture.supportHistory.requestId}/actions`,async route=>{
   if(route.request().method()==='POST'){keys.push(route.request().headers()['idempotency-key']);if(!lost){lost=true;expect((await route.fetch()).status()).toBe(201);await route.abort('failed');return;}}
   await route.continue();
  });
  await page.getByRole('button',{name:'Publish response',exact:true}).click();await expect(page.getByRole('alert')).toContainText('uncertain');await page.getByRole('button',{name:'Retry same response',exact:true}).click();
  await expect(history.getByText(draft,{exact:true})).toBeVisible();await expect(history.locator('article')).toHaveCount(25);expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
  const detail=await (await page.request.get(`/api/v1/support-requests/${fixture.supportHistory.requestId}/history`)).json();expect(detail.version).toBe(128);
  await mkdir('.platform-test/support-history-screenshots',{recursive:true});await history.getByRole('button',{name:'Load older responses'}).scrollIntoViewIfNeeded();await page.screenshot({path:'.platform-test/support-history-screenshots/history-desktop.png'});
  expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  await page.setViewportSize({width:320,height:800});await history.getByRole('button',{name:'Load older responses'}).scrollIntoViewIfNeeded();await page.screenshot({path:'.platform-test/support-history-screenshots/history-320.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
 });
 test('discards a delayed older page when another support request is opened',async({page})=>{
  const history=page.getByRole('region',{name:'Response history'});await expect(history.locator('article')).toHaveCount(25);
  let release!:()=>void,started!:()=>void;const gate=new Promise<void>(done=>release=done),ready=new Promise<void>(done=>started=done);
  await page.route(`**/api/v1/support-requests/${fixture.supportHistory.requestId}/actions?*`,async route=>{const response=await route.fetch();started();await gate;try{await route.fulfill({response});}catch{/* The old fetch was canceled when its private view unmounted. */}});
  await history.getByRole('button',{name:'Load older responses'}).click();await ready;
  await page.getByRole('button',{name:`Open support request ${fixture.supportHistory.otherRequestId}`,exact:true}).click();await expect(history.locator('article')).toHaveCount(1);release();
  await expect(history.getByText('Private history note 125',{exact:false})).toHaveCount(0);await expect(history.getByText('All responses loaded.')).toBeVisible();
 });
 test('clears loaded history and the response draft after a later page access denial',async({page})=>{
  const history=page.getByRole('region',{name:'Response history'});await expect(history.locator('article')).toHaveCount(25);
  await page.getByLabel('Response shared with member',{exact:true}).fill('Private unsent draft after access changes.');
  // Actual reassignment/revocation is covered by the PostgreSQL/API tests; this checks browser cleanup.
  await page.route(`**/api/v1/support-requests/${fixture.supportHistory.requestId}/actions?*`,route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'support_forbidden',message:'Fictional later denial.',correlationId:'history-denial'}})}));
  await history.getByRole('button',{name:'Load older responses'}).click();await expect(page.getByText('Support requires an assigned officer or branch administrator. Reload after your access is reviewed.')).toBeVisible();
  await expect(history).toHaveCount(0);await expect(page.getByLabel('Response shared with member',{exact:true})).toHaveCount(0);await expect(page.getByText('Private history note 125',{exact:false})).toHaveCount(0);
 });
});
