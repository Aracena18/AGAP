import { mkdir, readFile } from 'node:fs/promises';
import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { fixtureId } from './member-domain-fixture';

const application = {
  id: fixtureId(301), purpose: 'Simulated school expenses', requestedPrincipalCentavos: 150025,
  requestedTermMonths: 6, currency: 'PHP', status: 'draft', version: 1,
  createdAt: '2026-11-01T00:00:00Z', updatedAt: '2026-11-05T00:00:00Z',
};
function loan(suffix: number, date: string | null, amount = 25000) {
  const id = fixtureId(suffix);
  return {
    id, label: `Simulated loan ${suffix}`, status: 'active',
    position: { loanId: id, asOfDate: '2026-11-05', principalCentavos: 250000, interestDueCentavos: 0,
      feesDueCentavos: 0, overdueCentavos: 0, postedThrough: '2026-11-05T00:00:00Z', pendingMovementCount: 1 },
    nextPayment: date ? { date, amountCentavos: amount } : null,
    schedule: date ? [{ date, amountCentavos: amount }] : [],
    receipts: [{ id: fixtureId(suffix + 10), loanId: id, paidOn: '2026-11-01', amountCentavos: 10000, reference: 'SIMULATED-RECEIPT' }],
  };
}
async function signIn(context: BrowserContext) {
  const fixture = JSON.parse(await readFile('.platform-test/browser.json', 'utf8'));
  await context.addCookies([{ name: 'agap_member_session', value: fixture.uiAuditMember,
    url: `http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT ?? 5174}`, httpOnly: true, sameSite: 'Lax' }]);
}
async function displayFixtures(page: Page) {
  await page.route(/\/api\/v1\/member\/applications(?:\?.*)?$/, route => route.request().method() === 'GET'
    ? route.fulfill({ json: { items: [application], nextCursor: null } }) : route.continue());
  await page.route(`**/api/v1/member/applications/${application.id}`, route => route.fulfill({ json: application }));
  await page.route('**/api/v1/member/applications/*/workflow', route => route.fulfill({ status: 501,
    json: { error: { code: 'module_not_available', message: 'Simulated rendering fixture', correlationId: 'fictional' } } }));
  for (const endpoint of ['evidence', 'options', 'decision']) await page.route(`**/api/v1/member/applications/*/${endpoint}`,
    route => route.fulfill({ json: { state: 'unavailable', message: 'This information is unavailable in this simulated screen.' } }));
  await page.route('**/api/v1/member/loans', route => route.fulfill({ json: { state: 'available', data: [loan(302, '2026-11-10')] } }));
}
async function capture(page: Page, name: string) {
  if (!process.env.AGAP_MOBILE_SCREENSHOTS) return;
  const captureDirectory = process.env.AGAP_MEMBER_CAPTURE_DIR ?? 'docs/screenshots/member-mobile';
  await mkdir(captureDirectory, { recursive: true });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.screenshot({ path: `${captureDirectory}/${name}.jpg`, fullPage: true });
}

