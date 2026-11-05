import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('landing is public, does not request sessions, and leaves private destinations guarded', async ({ page }) => {
  const sessions: string[] = [];
  page.on('request', request => { if (/\/api\/v1\/(session|member\/me)/.test(request.url())) sessions.push(request.url()); });
  await page.setViewportSize({ width: 1263, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'AGAP', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install AGAP', exact: true }).first()).toBeInViewport();
  if (process.env.AGAP_CAPTURE_WHITE) {
    await page.evaluate(() => document.fonts.ready);
    await page.locator('img').first().evaluate((img: HTMLImageElement) => img.decode());
    await page.screenshot({ path: 'docs/screenshots/landing/white-hero-1263.png' });
  }
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

test('hero keeps restored install focus when its lazy animation finishes after dialog close', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/RevealMotion.tsx*', async route => { await gate; await route.continue(); });
  await page.goto('/#/', { waitUntil: 'domcontentloaded' });
  const install = page.locator('#install-hero');
  await install.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(install).toBeFocused();
  release();
  await expect(page.locator('[aria-label="Explore AGAP features"]')).toHaveCount(1);
  await expect(install).toBeFocused();
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
  expect(manifest.start_url).toBe('./#/member');
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) expect((await request.get(`/${icon.src}`)).ok()).toBe(true);
  await page.goto('/#/');
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(items => items.length))).toBe(0);
});

