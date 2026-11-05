import { mkdir, readFile } from 'node:fs/promises';
import { expect, test, type BrowserContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
async function signIn(context: BrowserContext, role = 'reconciliationAuditor') { const f = JSON.parse(await readFile('.platform-test/browser.json', 'utf8')); await context.addCookies([{ name: 'agap_session', value: f[role], url: `http://127.0.0.1:${process.env.AGAP_E2E_WEB_PORT ?? 5174}`, httpOnly: true, sameSite: 'Lax' }]); }
test.describe('accounting and support expansion', () => {
    test.describe.configure({ mode: 'serial', retries: 0 });
    test('preserves one trial balance through an uncertain response, reopens it and reflows at 320px', async ({ page, context }) => {
        await signIn(context);
        const keys: string[] = [];
        let lost = false;
        await page.route('**/api/v1/accounting/trial-balances', async (route) => { if (route.request().method() !== 'POST') {
            await route.continue();
            return;
        } keys.push(route.request().headers()['idempotency-key']); if (!lost) {
            lost = true;
            await route.fetch();
            await route.abort('failed');
        }
        else
            await route.continue(); });
        await page.goto('/#/staff/trial-balances');
        await page.getByLabel('From date', { exact: true }).fill('2026-11-01');
        await page.getByLabel('Through date', { exact: true }).fill('2026-11-03');
        await page.getByRole('button', { name: 'Create trial balance', exact: true }).click();
        await expect(page.getByRole('button', { name: 'Retry same report' })).toBeVisible();
        await expect(page.getByLabel('From date', { exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Retry same report' }).click();
        const result = page.getByRole('region', { name: 'Trial balance result' });
        await expect(result).toContainText('Debits equal credits');
        await expect(result).toContainText('Opening debit');
        expect(keys).toHaveLength(2);
        expect(keys[0]).toBe(keys[1]);
        const history = await (await page.request.get('/api/v1/accounting/trial-balances')).json();
        expect(history.items).toHaveLength(1);
        await page.reload();
        await page.getByRole('button', { name: `Open saved report ${history.items[0].id}` }).click();
        await expect(result).toBeVisible();
        await mkdir('.platform-test/expansion-screenshots', { recursive: true });
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.screenshot({ path: '.platform-test/expansion-screenshots/trial-balance-desktop.png', fullPage: true });
        await page.setViewportSize({ width: 320, height: 800 });
        const table = page.getByRole('region', { name: 'Account balances table' });
        await table.focus();
        await expect(table).toBeFocused();
        await page.keyboard.press('ArrowRight');
        await expect.poll(()=>table.evaluate(element=>element.scrollLeft)).toBeGreaterThan(0);
        await table.evaluate(element=>{element.scrollLeft=0;});
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await table.evaluate(element=>{element.blur();element.scrollTo({left:0,behavior:'instant'});});
        await page.evaluate(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
        await expect.poll(()=>page.evaluate(()=>window.scrollY)).toBe(0);
        await page.screenshot({ path: '.platform-test/expansion-screenshots/trial-balance-320.png', fullPage: true });
    });
    test('rejects invalid report dates and clears a saved report after access denial', async ({ page, context }) => {
        await signIn(context);
        await page.goto('/#/staff/trial-balances');
        await page.getByLabel('From date', { exact: true }).fill('2026-01-01');
        await page.getByLabel('Through date', { exact: true }).fill('2027-01-02');
        let posts = 0;
        page.on('request', r => { if (r.method() === 'POST' && r.url().endsWith('/trial-balances'))
            posts++; });
        await page.getByRole('button', { name: 'Create trial balance', exact: true }).click();
        await expect(page.getByRole('alert')).toContainText('366');
        expect(posts).toBe(0);
        await page.getByRole('button', { name: /^Open saved report / }).first().click();
        await expect(page.getByRole('region', { name: 'Trial balance result' })).toBeVisible();
        await page.route('**/api/v1/accounting/trial-balances', r => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'report_forbidden', message: 'Fictional access denial' } }) }));
        await page.getByRole('button', { name: 'Refresh report history' }).click();
        await expect(page.getByText('Accounting reports require complete organization auditor access.', { exact: false })).toBeVisible();
        await expect(page.getByRole('region', { name: 'Trial balance result' })).toHaveCount(0);
    });
    test('shows explicit check-in counts with no access for auditors', async ({ page, context }) => {
        await signIn(context, 'officer');
        await page.goto('/#/staff/check-in-summary');
        await page.getByLabel('From date', { exact: true }).fill('2026-11-01');
        await page.getByLabel('Through date', { exact: true }).fill('2026-11-30');
        await page.getByRole('button', { name: 'Load summary', exact: true }).click();
        const result = page.getByRole('region', { name: 'Check-in counts' });
        await expect(result).toContainText('current assignments');
        await expect(result).toContainText('Declined');
        await expect(result).toContainText('Unavailable');
        await page.screenshot({ path: '.platform-test/expansion-screenshots/check-in-summary-desktop.png', fullPage: true });
        await page.setViewportSize({ width: 320, height: 800 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await page.screenshot({ path: '.platform-test/expansion-screenshots/check-in-summary-320.png', fullPage: true });
        await page.route('**/api/v1/check-in-summary?**', r => r.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: { code: 'support_forbidden', message: 'Fictional access denial' } }) }));
        await page.getByRole('button', { name: 'Load summary', exact: true }).click();
        await expect(result).toHaveCount(0);
        await expect(page.getByText('Check-in summaries require current assigned-officer access.', { exact: false })).toBeVisible();
        await signIn(context);
        await page.reload();
        await expect(page.getByRole('button', { name: 'Load summary' })).toHaveCount(0);
        expect((await page.request.get('/api/v1/check-in-summary?fromDate=2026-11-01&throughDate=2026-11-30')).status()).toBe(403);
    });
});
