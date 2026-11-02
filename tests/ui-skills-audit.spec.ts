import { mkdir, readFile } from 'node:fs/promises';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureId } from './member-domain-fixture';

async function signInMember(context: BrowserContext) {
  const fixture = JSON.parse(await readFile('.platform-test/browser.json', 'utf8')) as { uiAuditMember: string };
  await context.addCookies([{ name: 'agap_member_session', value: fixture.uiAuditMember, url: `http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT ?? 5174}`, httpOnly: true, sameSite: 'Lax' }]);
}

async function capture(page: Page, name: string) {
  const phase = process.env.AGAP_SKILLS_SCREENSHOTS;
  if (!phase) return;
  await mkdir('docs/screenshots/ui-skills-audit', { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; window.scrollTo(0, 0); });
  await page.screenshot({ path: `docs/screenshots/ui-skills-audit/${phase}-${name}.png`, fullPage: true });
}

test('cancelled sign-out restores account focus and preserves the draft', async ({ page, context }) => {
  await signInMember(context);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#/member/apply');
  await page.getByLabel('What is the loan for?').fill('Fictional unsaved application');
  const account = page.getByRole('button', { name: /Account menu for/ });
  await account.focus();
  await page.keyboard.press('ArrowDown');
  await capture(page, 'account-menu-320');
  const warning = page.waitForEvent('dialog');
  const activate = page.keyboard.press('Enter');
  await (await warning).dismiss();
  await activate;
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(account).toBeFocused();
  await expect(page.getByLabel('What is the loan for?')).toHaveValue('Fictional unsaved application');
  await expect(page.getByRole('heading', { name: 'Apply for a loan', exact: true })).toBeVisible();
  await capture(page, 'cancelled-signout-320');
});

for (const width of [320, 1366]) test(`payment-help review restores focus and renews consent at ${width}px`, async ({ page, context }) => {
  await signInMember(context);
  const writes: string[] = [];
  page.on('request', request => { if (request.method() === 'POST' && request.url().endsWith('/member/support-requests')) writes.push(request.url()); });
  await page.setViewportSize({ width, height: 800 });
  await page.goto('/#/member/help');
  const message = page.getByLabel('What changed, and what help do you need?');
  await message.fill('Fictional request for a private conversation.');
  await page.getByLabel('Preferred response').selectOption('phone');
  await page.getByRole('button', { name: 'Review request', exact: true }).click();
  await page.getByLabel('I agree to send this message').check();
  await page.getByRole('button', { name: 'Edit message', exact: true }).click();
  await expect(message).toBeFocused();
  await expect(page.getByLabel('Preferred response')).toHaveValue('phone');
  await message.fill('Fictional revised request: please reply in my account.');
  await page.getByLabel('Preferred response').selectOption('portal');
  await page.getByRole('button', { name: 'Review request', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review what will be shared' })).toBeFocused();
  await expect(page.getByLabel('I agree to send this message')).not.toBeChecked();
  await expect(page.getByText('Fictional revised request: please reply in my account.', { exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await capture(page, `help-review-${width}`);
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(page.getByLabel('I agree to send this message')).toBeFocused();
  expect(writes).toEqual([]);
});

test('long member messages reflow within the phone viewport and remain readable', async ({ page, context }) => {
  await signInMember(context);
  await page.route('**/api/v1/member/support-requests', route => route.fulfill({ json: { state: 'available', data: [{
    id: fixtureId(91), submittedAt: '2026-11-03T00:00:00Z', status: 'reviewed',
    message: `SIMULATED long reference: ${'REFERENCE_'.repeat(30)}`,
    response: 'SIMULATED: staff will contact you through your account.',
  }] } }));
  for (const width of [320, 1366]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/member/help');
    await expect(page.getByText('SIMULATED: staff will contact you through your account.', { exact: true })).toBeVisible();
    const history = page.getByRole('heading', { name: 'My requests', exact: true }).locator('..');
    expect(await history.evaluate(section => {
      const bounds = section.getBoundingClientRect();
      return [...section.querySelectorAll('article, article p, article div')].every(element => {
        const child = element.getBoundingClientRect();
        return child.left >= bounds.left && child.right <= bounds.right;
      });
    })).toBe(true);
    await capture(page, `help-history-${width}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  }
});
