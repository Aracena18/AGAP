import { test, expect, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInStaff } from './staff-session';
test.beforeEach(async({context})=>{await signInStaff(context);});
async function openDemoTools(page:Page){if(!await page.getByLabel('Demo role').isVisible())await page.getByText('Demo tools',{exact:true}).click();}
async function setDemoRole(page:Page,role:'officer'|'reviewer'){await openDemoTools(page);await page.getByLabel('Demo role').selectOption(role);}

async function resolveAna(page: Page) {
  await page.goto('/#/applications/AG-001/evidence');
  await page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' }).click();
  await page.getByLabel('Supporting source', { exact: true }).selectOption('payslip');
  await page.getByLabel('Evidence status', { exact: true }).selectOption('document-supported');
  await expect(page.getByLabel('Amount (PHP)', { exact: true })).toHaveValue('24000');
  await page.getByLabel('Reason for correction').fill('Current payslip checked with the member; prior worksheet is outdated.');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correction saved');
}

async function tabTo(page: Page, target: Locator) {
  for (let step = 0; step < 100; step += 1) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

test('the complete Ana review can be performed with the keyboard', async ({ page }) => {
  await page.goto('/#/applications/AG-001/evidence');
  const resolve = page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' });
  await resolve.waitFor();
  await tabTo(page, resolve); await page.keyboard.press('Enter');
  const source = page.getByLabel('Supporting source', { exact: true });
  // Native select typeahead works across Chromium platforms without opening the OS picker.
  await tabTo(page, source); await page.keyboard.press('c'); await page.keyboard.press('u');
  await expect(source).toHaveValue('payslip');
  const evidenceStatus = page.getByLabel('Evidence status', { exact: true });
  await tabTo(page, evidenceStatus); await page.keyboard.press('d');
  await expect(evidenceStatus).toHaveValue('document-supported');
  await tabTo(page, page.getByLabel('Reason for correction')); await page.keyboard.type('Current payslip confirmed with the member.');
  await tabTo(page, page.getByRole('button', { name: 'Save correction', exact: true })); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Correction saved');
  await tabTo(page, page.getByRole('link', { name: 'Compare options', exact: true })); await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Repayment comparison', exact: true }).waitFor();
  await tabTo(page, page.getByRole('radio', { name: /Requested schedule/ })); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('radio', { name: /After-payday schedule/ })).toBeChecked();
  await tabTo(page, page.getByLabel('Recommendation reason')); await page.keyboard.type('Date follows payday and the cost remains the same.');
  await tabTo(page, page.getByRole('button', { name: 'Save recommendation' })); await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toContainText('Recommendation saved');
  await tabTo(page, page.getByRole('link', { name: /Continue to decision/ })); await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: 'Decision and explanation' }).waitFor();
  await tabTo(page,page.getByText('Demo tools',{exact:true}));await page.keyboard.press('Enter');
  const demoRole = page.getByLabel('Demo role');
  await tabTo(page, demoRole); await page.keyboard.press('r');
  await expect(demoRole).toHaveValue('reviewer');
  await tabTo(page, page.getByLabel('Decision rationale', { exact: true })); await page.keyboard.type('Checked evidence, full costs and household cash timing.');
  await tabTo(page, page.getByText('Read the explanation to be recorded', { exact: true })); await page.keyboard.press('Enter');
  await tabTo(page, page.getByLabel(/I reviewed the template explanation/)); await page.keyboard.press('Space');
  await tabTo(page, page.getByRole('button', { name: 'Record decision', exact: true })); await page.keyboard.press('Enter');
  await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('application approved');
});

