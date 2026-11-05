import { z } from 'zod';
import { PilotPostedResult, PilotMoneyCommand, PilotLoanView } from '../../../../../packages/contracts/src/lifecycle.js';
import { CalendarDay, FinancialCommandCreateSchema, FinancialCommandSchema, Id, Instant, Version } from '../../../../../packages/contracts/src/schemas.js';
import { Hash } from '../decisions/context.js';
import { AuthorizationSchema, ObservationSchema, SubmissionSchema } from './context.js';

/** Private versioned proposals. No canonical/public DTO is changed. */
export const PrincipalPolicySchema = z.strictObject({ format: z.literal('principal-only-v1'), versionId: Id,
  organizationId: Id, productVersionId: Id, effectiveFrom: CalendarDay, effectiveThrough: CalendarDay,
  interestCentavos: z.literal(0), feesCentavos: z.literal(0), graceDays: z.literal(0), allocation: z.literal('scheduled-exact'),
  cashAccountId: Id, principalAccountId: Id, releaseRuleId: Id, repaymentRuleId: Id,
}).refine(p => p.effectiveFrom <= p.effectiveThrough && p.cashAccountId !== p.principalAccountId, 'Invalid principal-only policy.');
export const PostedResultSchema = PilotPostedResult;
export const MoneyCommandSchema = z.strictObject({ format: z.literal('servicing-command-v2'), id: Id,
  organizationId: Id, branchId: Id, applicationId: Id, loanId: Id, kind: z.enum(['disbursement', 'repayment']),
  eventId: Id, providerKey: Id, payload: FinancialCommandCreateSchema, payloadHash: Hash, policy: PrincipalPolicySchema,
  preparedBy: Id, createdAt: Instant, scheduleIndex: z.number().int().nonnegative().nullable(), legacyVersion: Version.nullable(),
  version: Version, state: FinancialCommandSchema.shape.state, authorization: AuthorizationSchema.nullable(), submission: SubmissionSchema.nullable(),
  observations: z.array(ObservationSchema), conflicts: z.array(z.string()), posting: PostedResultSchema.nullable(), mode: z.literal('simulation'),
});
export const SafeMoneyCommandSchema = PilotMoneyCommand;
export const LoanViewSchema = PilotLoanView;
export { LoanWorkspaceSchema } from '../../../../../packages/contracts/src/schemas.js';
export type PrincipalPolicy = z.infer<typeof PrincipalPolicySchema>;
export type MoneyCommand = z.infer<typeof MoneyCommandSchema>;
export type PostedResult = z.infer<typeof PostedResultSchema>;
export type LoanView = z.infer<typeof LoanViewSchema>;
