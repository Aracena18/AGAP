/** Run explicitly against the development-only fictional preview; no shared test configuration changes. */
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const base = new URL(process.env.AGAP_PHASE3_WEB_URL ?? 'http://127.0.0.1:5188');
if (!['localhost', '127.0.0.1'].includes(base.hostname)) throw new Error('The fictional preview check requires localhost.');
const output = resolve('docs/tasks/production/benedict-phase3/screenshots');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();
const checks: string[] = [], errors: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const url = (scenario = '') => new URL(`/src/features/decision/staff-preview.html${scenario ? `?scenario=${scenario}` : ''}`, base).href;
async function accessible() { const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze(); expect(result.violations).toEqual([]); }
async function reflow() { expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true); }
try {
  await page.goto(url()); await page.getByRole('heading', { name: 'Current review basis' }).waitFor();
  await accessible(); await page.screenshot({ path: `${output}/simulated-workspace-1366.png`, fullPage: true }); checks.push('Desktop workspace and axe');
  await page.setViewportSize({ width: 320, height: 760 }); await reflow(); await accessible();
  await page.screenshot({ path: `${output}/simulated-workspace-320.png`, fullPage: true }); checks.push('320 CSS px reflow and axe');
  await page.setViewportSize({ width: 683, height: 384 }); await reflow(); checks.push('200 percent effective desktop viewport');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole('radio', { name: 'Approve', exact: true }).focus(); await page.keyboard.press('Space');
  await page.getByLabel('Offer considered').selectOption('00000000-0000-4000-8000-000000000005');
  await page.getByLabel('Decision rationale', { exact: true }).fill('Fictional human review of the checked cost, horizon and source limitations.');
  await page.getByLabel('Next review date').fill('2026-12-01');
  await page.getByRole('button', { name: 'Prepare exact preview' }).click();
  await page.getByText('Preview only. No decision has been recorded.').waitFor(); await accessible();
  await page.getByLabel('I reviewed this exact explanation and terms.').focus(); await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Record decision', exact: true }).focus(); await page.keyboard.press('Enter');
  const article = page.getByRole('article', { name: 'Saved decision brief' }); await article.waitFor();
  await expect(article).toContainText('₱36,000'); await expect(article).toContainText('₱6,000'); await accessible();
  await page.screenshot({ path: `${output}/simulated-saved-1366.png`, fullPage: true });
  await page.setViewportSize({ width: 320, height: 760 }); await reflow(); await accessible();
  await page.screenshot({ path: `${output}/simulated-saved-320.png`, fullPage: true });
  await page.emulateMedia({ media: 'print' });
  await expect(page.getByLabel('Decision rationale', { exact: true })).not.toBeVisible();
  await expect(article).toBeVisible();
  await page.pdf({ path: `${output}/simulated-saved-brief.pdf`, preferCSSPageSize: true, printBackground: true });
  const text = execFileSync('pdftotext', [`${output}/simulated-saved-brief.pdf`, '-'], { encoding: 'utf8' });
  expect(text).toContain('Fictional Ana'); expect(text).toContain('₱36,000'); expect(text).toContain('₱6,000');
  expect(text).not.toContain('PRIVATE POLICY NOTE'); expect(text).not.toContain('Human decision details'); expect(text).not.toContain('Fictional conflict restriction');
  expect(text.replace(/\s+/g, ' ')).toContain('view of saved content');
  expect(text.replace(/[\s-]/g, '')).toContain('00000000000040008000000000000013');
  expect(execFileSync('pdfinfo', [`${output}/simulated-saved-brief.pdf`], { encoding: 'utf8' })).toContain('(A4)'); checks.push('Keyboard actions; saved view axe; generated A4 PDF content and privacy');
  await page.emulateMedia({ media: 'screen' });
  await page.goto(url('timing')); await page.getByRole('heading', { name: 'Current review basis' }).waitFor();
  await page.getByRole('radio', { name: 'Approve', exact: true }).click(); await page.getByLabel('Offer considered').selectOption('00000000-0000-4000-8000-000000000005');
  await page.getByLabel('Decision rationale', { exact: true }).fill('Fictional timing-scenario print test; the dated shortage is retained.');
  await page.getByLabel('Authorized exception reason — cash-timing').fill('Fictional permitted exception for presentation testing only.');
  await page.getByLabel('Next review date').fill('2026-12-01'); await page.getByRole('button', { name: 'Prepare exact preview' }).click();
  await page.getByLabel('I reviewed this exact explanation and terms.').check(); await page.getByRole('button', { name: 'Record decision', exact: true }).click();
  await page.getByRole('article', { name: 'Saved decision brief' }).waitFor(); await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: `${output}/simulated-timing-brief.pdf`, preferCSSPageSize: true, printBackground: true });
  const timingText = execFileSync('pdftotext', [`${output}/simulated-timing-brief.pdf`, '-'], { encoding: 'utf8' });
  expect(timingText).toContain('−₱2,000'); expect(timingText).not.toContain('Fictional permitted exception');
  checks.push('Negative peso glyph and retained timing concern in generated PDF'); await page.emulateMedia({ media: 'screen' });
  for (const scenario of ['incomplete', 'restricted', 'stale', 'unavailable', 'uncertain']) {
    await page.goto(url(scenario));
    if (scenario === 'uncertain') {
      await page.getByRole('heading', { name: 'Current review basis' }).waitFor(); await page.getByRole('radio', { name: 'Approve', exact: true }).click();
      await page.getByLabel('Offer considered').selectOption('00000000-0000-4000-8000-000000000005'); await page.getByLabel('Decision rationale', { exact: true }).fill('Fictional uncertain-submission demonstration.');
      await page.getByLabel('Next review date').fill('2026-12-01'); await page.getByRole('button', { name: 'Prepare exact preview' }).click();
      await expect(page.getByRole('button', { name: 'Retry the same submission' })).toBeVisible(); await expect(page.getByLabel('Decision rationale', { exact: true })).toBeDisabled();
    } else if (scenario === 'unavailable') await expect(page.getByRole('alert')).toContainText('integration is unavailable');
    else { await page.getByRole('heading', { name: 'Current review basis' }).waitFor(); await expect(page.getByRole('radio', { name: 'Approve', exact: true })).toBeDisabled(); }
    await reflow(); await accessible(); await page.screenshot({ path: `${output}/simulated-${scenario}-320.png`, fullPage: true });
    checks.push(`${scenario} state; narrow reflow and axe`);
  }
  expect(errors).toEqual([]);
  await writeFile(`${output}/browser-check.json`, JSON.stringify({ scope: 'fictional_ui_simulation_only', checks, pageErrors: errors, connectedApi: false }, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ passed: checks, output }) + '\n');
} finally { await browser.close(); }
