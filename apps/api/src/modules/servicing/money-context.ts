import { z } from 'zod';
import { CalendarDay, Currency, FinancialCommandCreateSchema, FinancialCommandSchema, Id, Instant, MoneyAmount, PositiveMoneyAmount, Version } from '../../../../../packages/contracts/src/schemas.js';
import { Hash } from '../decisions/context.js';
import { AuthorizationSchema, ObservationSchema, SubmissionSchema } from './context.js';

/** Private versioned proposals. No canonical/public DTO is changed. */
export const PrincipalPolicySchema = z.strictObject({ format: z.literal('principal-only-v1'), versionId: Id,
  organizationId: Id, productVersionId: Id, effectiveFrom: CalendarDay, effectiveThrough: CalendarDay,
  interestCentavos: z.literal(0), feesCentavos: z.literal(0), graceDays: z.literal(0), allocation: z.literal('scheduled-exact'),
  cashAccountId: Id, principalAccountId: Id, releaseRuleId: Id, repaymentRuleId: Id,
}).refine(p => p.effectiveFrom <= p.effectiveThrough && p.cashAccountId !== p.principalAccountId, 'Invalid principal-only policy.');
export const PostedResultSchema = z.strictObject({ eventId: Id, commandId: Id, loanId: Id, kind: z.enum(['disbursement', 'repayment']),
  amountCentavos: PositiveMoneyAmount, currency: Currency, effectiveDate: CalendarDay, postedAt: Instant,
  journalId: Id, receiptId: Id.nullable(), principalAfterCentavos: MoneyAmount, postingRuleVersionId: Id });
export const MoneyCommandSchema = z.strictObject({ format: z.literal('servicing-command-v2'), id: Id,
  organizationId: Id, branchId: Id, applicationId: Id, loanId: Id, kind: z.enum(['disbursement', 'repayment']),
  eventId: Id, providerKey: Id, payload: FinancialCommandCreateSchema, payloadHash: Hash, policy: PrincipalPolicySchema,
  preparedBy: Id, createdAt: Instant, scheduleIndex: z.number().int().nonnegative().nullable(), legacyVersion: Version.nullable(),
  version: Version, state: FinancialCommandSchema.shape.state, authorization: AuthorizationSchema.nullable(), submission: SubmissionSchema.nullable(),
  observations: z.array(ObservationSchema), conflicts: z.array(z.string()), posting: PostedResultSchema.nullable(), mode: z.literal('simulation'),
});
export const SafeMoneyCommandSchema = z.strictObject({ id: Id, kind: z.enum(['disbursement', 'repayment']), version: Version,
  state: FinancialCommandSchema.shape.state, amountCentavos: PositiveMoneyAmount, effectiveDate: CalendarDay, legacy: z.boolean() });
export const LoanViewSchema = z.strictObject({ loanId: Id, applicationId: Id, memberLabel: z.string(), state: z.enum(['active', 'settled']),
  asOfDate: CalendarDay, principalCentavos: MoneyAmount, interestDueCentavos: z.literal(0), feesDueCentavos: z.literal(0),
  overdueCentavos: MoneyAmount, postedThrough: Instant, pendingMovementCount: z.number().int().nonnegative(),
  schedule: z.array(z.strictObject({ date: CalendarDay, amountCentavos: PositiveMoneyAmount })),
  receipts: z.array(PostedResultSchema), commands: z.array(SafeMoneyCommandSchema) });
export const LoanWorkspaceSchema = z.strictObject({ loanId: Id, organizationId: Id, branchId: Id, memberLabel: z.string(), position: LoanViewSchema.nullable(),
  commands: z.array(SafeMoneyCommandSchema), message: z.string(), nextPayment: z.strictObject({ date: CalendarDay, amountCentavos: PositiveMoneyAmount }).nullable() });
export type PrincipalPolicy = z.infer<typeof PrincipalPolicySchema>;
export type MoneyCommand = z.infer<typeof MoneyCommandSchema>;
export type PostedResult = z.infer<typeof PostedResultSchema>;
export type LoanView = z.infer<typeof LoanViewSchema>;
