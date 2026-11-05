import { readFile, mkdir } from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';
import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from '@playwright/test';
import { signInStaff } from './staff-session';

const origin = `http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT ?? 5174}`;

async function editingFixture(page: Page, member = false, polling = false) {
  const fixture = JSON.parse(await readFile('.platform-test/browser.json', 'utf8'));
  await signInStaff(page.context(), 'officer');
  await page.context().addCookies([{ name: 'agap_member_session', value: fixture.uiAuditMember, url: origin, httpOnly: true, sameSite: 'Lax' }]);
  const staffSession = await (await page.request.get('/api/v1/session')).json();
  const memberSession = await (await page.request.get('/api/v1/member/session')).json();
  const headers = { Origin: origin, 'X-CSRF-Token': staffSession.csrfToken, 'Idempotency-Key': randomUUID() };
  const created = await page.request.post('/api/v1/applications', { headers, data: {
    memberId: memberSession.principal.memberId, purpose: 'Fictional concurrent evidence review', requestedPrincipalCentavos: 100000, requestedTermMonths: 1, currency: 'PHP',
  } });
  expect(created.status()).toBe(201);
  const app = await created.json();
  const viewPath = `/api/v1/applications/${app.id}/evidence`, factsPath = `/api/v1/applications/${app.id}/facts`;
  const original = { factId: null, relevance: 'included', label: 'Concurrency opening cash', category: 'opening',
    value: { availability: 'recorded', amountCentavos: 100000 }, sourceId: null, sourceVersion: null,
    statement: 'Fictional opening cash PHP 1000 on 2026-01-01.', effectiveDate: '2026-01-01', coverageStart: null, coverageEnd: null,
    cashDates: ['2026-01-01'], period: 'one_time', basis: 'not_applicable', deduction: 'no', reason: 'Fictional confirmed statement.' };
  let view = await (await page.request.get(viewPath)).json();
  const initial = await page.request.post(factsPath, { headers: { ...headers, 'If-Match': `"${view.version}"` }, data: original });
  expect(initial.status()).toBe(201);
  if (polling) {
    // Remains quarantined: the browser harness deliberately runs no scan/OCR worker.
    const bytes = Buffer.from('%PDF-1.4\n% Fictional polling fixture\n%%EOF\n');
    const upload = await page.request.post(`/api/v1/applications/${app.id}/documents`, { headers: {
      ...headers, 'Idempotency-Key': randomUUID(), 'Content-Type': 'application/pdf', 'X-File-Name': 'fictional-processing.pdf', 'X-Upload-Size': String(bytes.length),
    }, data: bytes });
    expect(upload.status()).toBe(201);
  }
  view = await (await page.request.get(viewPath)).json();
  const pagePath = member ? `/member/applications/${app.id}` : `/staff/applications/${app.id}/evidence`;
  await page.goto(`/#${pagePath}`);
  await page.getByRole('button', { name: 'Correct Concurrency opening cash', exact: true }).click();
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveValue('1000.00');
  return { viewPath, factsPath, view, headers, original, member, app };
}

for (const member of [false, true]) test(`keeps a stale ${member ? 'member editor during automatic polling' : 'staff editor after explicit refresh'} from overwriting another principal's correction`, async ({ page }) => {
  const f = await editingFixture(page, member, member);
  await page.getByLabel('Amount per cash date (PHP)', { exact: true }).fill('1100');
  const corrected = { ...f.original, factId: f.view.facts[0].id, value: { availability: 'recorded', amountCentavos: 200000 }, statement: 'Fictional corrected opening cash PHP 2000 on 2026-01-01.' };
  // Correct through the other principal's actual authorized API.
  const path = member ? f.factsPath : `/api/v1/member/applications/${f.app.id}/facts`;
  const session = await (await page.request.get(member ? '/api/v1/session' : '/api/v1/member/session')).json();
  const concurrent = await page.request.post(path, { headers: { ...f.headers, 'X-CSRF-Token': session.csrfToken, 'Idempotency-Key': randomUUID(), 'If-Match': `"${f.view.version}"` }, data: corrected });
  expect(concurrent.status()).toBe(201);
  if (!member) await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Saved information changed while this form was open.' })).toBeVisible({ timeout: 15000 });
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveValue('1100');
  await expect(page.getByRole('button', { name: 'Save fact', exact: true })).toBeDisabled();
  for (const width of [320, 1366]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    if (process.env.AGAP_CL0_SCREENSHOTS) {
      const directory = 'docs/tasks/production/connected-lending-cl0/screenshots';
      await mkdir(directory, { recursive: true });
      await page.screenshot({ path: `${directory}/${member ? 'member' : 'staff'}-conflict-${width}.png`, fullPage: true });
    }
  }
  const stale = await page.request.post(f.factsPath, { headers: { ...f.headers, 'Idempotency-Key': randomUUID(), 'If-Match': `"${f.view.version}"` }, data: { ...corrected, value: { availability: 'recorded', amountCentavos: 110000 } } });
  expect(stale.status()).toBe(412);
  const current = await (await page.request.get(f.viewPath)).json();
  expect(current.facts[0]).toMatchObject({ revision: 2, input: { value: { amountCentavos: 200000 } } });
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Correct Concurrency opening cash', exact: true }).click();
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveValue('2000.00');
  await expect(page.getByRole('button', { name: 'Save fact', exact: true })).toBeEnabled();
});

