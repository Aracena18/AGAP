import { z } from 'zod';
import { ApplicationSchema, CalendarDay, DecisionSchema, Id, Instant, OfferSchema, ScenarioSchema, Text, Version } from '../../../../../packages/contracts/src/schemas.js';

/** Decision-owned consumer proposals, not registered canonical HTTP DTOs.
 * Browser imports are limited to these presentation types, never persistence types.
 */
export const DecisionAction = z.enum(['approve', 'decline', 'return']);
export const WorkspaceViewSchema = z.strictObject({
  application: ApplicationSchema, basisHash: z.string().regex(/^[a-f0-9]{64}$/),
  periodStart: CalendarDay, periodEnd: CalendarDay,
  assessment: z.strictObject({ id: Id, inputVersion: Version, state: z.enum(['complete', 'incomplete', 'unavailable', 'stale']), issues: z.array(Text) }).nullable(),
  offers: z.array(z.strictObject({ offer: OfferSchema, checked: ScenarioSchema.nullable(), recommend: z.boolean(), outcomes: z.array(DecisionAction) })),
  recommendation: z.strictObject({ id: Id, offerVersionId: Id, preparedBy: Id, preparedAt: Instant, reason: Text }).nullable(),
  canReturn: z.boolean(), blockedReason: Text.nullable(), currentDecisionId: Id.nullable(),
});
export const HistoryItemSchema = DecisionSchema.extend({ accepted: z.boolean() });
export const HistoryPageSchema = z.strictObject({ items: z.array(HistoryItemSchema), nextCursor: Id.nullable() });
export const SavedBriefSchema = z.strictObject({
  id: Id, applicationId: Id, memberName: z.string(), inputVersion: Version,
  recordedAt: Instant, reviewerId: Id, outcome: DecisionAction, explanation: Text, origin: z.enum(['template', 'manual']),
  reviewDate: CalendarDay, periodStart: CalendarDay, periodEnd: CalendarDay,
  considered: z.strictObject({ offer: OfferSchema, checked: ScenarioSchema }).nullable(),
  snapshotHash: z.string().regex(/^[a-f0-9]{64}$/),
  document: z.strictObject({ id: Id, sha256: z.string().regex(/^[a-f0-9]{64}$/) }).nullable(),
  sources: z.array(z.strictObject({ sourceId: Id, sourceVersion: Version, verification: z.enum(['supported', 'mismatch', 'unavailable']), effectiveDates: z.array(CalendarDay) })),
});
export type WorkspaceView = z.output<typeof WorkspaceViewSchema>;
export type HistoryPage = z.output<typeof HistoryPageSchema>;
export type SavedBrief = z.output<typeof SavedBriefSchema>;
