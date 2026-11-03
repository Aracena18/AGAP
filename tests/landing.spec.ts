import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing is public, does not request sessions, and leaves private destinations guarded', async ({ page }) => {
  const sessions: string[] = [];
  page.on('request', request => { if (/\/api\/v1\/(session|member\/me)/.test(request.url())) sessions.push(request.url()); });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'AGAP', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install AGAP', exact: true }).first()).toBeInViewport();
  expect(sessions).toEqual([]);
  await page.getByRole('link', { name: 'Open AGAP', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sign in to review' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sign in/ }).first()).toHaveAttribute('href', /returnTo=%2Fapplications/);
  await page.goto('/#/member');
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  await page.goto('/#/staff');
  await expect(page.getByRole('heading', { name: 'Sign in to your workspace' })).toBeVisible();
});

test('query links preserve hash routing, focus headings, and support Back/Forward', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(page).toHaveURL(/#\/\?section=demo$/);
  await expect(page.getByRole('heading', { name: 'See AGAP in action.' })).toBeFocused();
  await page.getByRole('link', { name: 'How it works' }).click();
  await expect(page.getByRole('heading', { name: /The member’s everyday life/ })).toBeFocused();
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'See AGAP in action.' })).toBeFocused();
  await page.goForward();
  await expect(page.getByRole('heading', { name: /The member’s everyday life/ })).toBeFocused();
  await page.getByRole('link', { name: 'Meet Gabay' }).click();
  await expect(page.getByRole('heading', { name: 'Meet Gabay.' })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Meet Gabay.' })).toBeInViewport();
  await page.mouse.wheel(0, 600);
  await page.getByRole('link', { name: 'Meet Gabay' }).click();
  await expect(page.getByRole('heading', { name: 'Meet Gabay.' })).toBeInViewport();
  await page.getByRole('link', { name: 'AGAP home', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Install AGAP', exact: true }).first()).toBeInViewport();
});

test('screenshot tabs support keyboard selection and all real images load', async ({ page }) => {
  await page.goto('/#/?section=demo');
  const evidence = page.getByRole('tab', { name: 'Evidence', exact: true });
  await evidence.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Cash flow', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toContainText('₱2,000');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Decision', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(evidence).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByRole('tab', { name: 'Decision', exact: true })).toBeFocused();
  for (const name of ['Evidence', 'Cash flow', 'Options', 'Decision']) {
    await page.getByRole('tab', { name, exact: true }).click();
    const image = page.getByRole('tabpanel').getByRole('img');
    await expect(image).toBeVisible();
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 1366)).toBe(true);
  }
});

test('install fallback and FAQs are keyboard accessible; closing restores focus', async ({ page }) => {
  await page.goto('/#/');
  const install = page.getByRole('button', { name: 'Install AGAP', exact: true }).first();
  await install.click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('internet connection');
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeFocused();
  await expect(dialog).toContainText('browser’s install menu');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(install).toBeFocused();
  await page.getByText('Who makes lending decisions?', { exact: true }).click();
  await expect(page.getByText(/Authorized people make lending decisions/)).toBeVisible();
  await page.getByText('Who makes lending decisions?', { exact: true }).click();
  await expect(page.getByText(/Authorized people make lending decisions/)).toBeHidden();
});

for (const outcome of ['dismissed', 'accepted', 'error'] as const) {
  test(`native install ${outcome} remains honest and does not repeat a used prompt`, async ({ page }) => {
    await page.goto('/#/');
    await page.getByRole('button', { name: 'Install AGAP', exact: true }).first().click();
    await page.evaluate(value => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, { prompt: () => value === 'error' ? Promise.reject(new Error('Unavailable')) : Promise.resolve(), userChoice: Promise.resolve({ outcome: value }) });
      window.dispatchEvent(event);
    }, outcome);
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Install AGAP', exact: true }).click();
    await expect(dialog.getByRole('status')).toContainText(outcome === 'dismissed' ? 'was dismissed' : outcome === 'accepted' ? 'accepted the installation request' : 'could not open');
    await expect(dialog.getByRole('button', { name: 'Install AGAP', exact: true })).toHaveCount(0);
    await expect(dialog).toContainText('Use your browser’s install menu');
  });
}

test('installed mode is acknowledged only after the browser reports it', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).first().click();
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(page.getByRole('dialog')).toContainText('AGAP is installed');
  await expect(page.getByRole('dialog').getByRole('link', { name: 'Open review demo' })).toBeVisible();
});

test('pending installation locks the native action until the browser choice resolves', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).first().click();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    const userChoice = new Promise(resolve => window.addEventListener('agap-test-choice', () => resolve({ outcome: 'accepted' }), { once: true }));
    Object.assign(event, { prompt: () => Promise.resolve(), userChoice });
    window.dispatchEvent(event);
  });
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  await expect(dialog.getByRole('button', { name: 'Opening…', exact: true })).toBeDisabled();
  await expect(dialog.getByRole('status')).toContainText('Waiting for your choice');
  await page.evaluate(() => window.dispatchEvent(new Event('agap-test-choice')));
  await expect(dialog.getByRole('status')).toContainText('accepted the installation request');
  await expect(dialog.getByRole('heading', { name: 'AGAP is installed' })).toHaveCount(0);
});

test('iPhone installation gives the Safari home-screen instructions', async ({ browser }) => {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/#/');
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toContainText('Add to Home Screen');
  await page.keyboard.press('Escape');
  await context.close();
});

test('manifest and install icons resolve without a service worker', async ({ page, request }) => {
  const response = await request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.start_url).toBe('./#/');
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
  await page.goto('/#/');
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(items => items.length))).toBe(0);
});

test('both themes, static layouts, install dialog, and tabs pass accessibility and reflow checks', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [1366, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/#/');
      await expect(page.getByRole('heading', { name: 'Meet Gabay.' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
    }
    await page.getByRole('button', { name: 'Install AGAP', exact: true }).first().click();
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.keyboard.press('Escape');
  }
});

test('missing screenshot offers a real recovery destination', async ({ page }) => {
  await page.route('**/landing/evidence.webp', route => route.abort());
  await page.goto('/#/?section=demo');
  await expect(page.getByRole('tabpanel')).toContainText('The screenshot could not load.');
  await expect(page.getByRole('tabpanel').getByRole('link', { name: 'Open review demo' })).toHaveAttribute('href', '#/applications');
});