test('Ana: correct evidence, compare timing, hand off and preserve a printed decision through edits', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await resolveAna(page);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Compare options', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('₱2,000');
  await expect(page.getByRole('region', { name: 'Lowest dated cash balance', exact: true })).toContainText('−₱2,000');
  await page.getByRole('radio', { name: /After-payday schedule/ }).check();
  await expect(page.getByRole('region', { name: 'Lowest dated cash balance', exact: true })).toContainText('₱1,000');
  await expect(page.getByRole('table', { name: /Full offer costs/ })).toContainText('₱36,000');
  await page.getByRole('button', { name: 'View dated movements' }).click();
  await expect(page).toHaveURL(/AG-001\/comparison$/);
  await page.getByRole('button', { name: 'Fictional offer schedule' }).click();
  await expect(page).toHaveURL(/AG-001\/comparison$/);
  await page.getByLabel('Recommendation reason').fill('The after-payday schedule keeps the same full cost and avoids the modeled timing gap.');
  await page.getByRole('button', { name: 'Save recommendation' }).click();
  await expect(page.getByRole('status')).toContainText('Recommendation saved');
  await page.getByRole('link', { name: /Continue to decision/ }).click();
  await setDemoRole(page,'reviewer');
  await page.getByLabel('Decision rationale', { exact: true }).fill('Reviewed current payslip, essentials, full costs and remaining uncertainty with the member.');
  await page.getByLabel('Review date', { exact: true }).fill('2026-12-01');
  await page.getByText('Read the explanation to be recorded', { exact: true }).click();
  await page.getByLabel(/I reviewed the template explanation/).check();
  await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  const brief = page.getByRole('article', { name: 'Saved member brief' });
  await expect(brief).toContainText('₱36,000');
  await expect(brief).toContainText('₱6,000');
  await expect(brief).toContainText('monthly remaining money is ₱2,000');
  await expect(brief).toContainText('Current payslip');
  await expect(brief).toContainText('Dec 1, 2026');
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(brief).toBeVisible();
  await page.pdf({ path: testInfo.outputPath('ana-member-brief.pdf'), format: 'A4', printBackground: true });
  await page.emulateMedia({ media: 'screen' });
  await page.reload();
  await expect(brief).toContainText('₱36,000');
  await setDemoRole(page,'officer');
  await page.getByRole('link', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Correct Monthly take-home pay', exact: true }).click();
  await page.getByLabel('Amount (PHP)', { exact: true }).fill('23000');
  await page.getByLabel('Reason for correction').fill('Fictional updated circumstances reported for renewed review.');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.getByText('Review again', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Decision', exact: true }).click();
  await expect(brief).toContainText('Historical decision');
  await expect(brief).toContainText('monthly remaining money is ₱2,000');
  expect(errors).toEqual([]);
});

test('Ben retains the monthly shortfall after a date change; Cora can be returned without invented figures', async ({ page }) => {
  await page.goto('/#/applications/AG-002/comparison');
  await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('−₱4,000');
  await page.getByRole('radio', { name: /After-payday schedule/ }).check();
  await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('−₱4,000');
  await page.getByRole('link', { name: 'Decision', exact: true }).click();
  await setDemoRole(page,'reviewer');
  await page.getByLabel('Clarification needed and next step').fill('Discuss the monthly shortfall and clarify household circumstances.');
  await page.getByLabel(/I reviewed the template explanation/).check();
  await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('−₱4,000');
  await page.goto('/#/applications/AG-003/comparison');
  await expect(page.getByRole('heading', { name: 'Evidence needs clarification' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toHaveCount(0);
  await page.getByRole('link', { name: 'Decision', exact: true }).click();
  await setDemoRole(page,'reviewer');
  await page.getByLabel('Clarification needed and next step').fill('Confirm take-home income with a dated member statement or document.');
  await page.getByLabel(/I reviewed the template explanation/).check();
  await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('returned for clarification');
});

test('source tracing, keyboard entry and reset work with hash routing', async ({ page }) => {
  await resolveAna(page);
  await page.getByRole('link', { name: 'Compare options', exact: true }).click();
  await page.getByRole('button', { name: 'View dated movements' }).click();
  await page.getByRole('link', { name: 'Current payslip', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Source details' })).toContainText('Current payslip');
  await page.reload();
  await expect(page.getByRole('complementary', { name: 'Source details' })).toBeFocused();
  await page.goto('/#/applications');
  await page.getByRole('heading', { name: 'Loan applications' }).waitFor();
  await tabTo(page, page.getByRole('link', { name: 'Skip to main content' }));
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page).toHaveURL(/\/applications$/);
  await page.goto('/#/applications/AG-001/evidence');
  await openDemoTools(page);await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Reset this demo?' });
  await expect(dialog.getByRole('button', { name: 'Keep changes' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await openDemoTools(page);await page.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await dialog.getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' })).toBeVisible();
});

test('incompatible storage is preserved until explicit reset', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('agap.demo.v1', '{incompatible'));
  await page.goto('/#/applications');
  await expect(page.getByRole('status')).toContainText('preserved');
  expect(await page.evaluate(() => localStorage.getItem('agap.demo.v1'))).toBe('{incompatible');
  await openDemoTools(page);await page.getByRole('button', { name: 'Reset demo', exact: true }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reset demo', exact: true }).click();
  await expect(page.getByRole('status')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('agap.demo.v1')!).schemaVersion)).toBe(1);
});

test('core screens pass automated accessibility checks and reflow at 320 CSS pixels', async ({ page }) => {
  await resolveAna(page);
  for (const path of ['/applications', '/applications/AG-001/evidence', '/applications/AG-001/comparison', '/applications/AG-001/decision']) {
    await page.goto(`/#${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations, `${path}: ${JSON.stringify(results.violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => node.target) })))}`).toEqual([]);
    await page.setViewportSize({ width: 320, height: 780 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), path).toBe(true);
    await page.setViewportSize({ width: 1366, height: 768 });
  }
  await setDemoRole(page,'reviewer');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
});
