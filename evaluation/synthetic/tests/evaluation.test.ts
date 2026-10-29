import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { freezeBundle, inferenceInput, previewBundle, requireExternalHoldout, splitDevelopment, verifyBundle, writeBundle, type ReleaseReview } from '../src/bundle.js';
import { main, parseArgs } from '../src/cli.js';
import { corpusHash, serialize, sha256, stableId, validateCorpus, type Corpus, type Predictions } from '../src/model.js';
import { developmentPilot } from '../src/pilot.js';
import { documentHtml } from '../src/render.js';
import { scorePredictions } from '../src/score.js';

const pilot = () => developmentPilot();
const temporary: string[] = [];
async function temp() {
  const folder = await mkdtemp(join(tmpdir(), 'agap-eval01-'));
  temporary.push(folder);
  return folder;
}
afterAll(async () => {
  const base = await realpath(tmpdir());
  for (const folder of temporary) {
    const target = await realpath(folder), child = relative(base, target);
    if (!child || isAbsolute(child) || child.startsWith('..') || !child.startsWith('agap-eval01-')) throw new Error('Refusing cleanup outside the named test directory.');
    await rm(target, { recursive: true });
  }
});
function predictions(corpus = pilot()): Predictions {
  return {
    schemaVersion: 'eval-01-predictions/v1', inputCorpusSha256: corpusHash(corpus),
    run: { id: 'hand-authored-harness-fixture', origin: 'simulated', artifact: null, environment: 'Fictional test outputs; no model executed.' },
    cases: corpus.cases.map(item => ({ caseId: item.id, findings: structuredClone(item.expected), elapsedMs: null, peakMemoryBytes: null })),
  };
}
// All private/review records here are fictional unit fixtures. They are never exported as an actual frozen corpus/review.
function privateFixture(): Corpus {
  const value = pilot();
  value.id = 'private-fixture'; value.purpose = 'reserved_holdout';
  value.provenance = { method: 'private_authored', seed: 'PRIVATE-FIXTURE-SEED', authoredOn: '2026-10-29' };
  value.cases = value.cases.slice(0, 1);
  const item = value.cases[0];
  item.id = 'private-fixture-case'; item.householdGroup = 'private-fixture-household'; item.scenarioGroup = 'private-fixture-scenario';
  const source = item.sources[0], oldId = source.id;
  source.id = stableId('PRIVATE-FIXTURE-IDENTITY'); source.templateFamily = 'private-fixture-template';
  source.text = source.text.replace('Household ev-01', 'Household PRIVATE-FIXTURE-TEXT').replace('Monthly payslip.', 'Distinct private fixture statement.');
  source.sha256 = sha256(source.text);
  for (const finding of item.expected) for (const citation of finding.sources) if (citation.sourceId === oldId) citation.sourceId = source.id;
  return validateCorpus(value);
}
function review(development: Corpus, holdout: Corpus): ReleaseReview {
  return {
    developmentSha256: corpusHash(development), holdoutSha256: corpusHash(holdout),
    labelReviewers: ['Fictional unit-test label reviewer'], interfaceReviewers: ['Fictional unit-test interface reviewer'],
    reviewedOn: '2026-10-29', protocolVersion: 'fictional-test-protocol', primaryMeasure: 'Fixture-only exact structured fields', regressionCriteria: ['Fixture-only source and unsupported-value error checks'],
  };
}

