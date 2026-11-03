import { readFile } from 'node:fs/promises';
import { expect,test,type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function signIn(context:BrowserContext,role:'reconciliationAuditor'|'officer'='reconciliationAuditor'){
  const fixture=JSON.parse(await readFile('.platform-test/browser.json','utf8'));
  await context.addCookies([{name:'agap_session',value:fixture[role],url:`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`,httpOnly:true,sameSite:'Lax'}]);
}
test.describe('Actual principal reconciliation report journey',()=>{
  test.describe.configure({mode:'serial',retries:0});
  test('records one report across a lost successful response and reopens its preserved findings',async({page,context})=>{
    await signIn(context);const keys:string[]=[];let lost=false;
    await page.route('**/api/v1/reconciliations',async route=>{
      if(route.request().method()==='POST'){
        keys.push(route.request().headers()['idempotency-key']);
        if(!lost){lost=true;const response=await route.fetch();expect(response.status()).toBe(201);await route.abort('failed');return;}
      }
      await route.continue();
    });
    await page.goto('/#/staff/reconciliations');await expect(page.getByRole('heading',{name:'Reconciliation',exact:true})).toBeVisible();
    await page.getByLabel('From date',{exact:true}).fill('2026-11-01');await page.getByLabel('Through date',{exact:true}).fill('2026-11-03');
    await page.getByRole('button',{name:'Run reconciliation',exact:true}).click();
    await expect(page.getByRole('region',{name:'Run a principal check'}).getByRole('alert')).toContainText('uncertain');
    await expect(page.getByRole('alert')).toHaveCount(1);await expect(page.getByLabel('From date',{exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Retry same report',exact:true}).click();
    const result=page.getByRole('region',{name:'Saved reconciliation result'});
    await expect(result).toBeVisible();await expect(result).toContainText('Discrepancy');await expect(result).toContainText('2 event records');
    expect(keys).toHaveLength(2);expect(keys[0]).toBe(keys[1]);
    await page.getByLabel('Event status',{exact:true}).selectOption('discrepancy');await expect(page.getByRole('status').filter({hasText:'Showing 1 of 2'})).toBeVisible();
    await expect(page.getByRole('region',{name:'Reconciliation event findings'})).toContainText('Missing event');
    const history=await (await page.request.get('/api/v1/reconciliations')).json();expect(history.items).toHaveLength(1);
    const id=history.items[0].id;await page.reload();await page.getByRole('button',{name:`Open report ${id}`,exact:true}).click();
    await expect(page.getByRole('region',{name:'Saved reconciliation result'})).toContainText(id);
  });
  test('supports keyboard access, 320px reflow and automated accessibility',async({page,context})=>{
    await signIn(context);await page.setViewportSize({width:320,height:800});await page.goto('/#/staff/reconciliations');
    await page.getByRole('button',{name:/^Open report /}).first().click();
    const region=page.getByRole('region',{name:'Reconciliation event findings'});await expect(region).toBeVisible();await region.focus();await expect(region).toBeFocused();
    // Page overflow alone misses flex children squeezed into unreadable columns inside a clipped card.
    const metadata=page.getByRole('region',{name:'Saved reconciliation result'}).locator('dd');
    for(const value of await metadata.all())expect((await value.boundingBox())!.width).toBeGreaterThanOrEqual(200);
    expect((await metadata.last().boundingBox())!.height).toBeLessThanOrEqual(96);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true);
    expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);
  });
  test('rejects an oversized date range before sending a report command',async({page,context})=>{
    await signIn(context);await page.goto('/#/staff/reconciliations');let posts=0;
    page.on('request',request=>{if(request.method()==='POST'&&request.url().endsWith('/reconciliations'))posts++;});
    await page.getByLabel('From date',{exact:true}).fill('2026-11-01');await page.getByLabel('Through date',{exact:true}).fill('2026-12-02');
    await page.getByRole('button',{name:'Run reconciliation',exact:true}).click();
    await expect(page.getByRole('alert')).toContainText('up to 31 days');expect(posts).toBe(0);
  });
  test('hides cached report data when a later permission check denies access',async({page,context})=>{
    await signIn(context);await page.goto('/#/staff/reconciliations');await page.getByRole('button',{name:/^Open report /}).first().click();
    await expect(page.getByRole('region',{name:'Saved reconciliation result'})).toBeVisible();
    // API role/revocation enforcement is separately exercised against the actual database.
    await page.route('**/api/v1/reconciliations',route=>route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:{code:'reconciliation_forbidden',message:'Fictional access denial.',correlationId:'fictional-test-denial'}})}));
    await page.getByRole('button',{name:'Refresh history',exact:true}).click();
    await expect(page.getByText('Reconciliation requires an auditor with access to every organization branch.')).toBeVisible();
    await expect(page.getByRole('region',{name:'Saved reconciliation result'})).toHaveCount(0);
  });
  test('keeps ordinary staff out of report controls and enforces the same restriction at the API',async({page,context})=>{
    await signIn(context,'officer');await page.goto('/#/staff/reconciliations');
    await expect(page.getByText('Reconciliation requires an auditor with access to every organization branch.')).toBeVisible();
    await expect(page.getByRole('button',{name:'Run reconciliation',exact:true})).toHaveCount(0);
    expect((await page.request.get('/api/v1/reconciliations')).status()).toBe(403);
  });
});
