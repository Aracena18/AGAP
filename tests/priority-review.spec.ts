import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInStaff } from './staff-session';
import { completeAnaReview, reviewAction, reviewRole } from './priority-review-helpers';

test.beforeEach(async ({ context }) => signInStaff(context));

async function captureReview(page: Page, path: string) {
  await page.getByRole('heading', { level: 1 }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path, fullPage: true });
}

test('priority queue, parallel paths, Ana readiness, reload and material-change recheck', async ({ page }, testInfo) => {
  await page.goto('/#/applications');
  await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText('Ben Mendoza');
  const anaRow = page.getByRole('row').filter({ hasText: 'Ana Dela Cruz' });
  await expect(anaRow).toContainText('Needs clarification');
  await expect(anaRow).toContainText('Awaiting concern check');
  await captureReview(page, testInfo.outputPath('queue-desktop.png'));
  await page.getByRole('link', { name: 'Review Ana Dela Cruz', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review summary', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' }).click();
  await page.getByLabel('Supporting source', { exact: true }).selectOption('payslip');
  await page.getByLabel('Evidence status', { exact: true }).selectOption('document-supported');
  await page.getByLabel('Reason for correction').fill('Checked the current fictional payslip for this modeled period.');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await page.getByRole('navigation', { name: 'Application review', exact: true }).getByRole('link', { name: 'Compare options', exact: true }).click();
  await page.getByRole('radio', { name: /After-payday schedule/ }).check();
  await page.getByLabel('Recommendation reason').fill('Permitted date avoids the modeled timing shortage at unchanged full costs.');
  await page.getByRole('button', { name: 'Save recommendation' }).click();
  await completeAnaReview(page);
  await page.getByRole('link', { name: 'Review summary', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ready for approval', exact: true })).toBeVisible();
  await captureReview(page, testInfo.outputPath('ana-ready-desktop.png'));
  await page.getByText('Saved review history', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved review history' })).toContainText('In-app notice: acknowledged');
  await expect(page.getByRole('region', { name: 'Saved review history' })).toContainText('Reviewer action: resolve');
  await page.getByText('Saved review history', { exact: true }).click();
  for (const width of [1101, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    await captureReview(page, testInfo.outputPath(`ana-summary-${width}.png`));
  }
  await reviewRole(page, 'officer');
  await page.getByRole('link', { name: 'Evidence', exact: true }).click();
  await page.getByRole('button', { name: 'Correct Monthly take-home pay', exact: true }).click();
  await page.getByLabel('Amount (PHP)', { exact: true }).fill('23000');
  await page.getByLabel('Reason for correction').fill('Fictional updated circumstances require renewed review.');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await page.getByRole('link', { name: 'Review summary', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Ready for approval', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Readiness and pending actions' })).toContainText('Awaiting concern check');
  await expect(page.getByRole('region', { name: 'Readiness and pending actions' })).toContainText('Escalated review');
  await page.getByText('Saved review history', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Saved review history' })).toContainText('Earlier basis');
  await captureReview(page, testInfo.outputPath('ana-renewed-review-320.png'));
});

test('Ben notice receipt cannot resolve material checks; investigated decline remains possible', async ({ page }, testInfo) => {
  await page.goto('/#/applications/AG-002/summary');
  await reviewAction(page, 'Confirm evidence currentness', 'Recorded evidence applies to the modeled November period.');
  await page.getByRole('navigation', { name: 'Application review', exact: true }).getByRole('link', { name: 'Compare options', exact: true }).click();
  await page.getByLabel('Recommendation reason').fill('Refer the recorded shortfall for separate human consideration.');
  await page.getByRole('button', { name: 'Save recommendation' }).click();
  await page.getByRole('link', { name: 'Review summary', exact: true }).click();
  await reviewAction(page, 'Assign escalation to Luis Reyes', 'Verify monthly and timing failures against sources.');
  await reviewRole(page, 'reviewer');
  await page.setViewportSize({ width: 320, height: 900 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await captureReview(page, testInfo.outputPath('ben-notice-320.png'));
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.getByRole('button', { name: 'Acknowledge notice for Ben Mendoza', exact: true }).click();
  await reviewAction(page, 'Verify escalation resolution', 'Receipt acknowledged; attempting closure before correction.');
  await expect(page.getByRole('alert')).toContainText('passing active-offer checks');
  await expect(page.getByRole('form', { name: 'Verify escalation resolution', exact: true }).getByRole('alert').locator('..')).toBeFocused();
  await reviewAction(page, 'Save investigation', 'Checked sources and dated movements: the monthly shortfall remains after moving the date.');
  await captureReview(page, testInfo.outputPath('ben-investigated-desktop.png'));
  await page.getByRole('link', { name: 'Decision', exact: true }).click();
  await page.getByLabel('Decision rationale', { exact: true }).fill('Verified the material shortfall against the recorded evidence.');
  await page.getByLabel(/I reviewed the template explanation/).check();
  await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Saved member brief' })).toHaveCount(0);
  await expect(page.getByText(/exception reasons cannot bypass this demo check/i).first()).toBeVisible();
  await page.getByRole('radio', { name: 'Decline', exact: true }).check();
  await page.getByLabel('Reason for departing from the officer recommendation').fill('Declining after reviewing the supported remaining shortfall.');
  await page.getByLabel(/I reviewed the template explanation/).check();
  await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('application declined');
  await page.reload();
  await expect(page.getByRole('article', { name: 'Saved member brief' })).toContainText('−₱4,000');
  await page.goto('/#/applications');
  await expect(page.getByRole('row').filter({ hasText: 'Ben Mendoza' })).toHaveCount(0);
  await page.getByLabel('Review status', { exact: true }).selectOption('all');
  await expect(page.getByRole('row').filter({ hasText: 'Ben Mendoza' })).toContainText('Decision recorded');
});

test('Cora summary preserves unavailable financial values and accessible mobile clarification', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/#/applications/AG-003/summary');
  await expect(page.getByRole('region', { name: 'Consolidated affordability and costs' })).toContainText('Affordability figures are unavailable');
  await expect(page.getByRole('region', { name: 'Consolidated affordability and costs' }).getByText('₱0', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await captureReview(page, testInfo.outputPath('cora-clarification-320.png'));
});
