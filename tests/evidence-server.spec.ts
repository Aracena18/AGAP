import { expect,test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile,mkdir } from 'node:fs/promises';
import { signInStaff } from './staff-session';
const origin=`http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT??5174}`;
test('persists the actual member-to-staff fact and assessment journey, retries a lost save and reflows at 320px',async({page,context})=>{
 const fixture=JSON.parse(await readFile('.platform-test/browser.json','utf8')) as Record<string,string>;
 await signInStaff(context,'officer');await context.addCookies([{name:'agap_member_session',value:fixture.member,url:origin,httpOnly:true,sameSite:'Lax'}]);
 const session=await(await page.request.get('/api/v1/session')).json() as {csrfToken:string};
 const response=await page.request.post('/api/v1/applications',{headers:{Origin:origin,'X-CSRF-Token':session.csrfToken,'Idempotency-Key':crypto.randomUUID()},data:{memberId:fixture.memberId,purpose:'Fictional browser evidence assessment',requestedPrincipalCentavos:100000,requestedTermMonths:1,currency:'PHP'}});
 expect(response.status()).toBe(201);const record=await response.json() as {id:string};
 await page.goto(`/#/member/applications/${record.id}`);await expect(page.getByRole('heading',{name:'Evidence and financial information'})).toBeVisible();
 const captured:string[]=[];let loseResponse=true;
 await page.route('**/api/v1/member/applications/*/facts',async route=>{captured.push(route.request().headers()['idempotency-key']);if(loseResponse){loseResponse=false;await route.fetch();await route.abort('failed');}else await route.continue();});
 const facts = [
  ['opening', 'Opening spendable cash', '1000', '2026-01-01', 'one_time'],
  ['income', 'Confirmed net pay', '2000', '2026-01-15', 'monthly'],
  ['expense', 'One-time school expense', '500', '2026-01-20', 'one_time'],
  ['obligation', 'Payroll-deducted debt', '250', '2026-01-15', 'monthly'],
 ];
 for (const [category, label, amount, date, period] of facts) {
  await page.getByRole('button', { name: 'Add financial fact', exact: true }).click();
  await page.getByLabel('Label', { exact: true }).fill(label);
  await page.getByLabel('Category', { exact: true }).selectOption(category);
  await page.getByLabel('Amount unavailable', { exact: true }).uncheck();
  await page.getByLabel('Amount per cash date (PHP)', { exact: true }).fill(amount);
  const payrollNote = category === 'obligation' ? ' Already deducted from net pay.' : '';
  await page.getByLabel('Exact member statement', { exact: true }).fill(`Fictional statement: ${label}, PHP ${amount} on ${date}.${payrollNote}`);
  await page.getByLabel('Information effective date', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Confirmed coverage starts', { exact: true }).fill('2026-01-01');
  await page.getByLabel('Confirmed coverage ends', { exact: true }).fill('2026-01-31');
  await page.getByLabel('Cash dates, one per line').fill(date);
  await page.getByLabel('Amount period', { exact: true }).selectOption(period);
  await page.getByLabel('Amount basis', { exact: true }).selectOption(category === 'income' ? 'net' : 'not_applicable');
  await page.getByLabel('Already deducted from net payroll?').selectOption(category === 'obligation' ? 'yes' : 'no');
  await page.getByLabel('Confirmation or correction reason').fill('Fictional member confirmed exact dates, net basis and January coverage.');
  await page.getByRole('button', { name: 'Save fact', exact: true }).click();
  if (category === 'opening') {
   await expect(page.getByRole('alert')).toContainText('uncertain');
   await page.getByRole('button', { name: 'Retry same submission', exact: true }).click();
   expect(captured[0]).toBe(captured[1]);
  }
  await expect(page.getByRole('heading', { name: label, exact: true })).toBeVisible();
 }
 await page.reload();await expect(page.getByRole('heading',{name:'Confirmed net pay',exact:true})).toBeVisible();await page.setViewportSize({width:320,height:800});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await mkdir('docs/screenshots/evidence-workflow',{recursive:true});await page.screenshot({path:'docs/screenshots/evidence-workflow/member-320.png',fullPage:true});
 await page.goto(`/#/staff/applications/${record.id}/evidence`);await expect(page.getByRole('heading',{name:'Save an affordability assessment'})).toBeVisible();await page.getByLabel('Review starts',{exact:true}).fill('2026-01-01');await page.getByLabel('Review ends',{exact:true}).fill('2026-01-31');await page.getByLabel(/Fictional browser offer/).check();await page.getByRole('button',{name:'Calculate and save assessment'}).click();await expect(page.locator('p:visible').filter({hasText:'Jan 1, 2026 to Jan 31, 2026 · Checked results'})).toBeVisible();
 const saved=page.getByRole('heading',{name:'Saved assessment',exact:true}).locator('..').filter({visible:true});
 const results=saved.locator('dl');
 // PHP 2,000 net pay − 500 school cost − 550 − 550 = 400. The payroll debt is already in net pay.
 await expect(results).toContainText('Remaining across review horizon₱400');
 await expect(results).toContainText('Lowest dated balance₱450');
 await expect(results).toContainText('Closing balance₱1,400');
 await expect(results).toContainText('Full contractual repayments₱1,100');
 await saved.getByText('Daily balances and shortage dates',{exact:true}).click();
 await expect(saved.getByText('2026-01-10: ₱450',{exact:true})).toBeVisible();
 await expect(saved.getByText('2026-01-20: ₱1,950',{exact:true})).toBeVisible();
 await expect(saved.getByText('2026-01-25: ₱1,400',{exact:true})).toBeVisible();
 await saved.getByText('Daily balances and shortage dates',{exact:true}).click();
 await page.reload();await expect(page.locator('p:visible').filter({hasText:'Jan 1, 2026 to Jan 31, 2026 · Checked results'}).first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);expect((await new AxeBuilder({page}).analyze()).violations).toEqual([]);await page.screenshot({path:'docs/screenshots/evidence-workflow/staff-320.png',fullPage:true});await page.setViewportSize({width:1366,height:900});await page.screenshot({path:'docs/screenshots/evidence-workflow/staff-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'Correct One-time school expense',exact:true}).click();
 await page.getByLabel('Amount per cash date (PHP)',{exact:true}).fill('600');
 await page.getByLabel('Source',{exact:true}).selectOption('');
 await page.getByLabel('Exact member statement',{exact:true}).fill('Fictional correction: the school expense on January 20 was PHP 600.');
 await page.getByLabel('Confirmation or correction reason').fill('Member corrected the amount for the same one-time expense.');
 await page.getByRole('button',{name:'Save fact',exact:true}).click();
 await expect(saved.getByText('Inputs changed. This assessment requires renewed review; its recorded results are preserved.',{exact:true})).toBeVisible();

 const history=page.locator('details').filter({has:page.locator('summary',{hasText:'Assessment and verification history'})});
 await history.getByText('Assessment and verification history',{exact:true}).click();
 await expect(history.getByText('Inputs changed. This assessment requires renewed review; its recorded results are preserved.',{exact:true})).toBeVisible();
 await expect(history.locator('dl')).toContainText('Remaining across review horizon₱400');
});
