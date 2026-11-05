import { lstat, readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { z } from 'zod';
import { CalendarDay } from '../../../packages/contracts/src/schemas.js';
import { corpusHash, Sha256, validateCorpus } from './model.js';
import { buildReviewPack, verifyReviewPack } from './review.js';

const Text = z.string().trim().min(1).max(4000);
const Decision = z.enum(['pending', 'accepted', 'changes_requested']);
const Comment = Text.nullable();
export const ReviewWorksheetSchema = z.strictObject({
  schemaVersion: z.literal('eval-01-review-worksheet/v1'), inputCorpusSha256: Sha256,
  status: z.enum(['pending', 'reviewed']), labelReviewer: Text.nullable(), interfaceReviewer: Text.nullable(), reviewedOn: CalendarDay.nullable(),
  cases: z.array(z.strictObject({ caseId: Text, fields: z.array(z.strictObject({ field: Text, decision: Decision, comment: Comment })), rationaleDecision: Decision, comment: Comment })),
  questions: z.array(z.strictObject({ id: Text, decision: Decision, comment: Comment })),
  releaseApproval: z.null(),
});
export type ReviewWorksheet = z.output<typeof ReviewWorksheetSchema>;

/** Validates declarations, not reviewer identity, semantic truth, private storage or release approval. */
export function assessReviewReadiness(input: unknown, value: unknown) {
  const corpus = validateCorpus(input), worksheet = ReviewWorksheetSchema.parse(value);
  if (corpus.purpose !== 'development') throw new Error('Review readiness accepts development material only.');
  if (worksheet.inputCorpusSha256 !== corpusHash(corpus)) throw new Error('Worksheet belongs to a different corpus version.');
  const expected: ReviewWorksheet = JSON.parse(buildReviewPack(corpus).files['review-worksheet.json']);
  function sameIds(actual: string[], required: string[], kind: string) {
    if (new Set(actual).size !== actual.length || [...actual].sort().join('|') !== [...required].sort().join('|')) throw new Error(`Worksheet ${kind} inventory differs from the bound review pack.`);
  }
  sameIds(worksheet.cases.map(c => c.caseId), expected.cases.map(c => c.caseId), 'case');
  sameIds(worksheet.questions.map(q => q.id), expected.questions.map(q => q.id), 'question');
  const issues: { path: string; code: string }[] = [];
  const add = (path: string, code: string) => issues.push({ path, code });
  const counts = { accepted: 0, pending: 0, changesRequested: 0 };
  function decision(path: string, state: z.output<typeof Decision>, comment: string | null, requireEvidence = false) {
    counts[state === 'changes_requested' ? 'changesRequested' : state]++;
    if (state !== 'accepted') add(path, state);
    if ((state === 'changes_requested' || (requireEvidence && state === 'accepted')) && comment === null) add(path, 'review_evidence_required');
  }
  for (const item of worksheet.cases) {
    const original = expected.cases.find(c => c.caseId === item.caseId)!;
    sameIds(item.fields.map(f => f.field), original.fields.map(f => f.field), `field/${item.caseId}`);
    for (const field of item.fields) decision(`cases/${item.caseId}/${field.field}`, field.decision, field.comment);
    decision(`cases/${item.caseId}/rationale`, item.rationaleDecision, item.comment);
  }
  for (const question of worksheet.questions) decision(`questions/${question.id}`, question.decision, question.comment, true);
  for (const field of ['labelReviewer', 'interfaceReviewer', 'reviewedOn'] as const) if (worksheet[field] === null) add(field, 'missing_review_metadata');
  if (worksheet.status !== 'reviewed') add('status', 'review_not_declared_complete');
  return {
    schemaVersion: 'eval-01-review-readiness/v1', inputCorpusSha256: worksheet.inputCorpusSha256,
    status: counts.changesRequested ? 'changes_requested' : issues.length ? 'pending' : 'declarations_complete', counts, issues,
    releaseReady: false, trainingRelease: false, promotion: 'not_assessed',
    limitations: [
      'Reviewer declarations are not authenticated identity, independent semantic approval or sufficient coverage.',
      'Reviewed release still requires the separate hash-bound approval, agreed protocol and protected independently authored holdout.',
      'This report neither executes models nor changes source labels, review packs or frozen releases.',
    ],
  };
}

export async function reviewReadiness(packDirectory: string, worksheetFile: string) {
  await verifyReviewPack(packDirectory);
  const folder = await realpath(packDirectory), file = await realpath(worksheetFile), child = relative(folder, file);
  if (!child || (!isAbsolute(child) && child!=='..' && !child.startsWith('..'+sep))) throw new Error('Use a separate worksheet copy outside the immutable review pack.');
  if (!(await lstat(worksheetFile)).isFile()) throw new Error('Worksheet must be a regular file, not a link.');
  return assessReviewReadiness(JSON.parse(await readFile(resolve(folder, 'development/corpus.json'), 'utf8')), JSON.parse(await readFile(file, 'utf8')));
}