test('white landing under either system preference preserves accessible layouts and dialogs', async ({ page }) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    for (const width of [1263, 1366, 390, 320]) {
      await page.setViewportSize({ width, height: width === 1263 ? 900 : 844 });
      await page.goto('/#/');
      await expect(page.getByRole('heading', { name: 'Meet Gabay.' })).toBeVisible();
      await expect(page.locator('[data-agap-landing]')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
      if (process.env.AGAP_CAPTURE_WHITE) await page.screenshot({ path: `docs/screenshots/landing/white-${colorScheme}-${width}.png`, fullPage: true });
      if (process.env.AGAP_CAPTURE_STORY && colorScheme === 'light' && (width === 390 || width === 320)) await page.screenshot({ path: `docs/screenshots/landing/story-static-${width}.png`, fullPage: true });
      if (process.env.AGAP_CAPTURE_FAN && colorScheme === 'light' && (width === 390 || width === 320)) await page.screenshot({ path: `docs/screenshots/landing/fan-static-${width}.png`, fullPage: true });
      if (process.env.AGAP_CAPTURE_SCROLL_FAN && colorScheme === 'light' && (width === 390 || width === 320)) await page.screenshot({ path: `docs/screenshots/landing/scroll-fan-static-${width}.png`, fullPage: true });
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

for (const viewport of [{ width: 1366, height: 768 }, { width: 1440, height: 900 }]) {
  test(`Gabay turns through one feature at a time and reverses at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/#/');
    const scene = page.getByRole('region', { name: 'Introducing AGAP and Gabay' });
    const mascot = () => scene.getByRole('img').locator('..');
    const scale = () => mascot().evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
    await expect.poll(scale).toBeCloseTo(3.2, 2);
    const install = page.getByRole('button', { name: 'Install AGAP', exact: true }).first();
    await expect(install).toBeInViewport();
    if (process.env.AGAP_CAPTURE_STORY) await page.screenshot({ path: `docs/screenshots/landing/story-start-${viewport.width}.png` });
    await scene.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + scrollY + (element.getBoundingClientRect().height - innerHeight) * .2, behavior: 'instant' }));
    await expect(scene.locator('ol')).toHaveAttribute('inert', '');
    await expect(scene.getByRole('list', { name: 'Explore AGAP features' })).toHaveCount(0);
    await page.getByRole('link', { name: 'Meet Gabay', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Meet Gabay.' })).toBeFocused();
    await expect.poll(scale).toBeCloseTo(1.08, 2);
    await expect(scene.locator('img[data-angle]')).toHaveCount(7);
    const names = ['Trace the evidence', 'See cash-flow timing', 'Compare full costs', 'Keep decisions human'];
    const angles = [0, 90, 180, 360];
    for (let index = 0; index < names.length; index++) {
      const button = scene.getByRole('button', { name: `Show feature ${index + 1}: ${names[index]}` });
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-current', 'step');
      await expect(scene.locator(`img[data-angle="${angles[index]}"]`)).toHaveCSS('opacity', '1');
      await expect(scene.getByRole('heading', { level: 3 })).toHaveCount(1);
      const heading = scene.getByRole('heading', { name: names[index], exact: true });
      await expect(heading.locator('..')).toHaveCSS('opacity', '1');
      await expect(heading).toBeInViewport();
      const bounds = await scene.getByRole('img').boundingBox();
      expect(bounds!.y).toBeGreaterThan(72);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
      if (process.env.AGAP_CAPTURE_STORY) await page.screenshot({ path: `docs/screenshots/landing/story-feature-${index + 1}-${viewport.width}.png` });
    }
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    const travel = await scene.evaluate(element => ({ top: element.getBoundingClientRect().top + scrollY, distance: element.getBoundingClientRect().height - innerHeight }));
    for (const [progress, angle] of [[.42,45],[.90,315]]) {
      await page.evaluate(({ top, distance, progress }) => window.scrollTo({ top: top + distance * progress, behavior: 'instant' }), { ...travel, progress });
      await expect(scene.locator(`img[data-angle="${angle}"]`)).toHaveCSS('opacity','1');
      if (process.env.AGAP_CAPTURE_STORY && viewport.width === 1366) await page.screenshot({ path: `docs/screenshots/landing/story-angle-${angle}.png` });
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect.poll(scale).toBeCloseTo(3.2, 2);
    await expect(install).toBeInViewport();
    await install.focus(); await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape'); await expect(install).toBeFocused();
    if (process.env.AGAP_CAPTURE_STORY) await page.screenshot({ path: `docs/screenshots/landing/story-reverse-${viewport.width}.png` });
    expect(errors).toEqual([]);
  });
}

test('motion preference changes release the story and keep screenshot selection immediate', async ({ page }) => {
  await page.goto('/#/');
  await page.getByRole('link', { name: 'Meet Gabay', exact: true }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const scene = page.getByRole('region', { name: 'Introducing AGAP and Gabay' });
  await expect(scene.locator('> div')).toHaveCSS('position', 'relative');
  await expect(scene.getByRole('img').locator('..')).toHaveCSS('transform', 'none');
  await expect(scene.getByRole('heading', { level: 3 })).toHaveCount(4);
  await expect(scene.getByRole('list', { name: 'Explore AGAP features' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Demo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'See AGAP in action.' })).toBeFocused();
  await page.getByRole('tab', { name: 'Evidence', exact: true }).focus();
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Decision', exact: true })).toBeFocused();
  await expect(page.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'tab-decision');
  await expect(page.getByRole('tabpanel').getByRole('img').locator('..')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 683, height: 384 });
  await page.getByRole('link', { name: 'AGAP home', exact: true }).click();
  await expect(scene.locator('> div')).toHaveCSS('position', 'relative');
  await expect(scene.getByRole('img').locator('..')).toHaveCSS('transform', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (process.env.AGAP_CAPTURE_STORY) await page.screenshot({ path: 'docs/screenshots/landing/story-short-zoom.png', fullPage: true });
});

test('a failed turnaround asset keeps Gabay visible and every feature reachable', async ({ page }) => {
  await page.route('**/gabay-back.webp', route => route.abort());
  const failed = page.waitForEvent('requestfailed', { predicate: request => request.url().endsWith('/gabay-back.webp') });
  await page.goto('/#/?section=gabay');
  await failed;
  const scene = page.getByRole('region', { name: 'Introducing AGAP and Gabay' });
  await scene.getByRole('button', { name: 'Show feature 3: Compare full costs' }).click();
  await expect(scene.getByRole('heading', { name: 'Compare full costs', exact: true }).locator('..')).toHaveCSS('opacity', '1');
  const front = scene.getByRole('img');
  await expect(front).toBeVisible();
  expect(await front.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(scene.locator('img[data-angle]')).toHaveCount(0);
});

test('mobile keeps the full guide without requesting turnaround views; the workflow uses real images', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const turns: string[] = [];
  page.on('request', request => { if (request.url().includes('/turnaround/')) turns.push(request.url()); });
  await page.goto('/#/');
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  const journey = page.getByRole('list', { name: 'The AGAP review journey' });
  await expect(journey.getByRole('listitem')).toHaveCount(3);
  for (const img of await journey.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth === 1366)).toBe(true);
  }
  expect(turns).toEqual([]);
});

for (const [width, height] of [[1366, 768], [1440, 900]]) {
  test(`workflow fan follows scroll, holds and reverses at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/#/');
    const gallery = page.getByRole('list', { name: 'The AGAP review journey' });
    await expect(gallery.locator('[data-scroll-linked]')).toHaveCount(3);
    const move = (progress: number) => gallery.evaluate((element, value) => {
      const top = element.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top - innerHeight * (.7 - .4 * value), behavior: 'instant' });
    }, progress);
    const bounds = () => gallery.evaluate(element => Array.from(element.children, item => {
      const rect = item.firstElementChild!.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, right: rect.right, center: rect.x + rect.width / 2 };
    }));
    await move(0);
    await expect.poll(async () => { const r = await bounds(); return Math.abs(r[0].center - r[1].center) + Math.abs(r[2].center - r[1].center); }).toBeLessThan(3);
    const stack = await bounds();
    if (process.env.AGAP_CAPTURE_SCROLL_FAN) await page.screenshot({ path: `docs/screenshots/landing/scroll-fan-stack-${width}.png` });
    await move(.5);
    await expect.poll(async () => (await bounds())[0].center).toBeLessThan(stack[0].center - 100);
    const middle = await bounds();
    expect(middle[2].center).toBeGreaterThan(stack[2].center + 100);
    // A stationary scroll position must not complete the former 900ms entrance.
    await page.waitForTimeout(1100);
    expect(Math.abs((await bounds())[0].center - middle[0].center)).toBeLessThan(2);
    for (const caption of await gallery.locator('li > div:last-child').all()) await expect(caption).toHaveCSS('opacity', '1');
    if (width === 1440) expect((await new AxeBuilder({ page }).include('[data-workflow-fan]').analyze()).violations).toEqual([]);
    if (process.env.AGAP_CAPTURE_SCROLL_FAN) await page.screenshot({ path: `docs/screenshots/landing/scroll-fan-midpoint-${width}.png` });
    await move(1.1);
    await expect.poll(async () => { const r = await bounds(); return r[1].x - r[0].right; }).toBeGreaterThan(12);
    const spread = await bounds();
    expect(spread[1].right + 12).toBeLessThan(spread[2].x);
    expect(spread[1].y + 32).toBeLessThan(spread[0].y);
    expect(spread[1].y + 32).toBeLessThan(spread[2].y);
    for (const title of ['Evidence', 'Cash flow', 'Human review']) await expect(gallery.getByRole('heading', { name: title, exact: true })).toBeInViewport();
    for (const image of await gallery.locator('img').all()) await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth / img.naturalHeight)).toBeCloseTo(1366 / 850, 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (process.env.AGAP_CAPTURE_SCROLL_FAN) await page.screenshot({ path: `docs/screenshots/landing/scroll-fan-open-${width}.png` });
    await move(.5);
    await expect.poll(async () => Math.abs((await bounds())[0].center - middle[0].center)).toBeLessThan(2);
    await move(0);
    await expect.poll(async () => { const r = await bounds(); return Math.abs(r[0].center - r[1].center); }).toBeLessThan(2);
    if (process.env.AGAP_CAPTURE_SCROLL_FAN) await page.screenshot({ path: `docs/screenshots/landing/scroll-fan-reverse-${width}.png` });
  });
}

test('scroll fan releases to static preferences and preserves failed-image captions', async ({ page }) => {
  await page.route('**/landing/evidence.webp', route => route.abort());
  await page.goto('/#/');
  await page.getByRole('link', { name: 'How it works', exact: true }).click();
  const gallery = page.getByRole('list', { name: 'The AGAP review journey' });
  await expect(gallery.locator('[data-scroll-linked]')).toHaveCount(3);
  await expect(gallery.locator('img').first()).toHaveAttribute('hidden', '');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(gallery).toHaveAttribute('data-mode', 'static');
  for (const window of await gallery.locator('[data-fan-window]').all()) await expect(window).toHaveCSS('transform', 'none');
  await expect(gallery.getByRole('heading')).toHaveCount(3);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  if (process.env.AGAP_CAPTURE_SCROLL_FAN) await page.screenshot({ path: 'docs/screenshots/landing/scroll-fan-reduced.png', fullPage: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(gallery.locator('[data-scroll-linked]')).toHaveCount(3);
  await page.setViewportSize({ width: 1366, height: 600 });
  await expect(gallery).toHaveAttribute('data-mode', 'static');
  for (const window of await gallery.locator('[data-fan-window]').all()) await expect(window).toHaveCSS('transform', 'none');
});