test('preserves a financial draft through a failed evidence refresh', async ({ page }) => {
  const f = await editingFixture(page);
  await page.getByLabel('Amount per cash date (PHP)', { exact: true }).fill('1234');
  await page.route(`**${f.viewPath}`, route => route.fulfill({ status: 503, json: { error: { code: 'fixture_unavailable', message: 'Fictional read failure.', correlationId: 'fixture' } } }));
  await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Current information could not be checked.' })).toBeVisible();
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveValue('1234');
  await expect(page.getByRole('button', { name: 'Save fact', exact: true })).toBeDisabled();
  await page.unroute(`**${f.viewPath}`);
  await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Save fact', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveValue('1234');
});

test('clears private financial facts and an open draft after a later access denial', async ({ page }) => {
  const f = await editingFixture(page);
  await page.getByLabel('Amount per cash date (PHP)', { exact: true }).fill('1234');
  // UI denial simulation; actual revocation is exercised by the DB/API suites.
  await page.route(`**${f.viewPath}`, route => route.fulfill({ status: 403, json: { error: { code: 'evidence_forbidden', message: 'Fictional later access denial.', correlationId: 'fixture' } } }));
  await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('This private evidence is no longer accessible.');
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Concurrency opening cash', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Save fact', exact: true })).toHaveCount(0);
});

test('an application change cannot inherit another application’s unchanged editor', async ({ page }) => {
  const f = await editingFixture(page);
  const response = await page.request.post('/api/v1/applications', { headers: { ...f.headers, 'Idempotency-Key': randomUUID() }, data: {
    memberId: f.app.memberId, purpose: 'Separate fictional workflow', requestedPrincipalCentavos: 100000, requestedTermMonths: 1, currency: 'PHP',
  } });
  expect(response.status()).toBe(201); const other = await response.json();
  // Deliberate hash-only navigation exercises route reuse without a document reload.
  await page.evaluate(path => { location.hash = path; }, `/staff/applications/${other.id}/evidence`);
  await expect(page).toHaveURL(new RegExp(`${other.id}/evidence$`));
  await expect(page.getByRole('button', { name: 'Add financial fact', exact: true })).toBeEnabled();
  await expect(page.getByLabel('Amount per cash date (PHP)', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Concurrency opening cash', { exact: true })).toHaveCount(0);
});

test('replays an uncertain successful fact save with the original key and version after polling sees its commit', async ({ page }) => {
  const f = await editingFixture(page, false, true);
  const attempts: { key: string; version: string }[] = [];
  await page.route(`**${f.factsPath}`, async route => {
    if (route.request().method() !== 'POST') return route.continue();
    attempts.push({ key: route.request().headers()['idempotency-key'], version: route.request().headers()['if-match'] });
    if (attempts.length === 1) { const response = await route.fetch(); expect(response.status()).toBe(201); await route.abort('failed'); }
    else await route.continue();
  });
  await page.getByRole('button', { name: 'Save fact', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('uncertain');
  await page.getByRole('button', { name: 'Refresh evidence', exact: true }).click();
  await expect(page.getByText('opening · ₱1,000 · revision 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry same submission', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Retry same submission', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Correct financial fact', exact: true })).toHaveCount(0);
  expect(attempts).toHaveLength(2); expect(attempts[0]).toEqual(attempts[1]);
  expect(attempts[0].version).toBe(`"${f.view.version}"`);
  const current = await (await page.request.get(f.viewPath)).json();
  expect(current.facts[0].revision).toBe(2);
});
