import { z } from 'zod';
import { ModelArtifactSchema } from './common.js';

/** Qualitative, untrusted Experiment F review; never a financial fact input. */
export const ModelReviewIssueCode = z.enum(['NO_ISSUE', 'DOCUMENT_DISCREPANCY', 'SOURCE_CONFLICT', 'ONE_OFF_EXPENSE', 'RECURRING_PATTERN', 'INSUFFICIENT_EVIDENCE']);
export const ModelReviewSource = z.strictObject({
  source_id: z.string().min(1).max(128).regex(/^[a-zA-Z0-9._:-]+$/),
  quote: z.string().min(1).max(6000).refine(value => value.trim().length > 0, 'Source text is required'),
});
export const ModelReviewInput = z.strictObject({
  question: z.string().min(1).max(1200).refine(value => value.trim().length > 0, 'A question is required'),
  sources: z.array(ModelReviewSource).min(1).max(12),
}).refine(input => new Set(input.sources.map(source => source.source_id)).size === input.sources.length, 'Duplicate source identifiers');
export const ModelReviewPayload = z.strictObject({
  issue_code: ModelReviewIssueCode,
  evidence: z.array(z.strictObject({
    source_id: ModelReviewSource.shape.source_id,
    quote: ModelReviewSource.shape.quote,
    verification_status: z.literal('source_asserted_not_independently_verified'),
  })).min(1).max(12),
  finding: z.string().min(1).max(2000),
  clarification_question: z.string().max(1200),
  review_status: z.literal('requires_human_review'),
  loan_decision: z.null(),
});
const common = {
  financial_semantics_verified: z.literal(false),
  loan_decision_permitted: z.literal(false),
  attempts_used: z.number().int().min(1).max(2).optional(),
};
export const ModelReviewResult = z.discriminatedUnion('status', [
  z.strictObject({ ...common, status: z.literal('REQUIRES_HUMAN_REVIEW'), reasons: z.array(z.string()).length(0), payload: ModelReviewPayload, source_text_match_verified: z.literal(true) }),
  z.strictObject({ ...common, status: z.literal('REJECT_AND_ESCALATE'), reasons: z.array(z.string().min(1).max(128)).min(1).max(32), payload: z.null() }),
]);
export type ModelReviewInput = z.output<typeof ModelReviewInput>;
export type ModelReviewResult = z.output<typeof ModelReviewResult>;
export interface ReviewAdapter {
  readonly origin: 'model' | 'simulated';
  readonly provenance: z.output<typeof ModelArtifactSchema>;
  review(input: ModelReviewInput, signal?: AbortSignal): Promise<ModelReviewResult>;
}
export type ModelReviewAdapter = ReviewAdapter;
export const modelReviewSchemas = { ModelReviewIssueCode, ModelReviewSource, ModelReviewInput, ModelReviewPayload, ModelReviewResult };
