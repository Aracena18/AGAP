import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { corpusHash, serialize, sha256, validateCorpus } from './model.js';

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function documentHtml(text: string): string {
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Fictional evaluation document</title><style>html{background:white;color:black;font:18px monospace}body{margin:48px}pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}</style><body><pre>${escapeHtml(text)}</pre></body></html>`;
}
export async function renderSources(input: unknown, output: string): Promise<void> {
  const corpus = validateCorpus(input);
  if (corpus.purpose !== 'development') throw new Error('Private holdout rendering must remain in the evaluator-controlled workflow.');
  const directory = resolve(output);
  const browser = await chromium.launch({ headless: true });
  try {
    await mkdir(dirname(directory), { recursive: true });
    await mkdir(directory);
    const context = await browser.newContext({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1, locale: 'en-PH', timezoneId: 'Asia/Manila', colorScheme: 'light', reducedMotion: 'reduce' });
    await context.route('**/*', route => route.abort());
    const page = await context.newPage();
    const artifacts = [];
    for (const item of corpus.cases) {
      for (const source of item.sources) {
        const name = `${item.id}-${source.id}.png`;
        await page.setContent(documentHtml(source.text));
        await page.evaluate(() => document.fonts.ready);
        const bytes = await page.screenshot({ fullPage: true, animations: 'disabled' });
        await writeFile(resolve(directory, name), bytes, { flag: 'wx' });
        artifacts.push({ caseId: item.id, sourceId: source.id, sourceVersion: source.version, page: source.page, sourceTextSha256: source.sha256, name, sha256: sha256(bytes) });
      }
    }
    await writeFile(resolve(directory, 'images.json'), serialize({ schemaVersion: 'eval-01-images/v1', kind: 'development_preview', corpusSha256: corpusHash(corpus), browser: browser.version(), platform: process.platform, font: 'system monospace', viewport: { width: 794, height: 1123 }, artifacts }), { flag: 'wx' });
    await context.close();
  } finally { await browser.close(); }
}