describe('fictional corpus validation', () => {
  it('reproduces records and identities with the same seed, without producing a holdout', () => {
    expect(serialize(pilot())).toBe(serialize(pilot()));
    expect(pilot().cases).toHaveLength(12);
    expect(pilot().purpose).toBe('development');
    expect(developmentPilot('other-development-seed').cases[0].sources[0].id).not.toBe(pilot().cases[0].sources[0].id);
  });
  it('binds source bytes to checksums', () => {
    const corpus = pilot(); corpus.cases[0].sources[0].text += 'Changed record';
    expect(() => validateCorpus(corpus)).toThrow('checksum');
  });
  it.each([-1, 0.1, Number.MAX_SAFE_INTEGER + 1, Infinity])('rejects invalid amount %s', amount => {
    const corpus = pilot(); corpus.cases[0].expected[0].value = { availability: 'recorded', amountCentavos: amount };
    expect(() => validateCorpus(corpus)).toThrow();
  });
  it('rejects invalid calendar days', () => {
    const corpus = pilot(); corpus.cases[0].expected[0].cashDate = '2026-02-30';
    expect(() => validateCorpus(corpus)).toThrow();
  });
  it('rejects fabricated citations, stale source versions and pages', () => {
    for (const change of [
      (corpus: Corpus) => { corpus.cases[0].expected[0].sources[0].excerpt = 'Invented source sentence'; },
      (corpus: Corpus) => { corpus.cases[0].expected[0].sources[0].sourceVersion = 2; },
      (corpus: Corpus) => { corpus.cases[0].expected[0].sources[0].page = 2; },
    ]) {
      const corpus = pilot(); change(corpus);
      expect(() => validateCorpus(corpus)).toThrow('source reference');
    }
  });
  it('rejects missing expected fields and duplicate identities', () => {
    const missing = pilot(); missing.cases[0].expected.pop();
    expect(() => validateCorpus(missing)).toThrow('cover requested fields');
    const duplicate = pilot(); duplicate.cases.push(structuredClone(duplicate.cases[0]));
    expect(() => validateCorpus(duplicate)).toThrow('Duplicate case');
    const field = pilot(); field.cases[0].expected.push(structuredClone(field.cases[0].expected[0]));
    expect(() => validateCorpus(field)).toThrow('Duplicate expected field');
  });
  it('keeps uncertain missing values out of extraction', () => {
    const corpus = pilot(); corpus.cases[2].expected[0].action = 'extract';
    expect(() => validateCorpus(corpus)).toThrow('supported recorded value');
  });
  it('requires a concrete clarification question in the expected labels', () => {
    const corpus = pilot(); corpus.cases[2].expected[0].question = null;
    expect(() => validateCorpus(corpus)).toThrow('explicit question');
  });
  it('requires visibly fictional sources', () => {
    const corpus = pilot(), source = corpus.cases[0].sources[0];
    source.text = source.text.replace('FICTIONAL', 'Unlabeled'); source.sha256 = sha256(source.text);
    expect(() => validateCorpus(corpus)).toThrow('visibly fictional');
  });
  it('rejects augmentation cycles and cross-family ancestry', () => {
    const cycle = pilot(); cycle.cases[0].sources[0].augmentationOf = cycle.cases[0].sources[0].id;
    expect(() => validateCorpus(cycle)).toThrow('Cyclic');
    const cross = pilot(); cross.cases[0].sources[0].augmentationOf = cross.cases[1].sources[0].id;
    expect(() => validateCorpus(cross)).toThrow('household/scenario');
  });
  it('cannot turn the public recipe into a reserved holdout', () => {
    const corpus = pilot(); corpus.purpose = 'reserved_holdout';
    expect(() => validateCorpus(corpus)).toThrow('public development recipe');
  });
});

