/* global URL, process, document, window, console */
// Run only with this worktree's fictional browser-test API and frontend.
// No production login, fixture registry, or financial arithmetic is introduced.
import { readFile, mkdir, unlink } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { chromium, expect } from '@playwright/test';

const run = promisify(execFile);
const url = new URL(process.env.AGAP_CAPTURE_URL ?? 'http://127.0.0.1:5186');
if (url.hostname !== '127.0.0.1') throw new Error('Capture requires the loopback fictional browser-test environment.');
const fixture = JSON.parse(await readFile('.platform-test/browser.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1366, height: 850 }, colorScheme: 'light', reducedMotion: 'reduce' });
  await context.addCookies([{ name: 'agap_session', value: fixture.administrator, url: url.origin, httpOnly: true, sameSite: 'Lax' }]);
  const page = await context.newPage();
  await mkdir('public/landing', { recursive: true });
  async function capture(name, locator) {
    await page.evaluate(() => document.fonts.ready);
    if (locator) await locator.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 100 }));
    const png = `public/landing/${name}.png`;
    await page.screenshot({ path: png });
    await run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', png, '-quality', '88', `public/landing/${name}.webp`]);
    await unlink(png);
  }
  await page.goto(`${url.origin}/#/applications/AG-001/evidence`);
  await expect(page.getByRole('heading', { name: 'Evidence', exact: true })).toBeVisible();
  await capture('evidence', page.getByRole('heading', { name: 'Evidence', exact: true }));
  await page.getByRole('button', { name: 'Resolve conflict for Monthly take-home pay' }).click();
  await page.getByLabel('Supporting source', { exact: true }).selectOption('payslip');
  await page.getByLabel('Evidence status', { exact: true }).selectOption('document-supported');
  await expect(page.getByLabel('Amount (PHP)', { exact: true })).toHaveValue('24000');
  await page.getByLabel('Reason for correction').fill('Current fictional payslip checked with the member; prior worksheet is outdated.');
  await page.getByRole('button', { name: 'Save correction', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correction saved');
  await page.getByRole('link', { name: 'Compare options', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Monthly remaining', exact: true })).toContainText('₱2,000');
  await expect(page.getByRole('region', { name: 'Lowest dated cash balance', exact: true })).toContainText('−₱2,000');
  await capture('cash-flow', page.getByRole('heading', { name: 'Repayment comparison', exact: true }));
  await page.getByRole('radio', { name: /After-payday schedule/ }).check();
  await expect(page.getByRole('region', { name: 'Lowest dated cash balance', exact: true })).toContainText('₱1,000');
  await capture('options', page.getByRole('heading', { name: 'Compare the full cost' }));
  await page.getByLabel('Recommendation reason').fill('The permitted after-payday schedule keeps the same full cost and avoids the modeled timing gap.');
  await page.getByRole('button', { name: 'Save recommendation' }).click();
  await expect(page.getByRole('status')).toContainText('Recommendation saved');
  await page.getByRole('link', { name: /Continue to decision/ }).click();
  await page.getByText('Demo tools', { exact: true }).click();
  await page.getByLabel('Demo role').selectOption('reviewer');
  await page.getByLabel('Decision rationale', { exact: true }).fill('Reviewed current evidence, full costs, household cash timing and remaining uncertainty. Fictional demonstration only.');
  await page.getByLabel('Review date', { exact: true }).fill('2026-12-01');
  await page.getByText('Read the explanation to be recorded', { exact: true }).click();
  await page.getByLabel(/I reviewed the template explanation/).check();
  await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  const brief = page.getByRole('article', { name: 'Saved member brief' });
  await expect(brief).toContainText('₱36,000');
  await capture('decision', brief);
  console.log('Captured four fresh fictional review screenshots at 1366×850.');
} finally { await browser.close(); }
