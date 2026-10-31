import { mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { comparePredictions, comparisonMarkdown, writeComparison } from '../src/compare.js';
import { main, parseArgs } from '../src/cli.js';
import { freezeBundle, previewBundle, writeBundle } from '../src/bundle.js';
import { serialize, sha256, type Predictions } from '../src/model.js';
import { pilot, predictions, privateFixture, review } from './fixtures.js';

const protocolSha256 = sha256('Fictional comparison-test protocol; not an accepted protocol.');
const entry = (output: Predictions, label = output.run.id) => ({ label, protocolSha256, predictions: output });
function input() { return { baselineRunId: 'baseline', runs: [entry(predictions(pilot(), 'baseline')), entry(predictions(pilot(), 'candidate'))] }; }
const compare = (data = input()) => comparePredictions(pilot(), data);
function declareModel(output: Predictions) {
  output.run.origin = 'model'; output.run.environment = 'Fictional test environment declaration';
  output.run.artifact = { baseModel: 'Fictional test model', baseRevision: 'a'.repeat(40), artifactSha256: null,
    promptVersion: 'fixture-prompt-v1', schemaVersion: 'fixture-output-v1', datasetManifestSha256: null, evaluationReference: 'Fictional test reference; no actual execution' };
}
const folders: string[] = [];
async function temp() { const folder = await mkdtemp(join(tmpdir(), 'agap-compare-')); folders.push(folder); return folder; }
afterAll(async () => {
  const base = await realpath(tmpdir());
  for (const folder of folders) {
    const path = await realpath(folder), child = relative(base, path);
    if (!child || isAbsolute(child) || child.startsWith('..') || !child.startsWith('agap-compare-')) throw new Error('Refusing cleanup outside the named test directory.');
    await rm(path, { recursive: true });
  }
});

describe('paired run comparison', () => {
  it('retains exact field denominators and honest evidence for simulated fixtures', () => {
    const report = compare(), pair = report.comparisons[0];
    expect(report).toMatchObject({ evidence: 'harness_only', promotion: 'not_assessed', use: 'development_diagnostics' });
    expect(pair.pairedFields).toMatchObject({ denominator: 18, improved: 0, regressed: 0, bothCorrect: 18, bothIncorrect: 0 });
    expect(pair.pairedMeasurements).toMatchObject({ evidence: 'unavailable', timingCases: 0, memoryCases: 0, meanElapsedMsDelta: null });
  });
  it('reports an improvement and regression even when aggregate accuracy is unchanged', () => {
    const data = input();
    data.runs[0].predictions.cases[0].findings[0].value = { availability: 'recorded', amountCentavos: 1 };
    data.runs[1].predictions.cases[0].findings[1].value = { availability: 'recorded', amountCentavos: 2 };
    const pair = compare(data).comparisons[0];
    expect(pair.exactFieldAccuracyDelta).toBe(0);
    expect(pair.pairedFields).toMatchObject({ improved: 1, regressed: 1, bothCorrect: 16, bothIncorrect: 0 });
    expect(pair.pairedFields.fields.filter(field => field.outcome === 'regressed')[0].candidateProblems).toContain('amount_or_availability');
  });
  it('keeps missing answers in paired denominators and counts additional findings separately', () => {
    const data = input(), row = data.runs[1].predictions.cases[0]; row.findings.pop();
    row.findings.push({ ...structuredClone(row.findings[0]), field: 'unrequested_money' });
    const pair = compare(data).comparisons[0];
    expect(pair.pairedFields).toMatchObject({ denominator: 18, regressed: 1, bothCorrect: 17 });
    expect(pair.countDeltas).toMatchObject({ missingFields: 1, extraFields: 1, unsupportedRecordedValues: 1, exactFields: -1 });
    expect(pair.exactFieldAccuracyDelta).toBeCloseTo(-1 / 18);
  });
  it('retains both-incorrect outcomes and both sets of error categories', () => {
    const data = input();
    data.runs[0].predictions.cases[0].findings[0].cashDate = '2026-01-01';
    data.runs[1].predictions.cases[0].findings[0].sources[0].excerpt = 'FICTIONAL';
    const pair = compare(data).comparisons[0];
    expect(pair.pairedFields.bothIncorrect).toBe(1);
    expect(pair.pairedFields.fields.find(field => field.outcome === 'both_incorrect')).toMatchObject({ baselineProblems: ['cash_date'], candidateProblems: ['source'] });
  });
  it('compares multiple candidates to the selected baseline rather than the first input', () => {
    const data = input(); data.runs.reverse(); data.runs.push(entry(predictions(pilot(), 'checklist-fixture')));
    expect(compare(data).comparisons.map(pair => [pair.baselineRunId, pair.candidateRunId])).toEqual([
      ['baseline', 'candidate'], ['baseline', 'checklist-fixture'],
    ]);
  });
  it('leaves inputs intact and produces stable summaries when run/case order changes', () => {
    const data = input(), saved = structuredClone(data), report = compare(data);
    expect(data).toEqual(saved);
    data.runs.reverse();
    expect(compare(data)).toEqual(report);
    data.runs.forEach(row => row.predictions.cases.reverse());
    const reordered = compare(data);
    expect(reordered.comparisons).toEqual(report.comparisons);
    // Canonical JSON preserves array order, so each actual supplied output has its own commitment.
    expect(reordered.runs[0].predictionsSha256).not.toBe(report.runs[0].predictionsSha256);
  });
  it.each(['missing_baseline', 'duplicate_id', 'duplicate_label', 'protocol', 'one_run', 'unknown_property'])('rejects ambiguous/incompatible %s input', mode => {
    const data = input();
    if (mode === 'missing_baseline') data.baselineRunId = 'absent';
    if (mode === 'duplicate_id') data.runs[1].predictions.run.id = 'baseline';
    if (mode === 'duplicate_label') data.runs[1].label = 'BASELINE';
    if (mode === 'protocol') data.runs[1].protocolSha256 = '0'.repeat(64);
    if (mode === 'one_run') data.runs.pop();
    expect(() => comparePredictions(pilot(), mode === 'unknown_property' ? { ...data, approved: true } : data)).toThrow();
  });
  it.each(['corpus', 'case', 'field', 'provenance'])('reuses strict scorer validation for %s mismatches', mode => {
    const data = input(), output = data.runs[1].predictions;
    if (mode === 'corpus') output.inputCorpusSha256 = '0'.repeat(64);
    if (mode === 'case') output.cases.pop();
    if (mode === 'field') output.cases[0].findings.push(structuredClone(output.cases[0].findings[0]));
    if (mode === 'provenance') { data.runs.forEach(row => { row.predictions.run.origin = 'model'; }); }
    expect(() => compare(data)).toThrow();
  });
  it('keeps simulated harness runs separate from declared executions', () => {
    const data = input(); declareModel(data.runs[1].predictions);
    expect(() => compare(data)).toThrow('separately');
  });
  it.each(['promptVersion', 'schemaVersion'] as const)('rejects mismatched model %s declarations', field => {
    const data = input(); data.runs.forEach(row => declareModel(row.predictions));
    data.runs[1].predictions.run.artifact![field] = 'different';
    expect(() => compare(data)).toThrow('matching declared');
  });
  it('compares model and actual-template declarations while retaining their separate origins', () => {
    const data = input(); declareModel(data.runs[0].predictions); data.runs[1].predictions.run.origin = 'template';
    const report = compare(data);
    expect(report.evidence).toBe('declared_run_outputs');
    expect(report.runs.map(run => run.report.run.origin)).toEqual(['model', 'template']);
    expect(report.promotion).toBe('not_assessed');
  });
});

describe('paired measurements and readable artifacts', () => {
  it('uses only jointly measured cases and preserves genuinely measured zero', () => {
    const data = input(); data.runs.forEach(row => declareModel(row.predictions));
    const [baseline, candidate] = data.runs.map(row => row.predictions);
    baseline.cases[0].elapsedMs = 100; candidate.cases[0].elapsedMs = 80;
    baseline.cases[1].elapsedMs = 500; // Unpaired values must not distort the comparison.
    baseline.cases[2].elapsedMs = 0; candidate.cases[2].elapsedMs = 0;
    baseline.cases[0].peakMemoryBytes = 10; candidate.cases[0].peakMemoryBytes = 20;
    expect(compare(data).comparisons[0].pairedMeasurements).toMatchObject({ timingCases: 2, memoryCases: 1,
      baselineMeanElapsedMs: 50, candidateMeanElapsedMs: 40, meanElapsedMsDelta: -10,
      baselineMeanPeakMemoryBytes: 10, candidateMeanPeakMemoryBytes: 20 });
  });
  it('leaves timing/memory comparisons unavailable for different environments', () => {
    const data = input(); data.runs.forEach(row => declareModel(row.predictions));
    data.runs[0].predictions.cases[0].elapsedMs = 1; data.runs[1].predictions.cases[0].elapsedMs = 2;
    data.runs[1].predictions.run.environment = 'Other declared hardware';
    expect(compare(data).comparisons[0].pairedMeasurements).toMatchObject({ evidence: 'unavailable', timingCases: 0,
      baselineMeanElapsedMs: null, candidateMeanElapsedMs: null, meanElapsedMsDelta: null });
  });
  it('never derives performance evidence from simulated measurement numbers', () => {
    const data = input(); data.runs.forEach(row => { row.predictions.cases[0].elapsedMs = 1; row.predictions.cases[0].peakMemoryBytes = 1; });
    const report = compare(data);
    expect(report.comparisons[0].pairedMeasurements.timingCases).toBe(0);
    expect(report.runs.every(row => row.report.measurements.peakMemoryBytes === null)).toBe(true);
  });
  it('escapes labels that could create markup, links, or additional table cells', () => {
    const data = input(); data.runs[1].label = '<script>alert(1)</script>|[link](https://invalid.example)\nextra';
    const markdown = comparisonMarkdown(compare(data));
    expect(markdown).not.toContain('<script>'); expect(markdown).not.toContain('[link]');
    expect(markdown).toContain('&#124;'); expect(markdown).toContain('harness_only'); expect(markdown).toContain('Unavailable');
  });
  it('writes a readable report with hash-bound artifacts and preserves existing outputs', async () => {
    const folder = await temp(), output = join(folder, 'report');
    const report = compare(); await writeComparison(output, report);
    const manifest = JSON.parse(await readFile(join(output, 'manifest.json'), 'utf8'));
    for (const artifact of manifest.artifacts) expect(sha256(await readFile(join(output, artifact.name)))).toBe(artifact.sha256);
    const json = await readFile(join(output, 'comparison.json'), 'utf8');
    expect(JSON.parse(json)).toEqual(report);
    expect(await readFile(join(output, 'comparison.md'), 'utf8')).toContain('18/18');
    await expect(writeComparison(output, report)).rejects.toThrow();
    expect(await readFile(join(output, 'comparison.json'), 'utf8')).toBe(json);
  });
});

describe('comparison CLI and holdout boundary', () => {
  async function files(corpus = pilot()) {
    const folder = await temp(), baseline = predictions(corpus, 'baseline'), candidate = predictions(corpus, 'candidate');
    await writeFile(join(folder, 'corpus.json'), serialize(corpus));
    await writeFile(join(folder, 'baseline.json'), serialize(baseline)); await writeFile(join(folder, 'candidate.json'), serialize(candidate));
    const manifest = { schemaVersion: 'eval-01-comparison-files/v1', baselineRunId: 'baseline', runs: [
      { label: 'Fictional baseline', protocolSha256, predictionsFile: 'baseline.json' },
      { label: 'Fictional candidate', protocolSha256, predictionsFile: 'candidate.json' },
    ] };
    await writeFile(join(folder, 'runs.json'), serialize(manifest));
    return { folder, corpus, manifest, args: ['compare', '--corpus', join(folder, 'corpus.json'), '--runs', join(folder, 'runs.json'), '--out', join(folder, 'report')] };
  }
  it('requires complete, non-repeated options while leaving release optional for development', () => {
    expect(parseArgs(['compare', '--corpus', 'c', '--runs', 'r', '--out', 'o']).command).toBe('compare');
    expect(() => parseArgs(['compare', '--corpus', 'c', '--out', 'o'])).toThrow('runs');
    expect(() => parseArgs(['compare', '--corpus', 'c', '--runs', 'r', '--out', 'o', '--runs', 's'])).toThrow();
  });
  it('resolves prediction paths relative to the manifest and writes all report artifacts', async () => {
    const value = await files(), log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try { await main(value.args); } finally { log.mockRestore(); }
    const report = JSON.parse(await readFile(join(value.folder, 'report', 'comparison.json'), 'utf8'));
    expect(report).toMatchObject({ baselineRunId: 'baseline', evidence: 'harness_only', promotion: 'not_assessed' });
    expect(await readFile(join(value.folder, 'report', 'comparison.md'), 'utf8')).toContain('Fictional candidate');
  });
  it('creates no report directory after incompatible input or an unreadable prediction file', async () => {
    const value = await files(); value.manifest.runs[1].protocolSha256 = '0'.repeat(64);
    await writeFile(join(value.folder, 'runs.json'), serialize(value.manifest));
    await expect(main(value.args)).rejects.toThrow('protocol');
    await expect(stat(join(value.folder, 'report'))).rejects.toThrow();
    value.manifest.runs[1].predictionsFile = 'missing.json';
    await writeFile(join(value.folder, 'runs.json'), serialize(value.manifest));
    await expect(main(value.args)).rejects.toThrow();
    await expect(stat(join(value.folder, 'report'))).rejects.toThrow();
  });
  it('requires the original frozen commitment for holdout comparison', async () => {
    const value = await files(privateFixture());
    await expect(main(value.args)).rejects.toThrow('requires --release');
    await expect(stat(join(value.folder, 'report'))).rejects.toThrow();
    const release = join(value.folder, 'release'), development = pilot();
    await writeBundle(release, freezeBundle(development, value.corpus, review(development, value.corpus), 'fixture-split'));
    const changed = structuredClone(value.corpus); changed.version = 'changed';
    await writeFile(join(value.folder, 'corpus.json'), serialize(changed));
    await expect(main([...value.args, '--release', release])).rejects.toThrow('commitment');
    await writeFile(join(value.folder, 'corpus.json'), serialize(value.corpus));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try { await main([...value.args, '--release', release]); } finally { log.mockRestore(); }
    expect(JSON.parse(await readFile(join(value.folder, 'report', 'comparison.json'), 'utf8'))).toMatchObject({
      use: 'reserved_holdout_evaluation', evidence: 'harness_only', promotion: 'not_assessed',
    });
  });
  it('rejects a development preview in place of a reviewed release', async () => {
    const value = await files(privateFixture());
    const developmentRelease = join(value.folder, 'development-preview');
    await writeBundle(developmentRelease, previewBundle(pilot()));
    await expect(main([...value.args, '--release', developmentRelease])).rejects.toThrow('commitment');
    await expect(stat(join(value.folder, 'report'))).rejects.toThrow();
  });
});