describe('grouped exports and release commitments', () => {
  it('keeps related repayment counterfactuals in one partition', () => {
    const split = splitDevelopment(pilot(), 'split-v1');
    const containing11 = split.training.some(item => item.id === 'ev-11') ? split.training : split.validation;
    expect(containing11.map(item => item.id)).toContain('ev-12');
    expect(split.independentGroups).toBe(11);
    expect(split.training.length + split.validation.length).toBe(12);
  });
  it('does not let input order change group assignment', () => {
    const a = pilot(), b = pilot(); b.cases.reverse();
    expect(splitDevelopment(a, 'fixed')).toEqual(splitDevelopment(b, 'fixed'));
  });
  it('groups transitive household/scenario links', () => {
    const corpus = pilot();
    corpus.cases[1].householdGroup = corpus.cases[0].householdGroup;
    corpus.cases[2].scenarioGroup = corpus.cases[1].scenarioGroup;
    const split = splitDevelopment(corpus, 'transitive');
    const ids = (split.training.some(item => item.id === 'ev-01') ? split.training : split.validation).map(item => item.id);
    expect(ids).toEqual(expect.arrayContaining(['ev-01', 'ev-02', 'ev-03']));
  });
  it('keeps repeated source content together despite different family labels', () => {
    const corpus = pilot(), copy = structuredClone(corpus.cases[0]);
    copy.id = 'repeated-case'; copy.householdGroup = 'repeated-household'; copy.scenarioGroup = 'repeated-scenario';
    copy.sources[0].id = stableId('repeated-copy');
    copy.sources[0].text = copy.sources[0].text.replace('Household ev-01', 'Household alternate-label');
    copy.sources[0].sha256 = sha256(copy.sources[0].text);
    for (const finding of copy.expected) finding.sources[0].sourceId = copy.sources[0].id;
    corpus.cases.push(copy);
    const split = splitDevelopment(corpus, 'repeated');
    const ids = (split.training.some(item => item.id === 'ev-01') ? split.training : split.validation).map(item => item.id);
    expect(ids).toContain('repeated-case');
    expect(split.independentGroups).toBe(11);
  });
  it('rejects empty seeds, invalid ratios and a single connected group', () => {
    expect(() => splitDevelopment(pilot(), '')).toThrow();
    expect(() => splitDevelopment(pilot(), 'x', NaN)).toThrow();
    const corpus = pilot(); for (const item of corpus.cases) item.householdGroup = 'same-household';
    expect(() => splitDevelopment(corpus, 'x')).toThrow('two independent');
  });
  it('exports only requested inputs, excluding targets and evaluator metadata', () => {
    const item = pilot().cases[0], input = inferenceInput(item);
    expect(Object.keys(input).sort()).toEqual(['caseId', 'documents', 'instruction', 'requestedFields']);
    expect(JSON.stringify(input)).not.toMatch(/"(expected|rationale|coverage|seed|templateFamily|householdGroup|scenarioGroup)"/);
    expect(previewBundle(pilot()).manifest.kind).toBe('development_preview');
    expect(previewBundle(pilot()).manifest.review).toBeNull();
    expect(() => previewBundle(privateFixture())).toThrow('Private holdout');
  });
  it('requires reviews bound to the exact corpora', () => {
    const corpus = pilot(), holdout = privateFixture();
    expect(() => freezeBundle(corpus, holdout, {}, 'split')).toThrow();
    const stale = review(corpus, holdout); stale.developmentSha256 = '0'.repeat(64);
    expect(() => freezeBundle(corpus, holdout, stale, 'split')).toThrow('exact corpus hashes');
  });
  it.each(['household', 'scenario', 'template', 'content'])('rejects development/holdout %s overlap', mode => {
    const corpus = pilot(), holdout = privateFixture();
    const held = holdout.cases[0], original = corpus.cases[0];
    if (mode === 'household') held.householdGroup = original.householdGroup;
    if (mode === 'scenario') held.scenarioGroup = original.scenarioGroup;
    if (mode === 'template') held.sources[0].templateFamily = original.sources[0].templateFamily;
    if (mode === 'content') { held.sources[0].text = original.sources[0].text; held.sources[0].sha256 = original.sources[0].sha256; }
    expect(() => freezeBundle(corpus, holdout, review(corpus, holdout), 'split')).toThrow('Split leakage');
  });
  it('exports holdout commitments without its text, seed, IDs or answers', () => {
    const corpus = pilot(), holdout = privateFixture();
    const result = freezeBundle(corpus, holdout, review(corpus, holdout), 'split');
    expect(result.manifest.holdout?.corpusSha256).toBe(corpusHash(holdout));
    expect(JSON.stringify(result)).not.toContain('PRIVATE-FIXTURE');
    expect(JSON.stringify(result)).not.toContain('private-fixture-case');
    expect(result.manifest.splits.trainingCases + result.manifest.splits.validationCases).toBe(12);
  });
  it('verifies exact artifact inventories and detects modified target files', async () => {
    const folder = await temp(), directory = join(folder, 'preview');
    await writeBundle(directory, previewBundle(pilot()));
    expect((await verifyBundle(directory)).kind).toBe('development_preview');
    await expect(writeBundle(directory, previewBundle(pilot()))).rejects.toThrow();
    await writeFile(join(directory, 'development.targets.jsonl'), '{}\n');
    await expect(verifyBundle(directory)).rejects.toThrow('checksum mismatch');
  });
  it('verifies reviewed partitions and rejects extra files and altered split metadata', async () => {
    const folder = await temp(), directory = join(folder, 'release'), corpus = pilot(), holdout = privateFixture();
    await writeBundle(directory, freezeBundle(corpus, holdout, review(corpus, holdout), 'split'));
    expect((await verifyBundle(directory)).kind).toBe('reviewed_training_release');
    await writeFile(join(directory, 'extra.json'), '{}');
    await expect(verifyBundle(directory)).rejects.toThrow('inventory');
    await rm(join(directory, 'extra.json'));
    const manifest = JSON.parse(await readFile(join(directory, 'manifest.json'), 'utf8'));
    manifest.splits.trainingCases++;
    await writeFile(join(directory, 'manifest.json'), serialize(manifest));
    await expect(verifyBundle(directory)).rejects.toThrow('inconsistent');
  });
  it('refuses a private file in the shared checkout even if it is ignored', async () => {
    await expect(requireExternalHoldout(resolve('package.json'), process.cwd())).rejects.toThrow('outside the shared checkout');
    const folder = await temp(), file = join(folder, 'private.json');
    await writeFile(file, '{}');
    await expect(requireExternalHoldout(file, process.cwd())).resolves.toBeUndefined();
  });
});

