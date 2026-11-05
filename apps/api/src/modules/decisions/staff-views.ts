import { DecisionCreateSchema, StaffDecisionWorkspaceSchema, StaffDecisionHistoryPageSchema, StaffDecisionBriefSchema } from '../../../../../packages/contracts/src/schemas.js';
import type { z } from 'zod';

/** Compatibility exports. Public presentation contracts have one canonical source. */
export const DecisionAction=DecisionCreateSchema.shape.outcome;
export const WorkspaceViewSchema=StaffDecisionWorkspaceSchema;
export const HistoryItemSchema=StaffDecisionHistoryPageSchema.shape.items.element;
export const HistoryPageSchema=StaffDecisionHistoryPageSchema;
export const SavedBriefSchema=StaffDecisionBriefSchema;
export type WorkspaceView=z.output<typeof WorkspaceViewSchema>;
export type HistoryPage=z.output<typeof HistoryPageSchema>;
export type SavedBrief=z.output<typeof SavedBriefSchema>;
