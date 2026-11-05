import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  CalendarDay, FactValueSchema, Id, ModelArtifactSchema,
  SourceReferenceSchema, Version,
} from '../../../packages/contracts/src/schemas.js';

const Key = z.string().regex(/^[a-z][a-z0-9_-]{0,99}$/);
export const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const Nonempty = z.string().trim().min(1).max(4000);
/** Frozen extraction interface, independent of later lending API additions.
 * Advancing the application version must not relabel a corpus or change its hash.
 */
export const CORPUS_CONTRACT_VERSION = '0.3.0';
export const FindingSchema = z.strictObject({
  field: Key,
  value: FactValueSchema,
  cashDate: CalendarDay.nullable(),
  relevance: z.enum(['supported', 'uncertain', 'not_applicable']),
  recurrence: z.enum(['one_time', 'explicit_recurring', 'unknown']),
  action: z.enum(['extract', 'clarify', 'abstain']),
  question: z.string().trim().min(1).max(2000).nullable(),
  sources: z.array(SourceReferenceSchema).min(1).max(20),
});
const SourceSchema = z.strictObject({
  id: Id, version: Version, page: z.number().int().min(1).max(100),
  documentDate: CalendarDay.nullable(), templateFamily: Key,
  augmentationOf: Id.nullable(), text: z.string().min(1).max(40000), sha256: Sha256,
});
const CaseSchema = z.strictObject({
  id: Key, householdGroup: Key, scenarioGroup: Key,
  coverage: z.array(Key).min(1), requestedFields: z.array(Key).min(1).max(50),
  sources: z.array(SourceSchema).min(1).max(20),
  expected: z.array(FindingSchema).min(1).max(50),
  rationale: Nonempty,
});
export const CorpusSchema = z.strictObject({
  schemaVersion: z.literal('eval-01-corpus/v1'), contractVersion: z.literal(CORPUS_CONTRACT_VERSION),
  id: Key, version: Key, purpose: z.enum(['development', 'reserved_holdout']),
  provenance: z.strictObject({
    method: z.enum(['public_development_recipe', 'private_authored']),
    seed: Nonempty.nullable(), authoredOn: CalendarDay,
  }),
  cases: z.array(CaseSchema).min(1).max(10000),
});
export type Corpus = z.infer<typeof CorpusSchema>;
export type CorpusCase = Corpus['cases'][number];
export type Finding = z.infer<typeof FindingSchema>;
export type Source = CorpusCase['sources'][number];

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}
export function serialize(value: unknown): string { return `${JSON.stringify(canonical(value), null, 2)}\n`; }
export function sha256(value: string | Uint8Array): string { return createHash('sha256').update(value).digest('hex'); }
export function corpusHash(corpus: Corpus): string { return sha256(serialize(corpus)); }
export function stableId(namespace: string): string {
  const scope = Buffer.from('d229e2d9835743dbaf44e25732135785', 'hex');
  const bytes = createHash('sha1').update(scope).update(namespace).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 15) | 80;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
function unique(items: string[], name: string) {
  if (new Set(items).size !== items.length) throw new Error(`Duplicate ${name}.`);
}
export function validateReferences(finding: Finding, sources: Source[]): void {
  const refs = new Set<string>();
  for (const ref of finding.sources) {
    const source = sources.find(item => item.id === ref.sourceId && item.version === ref.sourceVersion && item.page === (ref.page ?? 1));
    if (!source || !source.text.includes(ref.excerpt)) throw new Error(`Unsupported source reference for ${finding.field}.`);
    const key = `${ref.sourceId}:${ref.sourceVersion}:${ref.page ?? 1}:${ref.excerpt}`;
    if (refs.has(key)) throw new Error(`Duplicate citation for ${finding.field}.`);
    refs.add(key);
  }
}
export function validateCorpus(input: unknown): Corpus {
  const corpus = CorpusSchema.parse(input);
  if (corpus.purpose === 'reserved_holdout' && corpus.provenance.method !== 'private_authored') {
    throw new Error('Reserved holdout cannot use the public development recipe.');
  }
  unique(corpus.cases.map(item => item.id), 'case ID');
  const allSources = corpus.cases.flatMap(item => item.sources.map(source => ({ source, item })));
  unique(allSources.map(({ source }) => source.id), 'source ID');
  for (const item of corpus.cases) {
    unique(item.requestedFields, 'requested field');
    unique(item.expected.map(finding => finding.field), 'expected field');
    if ([...item.requestedFields].sort().join('|') !== item.expected.map(finding => finding.field).sort().join('|')) {
      throw new Error(`Expected findings must cover requested fields in ${item.id}.`);
    }
    for (const source of item.sources) {
      if (sha256(source.text) !== source.sha256) throw new Error(`Source checksum mismatch in ${item.id}.`);
      if (!source.text.includes('FICTIONAL')) throw new Error(`Source must be visibly fictional in ${item.id}.`);
      if (source.augmentationOf !== null) {
        const visited = new Set([source.id]);
        let parentId: string | null = source.augmentationOf;
        while (parentId !== null) {
          if (visited.has(parentId)) throw new Error('Cyclic source augmentation.');
          visited.add(parentId);
          const parent = allSources.find(entry => entry.source.id === parentId);
          if (!parent || parent.item.householdGroup !== item.householdGroup || parent.item.scenarioGroup !== item.scenarioGroup) {
            throw new Error('Augmented sources must stay in their household/scenario family.');
          }
          parentId = parent.source.augmentationOf;
        }
      }
    }
    for (const finding of item.expected) {
      validateReferences(finding, item.sources);
      if (finding.action === 'clarify' && finding.question === null) throw new Error(`Clarification needs an explicit question in ${item.id}.`);
      if (finding.action === 'extract' && (finding.value.availability !== 'recorded' || finding.relevance !== 'supported')) {
        throw new Error(`Extraction needs a supported recorded value in ${item.id}.`);
      }
      if (finding.relevance === 'uncertain' && finding.action === 'extract') throw new Error('Uncertain facts require clarification.');
    }
  }
  return corpus;
}

export const PredictionsSchema = z.strictObject({
  schemaVersion: z.literal('eval-01-predictions/v1'), inputCorpusSha256: Sha256,
  run: z.strictObject({
    id: Key, origin: z.enum(['model', 'template', 'simulated']),
    artifact: ModelArtifactSchema.nullable(), environment: Nonempty,
  }),
  cases: z.array(z.strictObject({
    caseId: Key, findings: z.array(FindingSchema).max(100),
    elapsedMs: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
    peakMemoryBytes: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable(),
  })).min(1),
});
export type Predictions = z.infer<typeof PredictionsSchema>;