describe('independent structured scoring', () => {
  it('labels gold fixtures as harness evidence and leaves unmeasured performance null', () => {
    const output = predictions();
    output.cases[0].elapsedMs = 0; output.cases[0].peakMemoryBytes = 0;
    const result = scorePredictions(pilot(), output);
    expect(result.exactFieldAccuracy).toBe(1);
    expect(result.evidence).toBe('harness_only');
    expect(result.use).toBe('development_diagnostics');
    expect(result.promotion).toBe('not_assessed');
    expect(result.measurements).toMatchObject({ timingCases: 0, meanElapsedMs: null, memoryCases: 0, peakMemoryBytes: null });
  });
  it('penalizes inventing zero for a missing school cost while retaining an explicit transport zero', () => {
    const output = predictions(), row = output.cases.find(item => item.caseId === 'ev-03')!;
    row.findings[0].value = { availability: 'recorded', amountCentavos: 0 };
    const result = scorePredictions(pilot(), output);
    expect(result.counts.amountOrAvailabilityErrors).toBe(1);
    expect(result.counts.unsupportedRecordedValues).toBe(1);
    expect(result.errors).toEqual([{ caseId: 'ev-03', field: 'school_cost', problems: ['amount_or_availability'] }]);
  });
  it('reports wrong amounts, dates, recurrence and source/action errors independently', () => {
    const output = predictions(), finding = output.cases[0].findings[0];
    finding.value = { availability: 'recorded', amountCentavos: 1 };
    finding.cashDate = '2026-10-21'; finding.recurrence = 'explicit_recurring'; finding.action = 'clarify';
    finding.sources[0].excerpt = 'FICTIONAL';
    const result = scorePredictions(pilot(), output);
    expect(result.counts).toMatchObject({ amountOrAvailabilityErrors: 1, dateErrors: 1, sourceErrors: 1, actionErrors: 1, recurrenceErrors: 1, unsupportedRecordedValues: 1 });
  });
  it('accepts a larger actual excerpt only if it contains the expected evidence', () => {
    const corpus = pilot(), output = predictions(corpus);
    output.cases[0].findings[0].sources[0].excerpt = corpus.cases[0].sources[0].text;
    expect(scorePredictions(corpus, output).counts.sourceErrors).toBe(0);
  });
  it('does not count an absent clarification question as a correct next action', () => {
    const output = predictions(); output.cases[2].findings[0].question = null;
    expect(scorePredictions(pilot(), output).counts.actionErrors).toBe(1);
  });
  it('keeps missing fields in the denominator and reports unsolicited financial findings', () => {
    const output = predictions(); output.cases[0].findings.pop();
    output.cases[0].findings.push({ ...structuredClone(output.cases[0].findings[0]), field: 'unrequested_money' });
    const result = scorePredictions(pilot(), output);
    expect(result.counts).toMatchObject({ missingFields: 1, extraFields: 1, unsupportedRecordedValues: 1 });
    expect(result.exactFieldAccuracy).toBeLessThan(1);
  });
  it.each(['missing', 'duplicate', 'unknown', 'wrong_corpus', 'duplicate_field'])('rejects %s result alignment', mode => {
    const output = predictions();
    if (mode === 'missing') output.cases.pop();
    if (mode === 'duplicate') output.cases.push(structuredClone(output.cases[0]));
    if (mode === 'unknown') output.cases[0].caseId = 'unseen';
    if (mode === 'wrong_corpus') output.inputCorpusSha256 = '0'.repeat(64);
    if (mode === 'duplicate_field') output.cases[0].findings.push(structuredClone(output.cases[0].findings[0]));
    expect(() => scorePredictions(pilot(), output)).toThrow();
  });
  it('requires canonical provenance for declared model runs and exposes partial measurement counts', () => {
    const output = predictions(); output.run.origin = 'model';
    expect(() => scorePredictions(pilot(), output)).toThrow('provenance');
    output.run.artifact = { baseModel: 'Fictional test model', baseRevision: 'a'.repeat(40), artifactSha256: null, promptVersion: 'test', schemaVersion: 'test', datasetManifestSha256: null, evaluationReference: 'Fictional test reference' };
    output.cases[0].elapsedMs = 10;
    expect(scorePredictions(pilot(), output).measurements).toMatchObject({ timingCases: 1, caseDenominator: 12, meanElapsedMs: 10, peakMemoryBytes: null });
  });
  it('rejects nonfinite measurements and unexpected authority fields', () => {
    const output = predictions(); output.cases[0].elapsedMs = Infinity;
    expect(() => scorePredictions(pilot(), output)).toThrow();
    output.cases[0].elapsedMs = Number.MAX_VALUE;
    expect(() => scorePredictions(pilot(), output)).toThrow();
    const authority = { ...predictions(), approved: true };
    expect(() => scorePredictions(pilot(), authority)).toThrow();
  });
});

