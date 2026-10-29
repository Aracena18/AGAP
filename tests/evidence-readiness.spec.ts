import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createDemoCases } from '../src/demo/cases';
import { signInStaff } from './staff-session';

for (const ambiguity of ['source', 'fact'] as const) {
  test(`ambiguous ${ambiguity} keeps the correction draft and persisted evidence unchanged`, async ({ page, context }) => {
    const records = createDemoCases();
    const record = records[1];
    if (ambiguity === 'source') record.sources.push({ ...record.sources[0], title: 'Duplicate fictional payslip' });
    else record.facts.push({ ...record.facts[1] });
    await signInStaff(context);
    await page.addInitScript(records => localStorage.setItem('agap.demo.v1', JSON.stringify({ schemaVersion: 1, records })), records);
    await page.goto('/#/applications/AG-002/evidence');
    await expect(page.getByText('Evidence needs attention', { exact: true })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Evidence issues' })).toContainText(ambiguity === 'source' ? 'unambiguous supporting source' : 'unique reference');
    if (ambiguity === 'source') {
      const panel = page.getByRole('complementary', { name: 'Source details' });
      await expect(panel.getByRole('heading', { name: 'Ambiguous source reference' })).toBeVisible();
      await expect(panel.locator('blockquote')).toHaveCount(0);
    }
    await page.getByRole('button', { name: 'Correct Monthly take-home pay', exact: true }).first().click();
    const form = page.getByRole('form', { name: 'Correct Monthly take-home pay' });
    await expect(form).toHaveCount(1);
    await form.getByLabel('Amount (PHP)', { exact: true }).fill('18500.25');
    await form.getByLabel('Reason for correction').fill('Fictional draft retained until the references are resolved.');
    await form.getByRole('button', { name: 'Save correction', exact: true }).click();
    if (ambiguity === 'source') {
      await expect(form.getByLabel('Supporting source', { exact: true })).toHaveAttribute('aria-invalid', 'true');
      await expect(form.getByLabel('Supporting source', { exact: true })).toBeFocused();
    } else {
      await expect(form.getByRole('alert')).toContainText('fact reference is ambiguous');
      await expect(form.getByRole('alert')).toBeFocused();
    }
    await expect(form.getByLabel('Amount (PHP)', { exact: true })).toHaveValue('18500.25');
    await expect(form.getByLabel('Reason for correction')).toHaveValue('Fictional draft retained until the references are resolved.');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('agap.demo.v1')!))).toEqual({ schemaVersion: 1, records });
    for (const width of [1101, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      if (process.env.AGAP_PR17_SCREENSHOTS) {
        await mkdir('docs/screenshots/pr17-conflicts', { recursive: true });
        if (ambiguity === 'source') await form.getByLabel('Supporting source', { exact: true }).focus();
        else await form.getByRole('alert').focus();
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({ path: `docs/screenshots/pr17-conflicts/${ambiguity}-error-${width}.png`, fullPage: true });
      }
    }
  });
}