test.describe('Mobile member presentation', () => {
  test.beforeEach(async ({ page, context }) => { await signIn(context); await displayFixtures(page); });

  for (const width of [320, 390, 768, 1366]) test(`all member routes reflow and remain accessible at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const routes = [['home', '/member'], ['applications', '/member/applications'], ['apply', '/member/apply'],
      ['application', `/member/applications/${application.id}`], ['edit', `/member/applications/${application.id}/edit`],
      ['loans', '/member/loans'], ['help', '/member/help']];
    for (const [name, path] of routes) {
      await page.goto('about:blank');
      await page.goto(`/#${path}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
      await expect(page.getByText('Loading your information…', { exact: true })).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Switch workspace/ })).toHaveCount(0);
      const nav = page.getByRole('navigation', { name: 'Member account' });
      await expect(nav).toHaveCSS('position', width < 768 ? 'fixed' : 'static');
      for (const link of await nav.getByRole('link').all()) {
        const bounds = (await link.boundingBox())!;
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
      }
      if (path.includes('/apply') || path.includes('/applications')) await expect(nav.getByRole('link', { name: 'Applications', exact: true })).toHaveAttribute('aria-current', 'page');
      if (name === 'applications') await expect(page.getByRole('link', { name: 'Continue your draft', exact: true })).toHaveAttribute('href', `#/member/applications/${application.id}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.querySelector('main')!.scrollWidth <= document.querySelector('main')!.clientWidth)).toBe(true);
      if (width < 768) expect((await page.getByRole('main').boundingBox())!.y + (await page.getByRole('main').boundingBox())!.height).toBeLessThanOrEqual((await nav.boundingBox())!.y + 1);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await capture(page, `${name}-${width}`);
    }
  });

  test('Home leads with the earliest known payment even with reminders off', async ({ page }) => {
    await page.route('**/api/v1/member/loans', route => route.fulfill({ json: { state: 'available', data: [
      loan(305, '2026-12-01'), loan(304, '2026-11-10', 125025), loan(303, null),
    ] } }));
    await page.route('**/api/v1/member/reminder-preferences', route => route.fulfill({ json: { noticesEnabled: false, version: 1 } }));
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/member');
    const payments = page.getByRole('region', { name: 'Upcoming payments' });
    await expect(payments).toContainText('Simulated loan 304');
    await expect(payments).toContainText('₱1,250.25');
    await expect(payments).toContainText('Nov 10, 2026');
    await expect(payments).toContainText('Position as of Nov 5, 2026');
    await expect(payments).not.toContainText('Simulated loan 305');
    expect((await payments.boundingBox())!.y).toBeLessThan((await page.getByRole('region', { name: 'Recent application' }).boundingBox())!.y);
    await expect(payments.getByRole('heading', { name: 'Next payment' })).toBeInViewport();
    await capture(page, 'payment-first-390');
  });

  test('unavailable or failed loans do not hide a ready application', async ({ page }) => {
    await page.route('**/api/v1/member/loans', route => route.fulfill({ json: { state: 'unavailable', message: 'Loan records are unavailable.' } }));
    await page.goto('/#/member');
    await expect(page.getByRole('region', { name: 'Upcoming payments' })).toContainText('Loan records are unavailable.');
    await expect(page.getByRole('link', { name: 'Continue your draft' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Upcoming payments' })).not.toContainText('₱0');
    await page.route('**/api/v1/member/loans', route => route.abort('failed'));
    await page.reload();
    await expect(page.getByRole('region', { name: 'Upcoming payments' }).getByRole('alert')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Continue your draft' })).toBeVisible();
  });

  test('empty loans lead with the application and empty applications offer Apply once', async ({ page }) => {
    await page.route('**/api/v1/member/loans', route => route.fulfill({ json: { state: 'available', data: [] } }));
    await page.goto('/#/member');
    await expect(page.getByRole('region', { name: 'Upcoming payments' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Continue your draft' })).toBeVisible();
    await page.route(/\/api\/v1\/member\/applications(?:\?.*)?$/, route => route.fulfill({ json: { items: [], nextCursor: null } }));
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your first application' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apply for a loan', exact: true })).toHaveCount(1);
    await capture(page, 'first-application-1366');
  });

  test('failed applications do not hide payments or invent an empty application state', async ({ page }) => {
    await page.route(/\/api\/v1\/member\/applications(?:\?.*)?$/, route => route.abort('failed'));
    await page.goto('/#/member');
    await expect(page.getByRole('region', { name: 'Recent application' }).getByRole('alert')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Upcoming payments' })).toContainText('₱250');
    await expect(page.getByRole('heading', { name: 'Your first application' })).toHaveCount(0);
  });

  test('a loan without a next payment does not display a zero payment', async ({ page }) => {
    await page.route('**/api/v1/member/loans', route => route.fulfill({ json: { state: 'available', data: [loan(302, null)] } }));
    await page.goto('/#/member');
    await expect(page.getByRole('region', { name: 'Upcoming payments' })).toContainText('No next payment is shown');
    await expect(page.getByRole('region', { name: 'Upcoming payments' })).not.toContainText('₱0');
  });

  test('help starts with the message and keeps its final action above the phone bar', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.goto('/#/member/help');
    const fields = page.locator('fieldset input, fieldset textarea, fieldset select');
    await expect(fields.first()).toHaveAttribute('id', 'help-message');
    await page.getByLabel('What changed, and what help do you need?').fill('SIMULATED: please contact me.');
    await page.getByText('Add a loan or check-in (optional)', { exact: true }).click();await page.getByLabel('Related loan (optional)').selectOption(fixtureId(302));
    const review = page.getByRole('button', { name: 'Review request' });
    await review.focus();
    expect((await review.boundingBox())!.y + (await review.boundingBox())!.height).toBeLessThanOrEqual((await page.getByRole('navigation', { name: 'Member account' }).boundingBox())!.y);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Review what will be shared' })).toBeFocused();
    await expect(page.getByText('Linked loan: Simulated loan 302', { exact: true })).toBeVisible();
    await expect(page.getByLabel('I agree to send this message')).not.toBeChecked();
    await capture(page, 'help-review-320');
  });

  test('connection loss retains entered values and reconnecting sends no command', async ({ page, context }) => {
    let writes = 0;
    page.on('request', request => { if (request.method() === 'POST' && request.url().includes('/member/')) writes++; });
    await page.goto('/#/member/apply');
    await page.getByLabel('What is the loan for?').fill('SIMULATED unsaved request');
    await page.getByLabel('Requested amount (PHP)').fill('1500.25');
    await context.setOffline(true);
    await expect(page.getByRole('status')).toContainText('You’re offline.');
    await expect(page.getByLabel('What is the loan for?')).toHaveValue('SIMULATED unsaved request');
    await context.setOffline(false);
    await expect(page.getByRole('status')).toContainText('Connection restored.');
    await expect(page.getByLabel('Requested amount (PHP)')).toHaveValue('1500.25');
    await page.getByRole('button', { name: 'Dismiss connection message' }).click();
    expect(writes).toBe(0);
    expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  });

  test('a keyboard-size visual viewport hides the phone bar and restores it afterward', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#/member/apply');
    await page.getByLabel('What is the loan for?').focus();
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 400 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await expect(page.getByRole('navigation', { name: 'Member account' })).toBeHidden();
    await expect(page.getByLabel('What is the loan for?')).toBeFocused();
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, 'height', { configurable: true, value: 844 });
      window.visualViewport!.dispatchEvent(new Event('resize'));
    });
    await expect(page.getByRole('navigation', { name: 'Member account' })).toBeVisible();
  });

  test('long content and doubled text remain within the phone and clear navigation', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 844 });
    await page.route(/\/api\/v1\/member\/applications(?:\?.*)?$/, route => route.fulfill({ json: {
      items: [{ ...application, purpose: `SIMULATED ${'LONG_REFERENCE'.repeat(20)}` }], nextCursor: null,
    } }));
    await page.goto('/#/member');
    await expect(page.getByRole('link', { name: 'Continue your draft' })).toBeVisible();
    await page.evaluate(() => {
      const text = [...document.querySelectorAll<HTMLElement>('h1,h2,h3,p,a,label,button,input,select,textarea,dt,dd,small,nav span')];
      const sizes = text.map(element => parseFloat(getComputedStyle(element).fontSize));
      text.forEach((element, index) => { element.style.fontSize = `${sizes[index] * 2}px`; element.style.lineHeight = '1.5'; });
    });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const help = page.getByRole('link', { name: 'Get payment help', exact: false });
    await help.focus();
    const bounds = (await help.boundingBox())!;
    expect(bounds.y + bounds.height).toBeLessThanOrEqual((await page.getByRole('navigation', { name: 'Member account' }).boundingBox())!.y);
    await capture(page, 'text-200-320');
  });
});

for (const outcome of ['accepted', 'dismissed', 'error'] as const) test(`member installation handles ${outcome} without claiming confirmed installation`, async ({ page }) => {
  await page.goto('/#/member');
  await page.getByRole('heading', { name: 'Welcome to AGAP' }).waitFor();
  await page.evaluate(value => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: () => value === 'error' ? Promise.reject(new Error('Unavailable')) : Promise.resolve(), userChoice: Promise.resolve({ outcome: value }) });
    window.dispatchEvent(event);
  }, outcome);
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText(outcome === 'accepted' ? 'accepted the installation request' : outcome === 'dismissed' ? 'was dismissed' : 'could not open');
  await expect(dialog.getByRole('button', { name: 'Install AGAP', exact: true })).toHaveCount(0);
  await expect(dialog.getByRole('heading', { name: 'AGAP is installed' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Install AGAP', exact: true })).toBeFocused();
});

test('an installation prompt survives landing-to-member navigation until confirmed by the browser', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#/');
  await expect(page.getByRole('heading', { name: 'AGAP', exact: true })).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true });
    Object.assign(event, { prompt: () => Promise.resolve(), userChoice: Promise.resolve({ outcome: 'accepted' }) });
    window.dispatchEvent(event);
  });
  await page.getByRole('link', { name: 'Member access', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('accepted the installation request');
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(dialog.getByRole('heading', { name: 'AGAP is installed' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#member-install')).toHaveCount(0);
  await expect(page.getByRole('main')).toBeFocused();
});

test('direct-entry installation is captured while the member route is still lazy loading', async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/src/features/member-portal/MemberApp.tsx*', async route => { await blocked; await route.continue(); });
  try {
    await page.goto('/#/member', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status')).toContainText('Opening AGAP');
    await page.evaluate(() => {
      const event = new Event('beforeinstallprompt', { cancelable: true });
      Object.assign(event, { prompt: () => Promise.resolve(), userChoice: Promise.resolve({ outcome: 'dismissed' }) });
      window.dispatchEvent(event);
    });
  } finally { release(); }
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Install AGAP', exact: true })).toBeVisible();
});

test('Safari fallback is usable and standalone entry hides the member invitation', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', { value: 'iPhone Safari' }));
  await page.goto('/#/member');
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  await page.getByRole('button', { name: 'Install AGAP', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Add to Home Screen');
  await expect(page.getByRole('dialog')).toContainText('Open as Web App');
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.keyboard.press('Escape');
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Install AGAP', exact: true })).toHaveCount(0);
});

test('the installed launch keeps app identity, opens member access and registers no worker', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.id).toBe('./');
  expect(manifest.start_url).toBe('./#/member');
  await page.goto(`/${manifest.start_url.replace(/^\.\//, '')}`);
  await expect(page.getByRole('heading', { name: 'Welcome to AGAP' })).toBeVisible();
  expect(await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(items => items.length))).toBe(0);
});
