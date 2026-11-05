import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { fixtureId } from './member-domain-fixture';

test.beforeEach(async ({ context }) => {
  const fixture = JSON.parse(await readFile('.platform-test/browser.json', 'utf8'));
  await context.addCookies([{ name: 'agap_member_session', value: fixture.uiAuditMember,
    url: `http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT ?? 5174}`, httpOnly: true, sameSite: 'Lax' }]);
});

test('intake guidance follows saved server state and preserves requested centavos', async ({ page }) => {
  const id = fixtureId(701);
  let status = 'draft';
  await page.route(`**/api/v1/member/applications/${id}`, route => route.fulfill({ json: {
    id, purpose: 'Fictional school expenses', requestedPrincipalCentavos: 150025, requestedTermMonths: 6,
    currency: 'PHP', status, version: 1, createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z',
  } }));
  await page.route('**/api/v1/member/applications/*/workflow', route => route.fulfill({ status: 501,
    json: { error: { code: 'module_not_available', message: 'Fictional legacy screen', correlationId: 'fictional' } } }));
  for (const endpoint of ['evidence', 'options', 'decision']) await page.route(`**/api/v1/member/applications/*/${endpoint}`,
    route => route.fulfill({ json: { state: 'unavailable', message: 'Unavailable in this fictional rendering fixture.' } }));
  const current = page.getByRole('list', { name: 'Application steps' }).locator('[aria-current="step"]');
  await page.goto(`/#/member/applications/${id}/edit`);
  await expect(current).toHaveText('1Details');
  await expect(page.getByLabel('Requested amount (PHP)')).toHaveValue('1500.25');
  await page.goto(`/#/member/applications/${id}`);
  await expect(current).toHaveText('2Review');
  await expect(page.getByText('₱1,500.25', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit application', exact: true })).toBeVisible();
  status = 'submitted';
  await page.reload();
  await expect(current).toHaveText('3Sent');
  await expect(page.getByText('Submitted for review', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit application', exact: true })).toHaveCount(0);
});

test('collapsed optional help details stay in the sharing preview and edit requires renewed consent', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto('/#/member/help');
  await expect(page.getByLabel('Can you currently meet essential expenses?')).toBeHidden();
  await page.getByLabel('What changed, and what help do you need?').fill('FICTIONAL: I would like a conversation.');
  const details = page.getByText('Add a loan or check-in (optional)', { exact: true });
  await details.focus();
  await page.keyboard.press('Enter');
  await page.getByLabel('Can you currently meet essential expenses?').selectOption('no');
  await details.click();
  await page.getByRole('button', { name: 'Review request', exact: true }).click();
  await expect(page.getByText('Can you currently meet essential expenses? No', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Review what will be shared' })).toBeFocused();
  await page.getByLabel('I agree to send this message').check();
  await page.getByRole('button', { name: 'Edit message' }).click();
  await expect(page.getByLabel('What changed, and what help do you need?')).toBeFocused();
  await expect(page.getByLabel('What changed, and what help do you need?')).toHaveValue('FICTIONAL: I would like a conversation.');
  await page.getByRole('button', { name: 'Review request', exact: true }).click();
  await expect(page.getByLabel('I agree to send this message')).not.toBeChecked();
});
