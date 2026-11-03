import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { signInStaff } from './staff-session';

for (const [path, heading] of [['/applications/ana/evidence#source-payslip', 'Sign in to review'], ['/staff/applications', 'Sign in to your workspace']]) {
  test(`session outage recovers in place and retains the sign-in destination: ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 1263, height: 900 });
    let attempts = 0;
    let available = false;
    await page.route('**/api/v1/session', async route => {
      attempts++;
      if (!available) await route.fulfill({ status: 502, contentType: 'text/plain', body: 'Bad gateway' });
      else await route.continue();
    });
    await page.goto(`/#${path}`);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Sign-in is temporarily unavailable');
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveCount(0);
    const documents = () => page.evaluate(() => performance.getEntriesByType('navigation').map(entry => entry.startTime));
    const before = await documents();
    const retry = page.getByRole('button', { name: 'Try again', exact: true });
    await retry.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(retry).toBeEnabled();
    await expect(retry).toBeFocused();
    available = true;
    await retry.click();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute('href', `/api/v1/auth/login?${new URLSearchParams({ returnTo: path })}`);
    expect(await documents()).toEqual(before);
    expect(attempts).toBeGreaterThanOrEqual(3);
    if (process.env.AGAP_SIGNIN_SCREENSHOTS && path.startsWith('/applications')) await page.screenshot({ path: 'docs/screenshots/signin-recovery/recovered-review.png', fullPage: true });
  });
}

test('a recovered existing session opens the requested private workspace', async ({ page, context }) => {
  await signInStaff(context);
  let available = false;
  await page.route('**/api/v1/session', async route => {
    if (!available) await route.abort('failed');
    else await route.continue();
  });
  await page.goto('/#/applications');
  await expect(page.getByRole('alert')).toContainText('Sign-in is temporarily unavailable');
  await expect(page.getByRole('table')).toHaveCount(0);
  available = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('table', { name: 'Fictional loan applications and review progress' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('outage recovery stays readable and accessible at phone, tablet and desktop sizes', async ({ page }) => {
  await page.route('**/api/v1/session', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
  await page.goto('/#/applications');
  const alert = page.getByRole('alert');
  const retry = page.getByRole('button', { name: 'Try again' });
  for (const width of [320, 683, 1263]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(alert).toBeVisible();
    await retry.focus();
    await expect(retry).toBeInViewport();
    const alertBounds = (await alert.boundingBox())!;
    const retryBounds = (await retry.boundingBox())!;
    expect(retryBounds.y).toBeGreaterThanOrEqual(alertBounds.y + alertBounds.height + 16);
    expect(retryBounds.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (process.env.AGAP_SIGNIN_SCREENSHOTS) await page.screenshot({ path: `docs/screenshots/signin-recovery/unavailable-${width}.png`, fullPage: true });
  }
});
