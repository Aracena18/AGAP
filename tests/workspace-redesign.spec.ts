import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { signInStaff } from './staff-session';

test('workspace navigation stays usable on a phone and preserves private destinations', async ({ page, context }) => {
  // The original member is signed out by its own journey; use the independent UI session.
  const fixture = JSON.parse(await readFile('.platform-test/browser.json', 'utf8'));
  await context.addCookies([{ name: 'agap_member_session', value: fixture.uiAuditMember, url: `http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT ?? 5174}`, httpOnly: true, sameSite: 'Lax' }]);
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#/member');
  const nav = page.getByRole('navigation', { name: 'Member account' });
  for (const label of ['Home', 'Applications', 'My loans', 'Payment help']) {
    const link = nav.getByRole('link', { name: label, exact: true });
    await expect(link).toBeVisible();
    const bounds = await link.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(44);
    expect(bounds!.height).toBeGreaterThanOrEqual(44);
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
  }
  await nav.getByRole('link', { name: 'My loans', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/member\/loans$/);
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('main')).toContainText('No loans recorded');
  await nav.getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.getByRole('link', { name: /Apply for a loan/ })).toBeVisible();
});

test('phone application rows keep every financial field and review link within the card', async ({ page, context }) => {
  await signInStaff(context);
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto('/#/applications');
  const table = page.getByRole('table', { name: 'Fictional loan applications and review progress' });
  await expect(table).toBeVisible();
  const rows = table.locator('tbody tr');
  await expect(rows).toHaveCount(3);
  for (const row of await rows.all()) {
    for (const cell of await row.getByRole('cell').all()) {
      const bounds = await cell.boundingBox();
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    }
    for (const label of ['Purpose', 'Requested amount', 'Review status', 'Received']) await expect(row.locator(`[data-label="${label}"]`)).toBeVisible();
    await expect(row.getByRole('link', { name: /^Review / })).toBeVisible();
  }
  await rows.first().getByRole('link', { name: /^Review / }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/evidence$/);
  await expect(page.getByRole('navigation', { name: 'Application review' })).toBeVisible();
});

test('workspace styling does not leak into the public landing after navigation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  const appearance = () => page.locator('[data-agap-landing]').evaluate(el => {
    const style = getComputedStyle(el);
    return ['--canvas', '--primary', '--ink', '--button-radius'].map(name => style.getPropertyValue(name).trim());
  });
  const before = await appearance();
  await page.getByRole('link', { name: 'Member access', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'AGAP', exact: true })).toBeVisible();
  expect(await appearance()).toEqual(before);
  await expect(page.locator('[data-agap-workspace]')).toHaveCount(0);
});

test('staff navigation and table actions remain reachable at phone and zoom-equivalent widths', async ({ page, context }) => {
  await signInStaff(context);
  for (const width of [320, 683, 1366]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/#/staff/applications');
    const nav = page.getByRole('navigation', { name: 'Staff workspace' });
    await expect(nav).toHaveCount(1);
    for (const label of ['Members', 'Applications', 'Staff access', 'Support requests']) await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
    const review = page.getByRole('region', { name: 'Server application records' }).getByRole('link', { name: 'Review evidence', exact: true }).first();
    await review.focus();
    await expect(review).toBeFocused();
    await expect(review).toBeInViewport();
    const bounds = await review.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
