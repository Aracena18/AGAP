import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

/** Reproducible localhost-only, fictional presentation checks. No financial API. */
const origin = process.env.AGAP_LOAN_PREVIEW_ORIGIN ?? 'http://127.0.0.1:5192';
if (!['127.0.0.1', 'localhost'].includes(new URL(origin).hostname)) throw new Error('Preview checks require localhost.');
const destination = resolve('docs/tasks/production/benedict-phase5/screenshots'); await mkdir(destination, { recursive: true });
const browser = await chromium.launch({ headless: true }), context = await browser.newContext({ viewport: { width: 1366, height: 768 } }), page = await context.newPage();
const errors: string[] = [], checks: string[] = []; page.on('pageerror', error => errors.push(error.message));
try {
  for (const state of ['pending', 'posted']) {
    await page.goto(`${origin}/src/features/loans/preview.html?state=${state}`);
    await page.getByRole('heading', { name: 'Posted loan position' }).waitFor();
    if (state === 'posted') await page.getByLabel('Selected saved receipt').selectOption({ index: 1 });
    for (const width of [1366, 320]) {
      await page.setViewportSize({ width, height: 768 });
      const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      if (axe.violations.length) throw new Error(JSON.stringify(axe.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))));
      if (!await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) throw new Error('Preview overflows viewport.');
      await page.screenshot({ path: resolve(destination, `simulated-${state}-${width}.png`), fullPage: true });
      checks.push(`${state}: ${width}px reflow and axe`);
    }
    await page.setViewportSize({ width: 683, height: 384 });
    if (!await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)) throw new Error('Effective zoom viewport overflows.');
    checks.push(`${state}: effective 200% desktop viewport`);
    if (state === 'pending') {
      await page.getByLabel('Action reason').focus(); await page.keyboard.type('Fictional keyboard review.');
      await page.getByRole('button', { name: 'Post recorded movement' }).focus(); await page.keyboard.press('Enter');
      await page.getByText(/Action recorded/).waitFor(); checks.push('Keyboard submission through fictional gateway');
    } else {
      const pdf = resolve(destination, 'simulated-posted-receipt.pdf'); await page.emulateMedia({ media: 'print' });
      await page.pdf({ path: pdf, format: 'A4', printBackground: true });
      const text = execFileSync('pdftotext', ['-layout', pdf, '-'], { encoding: 'utf8' });
      if (!text.includes('10,000') || !text.includes('Fictional repayment receipt') || text.includes('Action reason') || text.includes('Financial actions')) throw new Error('Printed receipt content/privacy failed.');
      await page.emulateMedia({ media: 'screen' }); checks.push('A4 receipt content/privacy and peso amount');
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  await writeFile(resolve(destination, 'browser-check.json'), JSON.stringify({ scope: 'fictional_ui_simulation_only', connectedApi: false, checks, pageErrors: errors }, null, 2) + '\n');
  process.stdout.write(`PASS: ${checks.length} fictional presentation checks\n`);
} finally { await browser.close(); }
