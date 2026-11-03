import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { developmentPilot } from '../evaluation/synthetic/src/pilot';
import { buildReviewPack } from '../evaluation/synthetic/src/review';
import { sha256 } from '../evaluation/synthetic/src/model';

test('development review document exposes its complete answer key, citations and readable mobile layout', async ({ page }) => {
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  const pack = buildReviewPack(developmentPilot());
  await page.setContent(pack.files['review.html']);
  await expect(page.getByRole('heading', { name: 'EVAL-01 development review pack' })).toBeVisible();
  await expect(page.getByText('Development answer key included. This is not a training release or an untouched test set.')).toBeVisible();
  await page.getByRole('link', { name: 'Skip to review content' }).focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('main')).toBeFocused();
  await expect(page.locator('section.case')).toHaveCount(12);
  const example = page.locator('#ev-03'); await expect(example).toContainText('Unavailable — Amount and cash date are not provided.'); await expect(example).toContainText('PHP 0.00 (0 centavos)');
  const sourceLink = page.locator('#ev-01').getByRole('link', { name: /^Source / }).first(); await sourceLink.focus(); await page.keyboard.press('Enter');
  const target = await sourceLink.getAttribute('href');
  expect(Math.abs((await page.evaluate(id => document.querySelector(id!)!.getBoundingClientRect().top, target)))).toBeLessThanOrEqual(1);
  await mkdir('.platform-test/evaluation-review', { recursive: true });
  for (const width of [1366, 320]) {
    await page.setViewportSize({ width, height: 900 }); await page.evaluate(() => window.scrollTo(0, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    expect(await page.locator('section.case').evaluateAll(sections => sections.every(section => {
      const bounds = section.getBoundingClientRect();
      return [...section.querySelectorAll('article,pre,blockquote,dl')].every(child => { const b = child.getBoundingClientRect(); return b.left >= bounds.left && b.right <= bounds.right + 1; });
    }))).toBe(true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({ path: `.platform-test/evaluation-review/overview-${width}.png` });
    await page.locator('#ev-03').screenshot({ path: `.platform-test/evaluation-review/missing-zero-${width}.png` });
  }
  expect(requests).toEqual([]);
});
test('untrusted source text stays inert and cannot insert links, scripts or images into the review document', async ({ page }) => {
  const corpus = developmentPilot(); corpus.cases[0].sources[0].text += '</pre><script>globalThis.reviewInjected=true</script><img src="https://example.invalid/collect" onerror="alert(1)">';
  corpus.cases[0].sources[0].sha256 = sha256(corpus.cases[0].sources[0].text);
  const requests: string[] = []; page.on('request', request => requests.push(request.url()));
  await page.setContent(buildReviewPack(corpus).files['review.html']);
  await expect(page.locator('script,img,iframe')).toHaveCount(0);
  expect(await page.evaluate(() => Object.hasOwn(globalThis, 'reviewInjected'))).toBe(false);
  expect(await page.locator('a').evaluateAll(links => links.every(link => link.getAttribute('href')?.startsWith('#')))).toBe(true);
  expect(requests).toEqual([]);
});