describe('CLI and inert document rendering', () => {
  it('rejects misspelled, duplicate and incomplete options', () => {
    expect(parseArgs(['--help']).command).toBe('help');
    for (const args of [['train'], ['preview'], ['preview', '--out', 'a', '--out', 'b'], ['preview', '--unknown', 'x'], ['preview', '--out']]) {
      expect(() => parseArgs(args)).toThrow();
    }
  });
  it('produces verifiable previews and never writes a failed score as a report', async () => {
    const folder = await temp(), directory = join(folder, 'preview'), report = join(folder, 'report.json'), predictionFile = join(folder, 'predictions.json');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await main(['preview', '--out', directory]);
      await main(['validate', '--corpus', join(directory, 'corpus.json')]);
      await main(['verify', '--bundle', directory]);
      const bad = predictions(); bad.cases.pop();
      await writeFile(predictionFile, serialize(bad));
      await expect(main(['score', '--corpus', join(directory, 'corpus.json'), '--predictions', predictionFile, '--out', report])).rejects.toThrow();
      await expect(readFile(report)).rejects.toThrow();
    } finally { log.mockRestore(); }
  });
  it('escapes document instructions and markup as visible source text', () => {
    const html = documentHtml('FICTIONAL <script>alert("authority")</script> & text');
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&amp; text');
  });
  it('requires a verified frozen commitment before writing any private holdout report', async () => {
    const folder = await temp(), privateFile = join(folder, 'private.json'), predictionFile = join(folder, 'prediction.json');
    const corpus = privateFixture(), report = join(folder, 'report.json');
    await writeFile(privateFile, serialize(corpus));
    await writeFile(predictionFile, serialize(predictions(corpus)));
    await expect(main(['score', '--corpus', privateFile, '--predictions', predictionFile, '--out', report])).rejects.toThrow('requires --release');
    const release = join(folder, 'release'), development = pilot();
    await writeBundle(release, freezeBundle(development, corpus, review(development, corpus), 'split'));
    const changed = structuredClone(corpus); changed.version = 'v2';
    await writeFile(privateFile, serialize(changed));
    await expect(main(['score', '--corpus', privateFile, '--predictions', predictionFile, '--out', report, '--release', release])).rejects.toThrow('commitment');
    await expect(readFile(report)).rejects.toThrow();
    await writeFile(privateFile, serialize(corpus));
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try { await main(['score', '--corpus', privateFile, '--predictions', predictionFile, '--out', report, '--release', release]); }
    finally { log.mockRestore(); }
    expect(JSON.parse(await readFile(report, 'utf8'))).toMatchObject({ use: 'reserved_holdout_evaluation', evidence: 'harness_only', promotion: 'not_assessed' });
  });
});
