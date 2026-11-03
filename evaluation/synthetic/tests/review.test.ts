import { mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { ReleaseReviewSchema, verifyBundle } from '../src/bundle.js';
import { main, parseArgs } from '../src/cli.js';
import { corpusHash, serialize, sha256 } from '../src/model.js';
import { developmentPilot } from '../src/pilot.js';
import { buildReviewPack, reviewMoney, verifyReviewPack, writeReviewPack } from '../src/review.js';
import { privateFixture } from './fixtures.js';

const temporary: string[] = [];
async function temp() { const folder = await mkdtemp(join(tmpdir(), 'agap-review-pack-')); temporary.push(folder); return folder; }
afterAll(async () => {
  const base = await realpath(tmpdir());
  for (const folder of temporary) {
    const child = relative(base, await realpath(folder));
    if (!child || isAbsolute(child) || child.startsWith('..') || !child.startsWith('agap-review-pack-')) throw new Error('Unsafe review test cleanup path.');
    await rm(folder, { recursive: true });
  }
});
describe('EVAL-01 readable development review pack', () => {
  it('verifies the exact supplied reviewer handoff against its canonical corpus', async () => {
    const manifest = await verifyReviewPack(fileURLToPath(new URL('../reviews/development-v1', import.meta.url)));
    expect(manifest.inputCorpusSha256).toBe(corpusHash(developmentPilot()));
    expect(manifest.reviewStatus).toBe('pending');
  });
  it('retains all source text, candidate dimensions, rationales and annotated coverage without mutation', () => {
    const corpus = developmentPilot(), before = serialize(corpus), pack = buildReviewPack(corpus);
    const coverage = JSON.parse(pack.files['coverage.json']);
    expect(coverage.counts).toEqual({ cases: 12, sourcePages: 14, expectedFields: 18 });
    expect(coverage.scenarioGroups.find((g: { caseIds: string[] }) => g.caseIds.length > 1).caseIds).toHaveLength(2);
    for (const item of corpus.cases) {
      expect(pack.files['review.md']).toContain(item.id);
      for (const source of item.sources) { expect(pack.files['review.md']).toContain(source.sha256); expect(pack.files['review.md']).toContain(source.text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;')); }
      for (const finding of item.expected) { expect(pack.files['review.md']).toContain(finding.field); expect(pack.files['review.md']).toContain(`Next action: ${finding.action}`); }
    }
    expect(pack.files['review.md']).toContain('Authored rationale'); expect(serialize(corpus)).toBe(before);
    expect(pack.manifest).toMatchObject({ inputCorpusSha256: corpusHash(corpus), trainingRelease: false, holdout: null, reviewStatus: 'pending' });
    expect(serialize(buildReviewPack(corpus))).toBe(serialize(pack));
  });
  it('keeps missing values distinct from an explicit zero and formats maximum centavos exactly', () => {
    expect(reviewMoney({ availability: 'unavailable', reason: 'No amount supplied' })).toBe('Unavailable — No amount supplied');
    expect(reviewMoney({ availability: 'recorded', amountCentavos: 0 })).toBe('PHP 0.00 (0 centavos)');
    expect(reviewMoney({ availability: 'recorded', amountCentavos: Number.MAX_SAFE_INTEGER })).toBe('PHP 90,071,992,547,409.91 (9007199254740991 centavos)');
    const report = buildReviewPack(developmentPilot()).files['review.md'];
    expect(report).toContain('Cash date: Unavailable / not assigned'); expect(report).not.toContain('1970-01-01');
  });
  it('escapes untrusted documents, labels and Markdown payloads instead of executing instructions', () => {
    const corpus = developmentPilot(), payload = '</pre><script>globalThis.pwned=true</script><img src="https://example.invalid" onerror="alert(1)">';
    corpus.cases[0].sources[0].text += payload; corpus.cases[0].sources[0].sha256 = sha256(corpus.cases[0].sources[0].text);
    corpus.cases[0].rationale = `[external](https://example.invalid) ${payload}`;
    const pack = buildReviewPack(corpus);
    for (const name of ['review.md', 'review.html']) { expect(pack.files[name]).not.toContain('<script>'); expect(pack.files[name]).not.toContain('<img src='); expect(pack.files[name]).toContain('&lt;script&gt;'); }
    expect(pack.files['review.html']).toContain("default-src 'none'");
  });
  it('refuses reserved holdouts before creating any output', async () => {
    const output = join(await temp(), 'private-export');
    await expect(writeReviewPack(output, privateFixture())).rejects.toThrow('holdout');
    await expect(readFile(join(output, 'manifest.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('provides a pending worksheet which cannot masquerade as freeze approval', () => {
    const worksheet = JSON.parse(buildReviewPack(developmentPilot()).files['review-worksheet.json']);
    expect(worksheet).toMatchObject({ status: 'pending', labelReviewer: null, interfaceReviewer: null, reviewedOn: null, releaseApproval: null });
    expect(worksheet.cases.every((c: { fields: { decision: string }[] }) => c.fields.every(f => f.decision === 'pending'))).toBe(true);
    expect(ReleaseReviewSchema.safeParse(worksheet).success).toBe(false);
  });
  it('writes and verifies a self-contained pack and its original compatible development bundle', async () => {
    const output = join(await temp(), 'pack'), manifest = await writeReviewPack(output, developmentPilot());
    expect(await verifyReviewPack(output)).toEqual(manifest);
    expect((await verifyBundle(join(output, 'development'))).kind).toBe('development_preview');
    await expect(writeReviewPack(output, developmentPilot())).rejects.toMatchObject({ code: 'EEXIST' });
    expect(await verifyReviewPack(output)).toEqual(manifest);
  });
  it.each(['review.md', 'review.html', 'review-worksheet.json', 'development/development.inputs.jsonl'])('rejects tampering with %s', async name => {
    const output = join(await temp(), 'pack'); await writeReviewPack(output, developmentPilot());
    await writeFile(join(output, name), 'Changed artifact'); await expect(verifyReviewPack(output)).rejects.toThrow('differs');
  });
  it('rejects modified review decisions even when their manifest checksum is replaced', async () => {
    const output = join(await temp(), 'pack'); const manifest = await writeReviewPack(output, developmentPilot());
    const worksheet = JSON.parse(await readFile(join(output, 'review-worksheet.json'), 'utf8')); worksheet.status = 'approved';
    const bytes = serialize(worksheet); await writeFile(join(output, 'review-worksheet.json'), bytes);
    manifest.artifacts.find(a => a.name === 'review-worksheet.json')!.sha256 = sha256(bytes); await writeFile(join(output, 'manifest.json'), serialize(manifest));
    await expect(verifyReviewPack(output)).rejects.toThrow('inconsistent');
  });
  it('rejects extra files and incomplete packs', async () => {
    const output = join(await temp(), 'pack'); await writeReviewPack(output, developmentPilot());
    await writeFile(join(output, 'unlisted.txt'), 'Unlisted'); await expect(verifyReviewPack(output)).rejects.toThrow('inventory');
    await expect(verifyReviewPack(await temp())).rejects.toThrow('inventory');
  });
  it('refuses a linked pack directory instead of following it', async () => {
    const root = await temp(), output = join(root, 'pack'), link = join(root, 'alias');
    await writeReviewPack(output, developmentPilot()); await symlink(output, link, 'junction');
    await expect(verifyReviewPack(link)).rejects.toThrow('inventory');
  });
  it('exposes generation and verification through the existing strict CLI', async () => {
    const root = await temp(), corpus = join(root, 'corpus.json'), output = join(root, 'pack'); await writeFile(corpus, serialize(developmentPilot()));
    expect(parseArgs(['review', '--corpus', corpus, '--out', output]).command).toBe('review');
    expect(() => parseArgs(['review', '--corpus', corpus, '--out', output, '--holdout', corpus])).toThrow('Unknown');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try { await main(['review', '--corpus', corpus, '--out', output]); await main(['verify-review', '--pack', output]); }
    finally { log.mockRestore(); }
    expect((await verifyReviewPack(output)).reviewStatus).toBe('pending');
  });
});
