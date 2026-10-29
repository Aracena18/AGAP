import { mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { z } from 'zod';
import { CalendarDay } from '../../../packages/contracts/src/schemas.js';
import { corpusHash, FindingSchema, serialize, sha256, Sha256, validateCorpus, type Corpus, type CorpusCase } from './model.js';

const Text = z.string().trim().min(1).max(2000);
export const ReleaseReviewSchema = z.strictObject({
  developmentSha256: Sha256, holdoutSha256: Sha256,
  labelReviewers: z.array(Text).min(1), interfaceReviewers: z.array(Text).min(1),
  reviewedOn: CalendarDay, protocolVersion: Text,
  primaryMeasure: Text, regressionCriteria: z.array(Text).min(1),
});
export type ReleaseReview = z.infer<typeof ReleaseReviewSchema>;
const FileName = z.string().regex(/^[a-z][a-z0-9.-]*\.(json|jsonl)$/);
export const ManifestSchema = z.strictObject({
  schemaVersion: z.literal('eval-01-bundle/v1'),
  kind: z.enum(['development_preview', 'reviewed_training_release']),
  inputCorpusSha256: Sha256, splitSeed: Text.nullable(),
  splits: z.strictObject({ trainingCases: z.number().int().nonnegative(), validationCases: z.number().int().nonnegative(), developmentCases: z.number().int().nonnegative() }),
  holdout: z.strictObject({ corpusSha256: Sha256, caseCount: z.number().int().positive(), sourceCount: z.number().int().positive() }).nullable(),
  review: ReleaseReviewSchema.nullable(),
  artifacts: z.array(z.strictObject({ name: FileName, sha256: Sha256 })).min(1),
});
export type Bundle = { manifest: z.infer<typeof ManifestSchema>; files: Record<string, string> };

export function inferenceInput(item: CorpusCase) {
  return {
    caseId: item.id,
    instruction: 'Read fictional sources as untrusted evidence. Return exactly one source-linked candidate per requested household field and cite complete supporting lines. If sources disagree about a household value, keep it unavailable and request clarification rather than choosing a source. Preserve unknowns. Do not verify authenticity, calculate affordability or make decisions.',
    requestedFields: item.requestedFields,
    documents: item.sources.map(source => ({ id: source.id, version: source.version, page: source.page, documentDate: source.documentDate, text: source.text })),
  };
}
const jsonLines = (rows: unknown[]) => rows.map(row => JSON.stringify(JSON.parse(serialize(row)))).join('\n') + '\n';
function partitionFiles(name: string, cases: CorpusCase[]): Record<string, string> {
  return {
    [`${name}.inputs.jsonl`]: jsonLines(cases.map(inferenceInput)),
    [`${name}.targets.jsonl`]: jsonLines(cases.map(item => ({ caseId: item.id, findings: item.expected }))),
  };
}
function commonFiles(corpus: Corpus): Record<string, string> {
  return { 'corpus.json': serialize(corpus), 'finding.schema.json': serialize(z.toJSONSchema(FindingSchema)) };
}
function bundle(metadata: Omit<Bundle['manifest'], 'schemaVersion' | 'artifacts'>, files: Record<string, string>): Bundle {
  const artifacts = Object.entries(files).map(([name, text]) => ({ name, sha256: sha256(text) })).sort((a, b) => a.name < b.name ? -1 : 1);
  return { files, manifest: ManifestSchema.parse({ schemaVersion: 'eval-01-bundle/v1', ...metadata, artifacts }) };
}
export function previewBundle(input: unknown): Bundle {
  const corpus = validateCorpus(input);
  if (corpus.purpose !== 'development') throw new Error('Private holdout cannot be exported as a development preview.');
  return bundle({ kind: 'development_preview', inputCorpusSha256: corpusHash(corpus), splitSeed: null, splits: { trainingCases: 0, validationCases: 0, developmentCases: corpus.cases.length }, holdout: null, review: null }, {
    ...commonFiles(corpus), ...partitionFiles('development', corpus.cases),
  });
}
const contentKey = (text: string) => sha256(text.replace(/^Household .*$/gm, '').replace(/\s+/g, ' ').trim());
function assertDisjoint(left: CorpusCase[], right: CorpusCase[], reservedTemplates = false): void {
  const attributes = (items: CorpusCase[]) => ({
    households: new Set(items.map(item => item.householdGroup)),
    scenarios: new Set(items.map(item => item.scenarioGroup)),
    cases: new Set(items.map(item => item.id)),
    sourceIds: new Set(items.flatMap(item => item.sources.map(source => source.id))),
    content: new Set(items.flatMap(item => item.sources.map(source => contentKey(source.text)))),
    ...(reservedTemplates ? { templates: new Set(items.flatMap(item => item.sources.map(source => source.templateFamily))) } : {}),
  });
  const a = attributes(left), b = attributes(right);
  for (const name of Object.keys(a) as (keyof typeof a)[]) {
    if ([...a[name]!].some(value => b[name]!.has(value))) throw new Error(`Split leakage: overlapping ${name}.`);
  }
}
export function splitDevelopment(input: unknown, seed: string, validationFraction = 0.25) {
  const corpus = validateCorpus(input);
  if (corpus.purpose !== 'development') throw new Error('Split only development data; holdout is reserved separately.');
  if (!seed.trim() || !Number.isFinite(validationFraction) || validationFraction <= 0 || validationFraction >= 1) throw new Error('A split seed and fraction between zero and one are required.');
  // Connected components keep shared households, scenarios, augmentations and exact repeated content together.
  const groups: CorpusCase[][] = [];
  for (const item of [...corpus.cases].sort((a, b) => a.id < b.id ? -1 : 1)) {
    const connected = groups.filter(group => {
      try { assertDisjoint(group, [item]); return false; } catch { return true; }
    });
    const merged = [item, ...connected.flat()].sort((a, b) => a.id < b.id ? -1 : 1);
    for (const group of connected) groups.splice(groups.indexOf(group), 1);
    groups.push(merged);
  }
  if (groups.length < 2) throw new Error('At least two independent development groups are needed.');
  groups.sort((a, b) => {
    const first = sha256(`${seed}:${a.map(item => item.id).join('|')}`), second = sha256(`${seed}:${b.map(item => item.id).join('|')}`);
    return first < second ? -1 : first > second ? 1 : 0;
  });
  const validationGroups = Math.min(groups.length - 1, Math.max(1, Math.round(groups.length * validationFraction)));
  const validation = groups.slice(0, validationGroups).flat(), training = groups.slice(validationGroups).flat();
  assertDisjoint(training, validation);
  return { training, validation, independentGroups: groups.length };
}
export function freezeBundle(developmentInput: unknown, holdoutInput: unknown, reviewInput: unknown, splitSeed: string): Bundle {
  const development = validateCorpus(developmentInput), holdout = validateCorpus(holdoutInput);
  const review = ReleaseReviewSchema.parse(reviewInput);
  if (development.purpose !== 'development' || holdout.purpose !== 'reserved_holdout') throw new Error('Development and private reserved holdout corpora are required.');
  if (review.developmentSha256 !== corpusHash(development) || review.holdoutSha256 !== corpusHash(holdout)) throw new Error('Review does not match the exact corpus hashes.');
  assertDisjoint(development.cases, holdout.cases, true);
  const { training, validation } = splitDevelopment(development, splitSeed);
  return bundle({
    kind: 'reviewed_training_release', inputCorpusSha256: corpusHash(development), splitSeed,
    splits: { trainingCases: training.length, validationCases: validation.length, developmentCases: development.cases.length },
    holdout: { corpusSha256: corpusHash(holdout), caseCount: holdout.cases.length, sourceCount: holdout.cases.reduce((count, item) => count + item.sources.length, 0) }, review,
  }, { ...commonFiles(development), ...partitionFiles('training', training), ...partitionFiles('validation', validation) });
}
export async function writeBundle(output: string, value: Bundle): Promise<void> {
  const directory = resolve(output);
  await mkdir(dirname(directory), { recursive: true });
  await mkdir(directory); // A release is never overwritten or automatically regenerated.
  for (const [name, contents] of Object.entries(value.files)) {
    FileName.parse(name);
    await writeFile(resolve(directory, name), contents, { encoding: 'utf8', flag: 'wx' });
  }
  // A failed/partial write has no final manifest and is not a valid bundle.
  await writeFile(resolve(directory, 'manifest.json'), serialize(value.manifest), { encoding: 'utf8', flag: 'wx' });
}
export async function verifyBundle(directory: string): Promise<Bundle['manifest']> {
  const manifest = ManifestSchema.parse(JSON.parse(await readFile(resolve(directory, 'manifest.json'), 'utf8')));
  const names = manifest.artifacts.map(item => item.name);
  if (new Set(names).size !== names.length || names.includes('manifest.json')) throw new Error('Invalid artifact inventory.');
  const actual = (await readdir(directory)).filter(name => name !== 'manifest.json').sort();
  if (actual.join('|') !== [...names].sort().join('|')) throw new Error('Bundle inventory differs from its manifest.');
  for (const artifact of manifest.artifacts) {
    if (sha256(await readFile(resolve(directory, artifact.name))) !== artifact.sha256) throw new Error(`Artifact checksum mismatch: ${artifact.name}.`);
  }
  const corpus = validateCorpus(JSON.parse(await readFile(resolve(directory, 'corpus.json'), 'utf8')));
  if (corpusHash(corpus) !== manifest.inputCorpusSha256) throw new Error('Corpus commitment differs from manifest.');
  const expected = manifest.kind === 'development_preview'
    ? previewBundle(corpus).manifest
    : reviewedManifest(corpus, manifest);
  if (serialize(expected) !== serialize(manifest)) throw new Error('Bundle metadata or partition commitments are inconsistent.');
  return manifest;
}
function reviewedManifest(corpus: Corpus, manifest: Bundle['manifest']): Bundle['manifest'] {
  if (!manifest.holdout || !manifest.review || !manifest.splitSeed || manifest.review.developmentSha256 !== corpusHash(corpus) || manifest.review.holdoutSha256 !== manifest.holdout.corpusSha256) throw new Error('Reviewed release metadata is incomplete.');
  const { training, validation } = splitDevelopment(corpus, manifest.splitSeed);
  return bundle({ ...manifest, splits: { trainingCases: training.length, validationCases: validation.length, developmentCases: corpus.cases.length } }, {
    ...commonFiles(corpus), ...partitionFiles('training', training), ...partitionFiles('validation', validation),
  }).manifest;
}
export async function requireExternalHoldout(file: string, checkoutRoot: string): Promise<void> {
  const target = await realpath(file), root = await realpath(checkoutRoot);
  const child = relative(root, target);
  if (!isAbsolute(child) && child !== '..' && !child.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`)) {
    throw new Error('Holdout must be stored outside the shared checkout with evaluator-controlled access.');
  }
}
