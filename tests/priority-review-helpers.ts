import { expect, type Locator, type Page } from '@playwright/test';

export async function keyboardTo(page: Page, target: Locator) {
  for (let step = 0; step < 180; step += 1) {
    if (await target.evaluate(element => element === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}
async function activate(page: Page, target: Locator, keyboard: boolean) {
  if (keyboard) { await keyboardTo(page, target); await page.keyboard.press('Enter'); }
  else await target.click();
}
export async function reviewRole(page: Page, role: 'officer' | 'reviewer', keyboard = false) {
  if (!await page.getByLabel('Demo role').isVisible()) await activate(page, page.getByText('Demo tools', { exact: true }), keyboard);
  if (keyboard) { await keyboardTo(page, page.getByLabel('Demo role')); await page.keyboard.press(role === 'reviewer' ? 'r' : 'l'); }
  else await page.getByLabel('Demo role').selectOption(role);
  await expect(page.getByLabel('Demo role')).toHaveValue(role);
}
export async function reviewAction(page: Page, label: string, reason: string, keyboard = false) {
  const form = page.getByRole('form', { name: label, exact: true });
  const field = form.getByRole('textbox', { name: `${label} — reason`, exact: true });
  if (keyboard) { await keyboardTo(page, field); await page.keyboard.type(reason); }
  else await field.fill(reason);
  await activate(page, form.getByRole('button', { name: label, exact: true }), keyboard);
}
/** Continue after Ana's correction and permitted after-payday recommendation, using only real UI actions. */
export async function completeAnaReview(page: Page, keyboard = false) {
  await activate(page, page.getByRole('link', { name: 'Review summary', exact: true }), keyboard);
  await reviewAction(page, 'Confirm evidence currentness', 'Checked the dated sources with the modeled November period.', keyboard);
  await expect(page.getByText('Mara confirmed the evidence for the current modeled period.')).toBeVisible();
  await reviewAction(page, 'Save concern check', 'Confirmed the source discrepancy; current payslip now governs the corrected evidence.', keyboard);
  await expect(page.getByText('Checked: confirm', { exact: true })).toBeVisible();
  await reviewAction(page, 'Assign escalation to Luis Reyes', 'Verify that the permitted later date removes the earlier timing failure.', keyboard);
  await expect(page.getByRole('region', { name: 'Escalated review', exact: true }).getByText('Assigned to Luis Reyes', { exact: true })).toBeVisible();
  await reviewRole(page, 'reviewer', keyboard);
  await activate(page, page.getByRole('button', { name: 'Acknowledge notice for Ana Dela Cruz', exact: true }), keyboard);
  await expect(page.getByText('Acknowledged', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready for approval', exact: true })).toHaveCount(0);
  await reviewAction(page, 'Verify escalation resolution', 'Verified current sources and the permitted after-payday schedule: both fictional checks pass.', keyboard);
  await expect(page.getByRole('heading', { name: 'Ready for approval', exact: true })).toBeVisible();
  await activate(page, page.getByRole('link', { name: 'Decision', exact: true }), keyboard);
}
