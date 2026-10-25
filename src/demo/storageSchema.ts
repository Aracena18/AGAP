import { z } from 'zod';
import type { CaseRecord } from '../domain/types';
import { isCalendarDate } from '../domain/format';

const date = z.string().refine(isCalendarDate);
const money = z.number().int().safe();
const nonnegative = money.nonnegative();
const actor = z.object({ name: z.string(), role: z.enum(['officer', 'reviewer']) });
const source = z.object({ id: z.string(), title: z.string(), kind: z.enum(['document', 'statement', 'worksheet']), date, excerpt: z.string() });
const fact = z.object({
  id: z.string(), label: z.string(), category: z.enum(['income', 'expense', 'obligation', 'opening']), value: nonnegative.nullable(),
  status: z.enum(['document-supported', 'member-reported', 'conflicting', 'missing']), sourceId: z.string().nullable(),
  effectiveDate: date, cashDate: date, critical: z.boolean(), alreadyDeducted: z.boolean(),
  candidates: z.array(z.object({ value: nonnegative, sourceId: z.string(), effectiveDate: date })).optional(),
});
const offer = z.object({
  id: z.string(), label: z.string(), principal: nonnegative, netReceived: nonnegative, feesPaidSeparately: nonnegative,
  termMonths: z.number().int().positive(), payments: z.array(z.object({ date, amount: nonnegative })).min(1),
  available: z.boolean(), policyNote: z.string(),
});
const recommendation = z.object({ offerId: z.string(), note: z.string(), actor, at: z.string(), caseVersion: z.number().int().positive() });
const input = z.object({
  outcome: z.enum(['approve', 'decline', 'return']), offerId: z.string().nullable(), rationale: z.string(), departureReason: z.string(),
  exceptions: z.array(z.object({ policyId: z.string(), reason: z.string() })), reviewDate: date, explanationReviewed: z.boolean(),
});
const assessment = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('complete'), caseVersion: z.number().int().positive(), calculationVersion: z.string(), warnings: z.array(z.string()),
    scenarios: z.array(z.object({
      offerId: z.string(), monthlyRemaining: money, lowestBalance: money, closingBalance: money,
      shortageDates: z.array(date), dailyBalances: z.array(z.object({
        date, balance: money, movements: z.array(z.object({ label: z.string(), amount: money, factId: z.string().optional(), sourceId: z.string().optional() })),
      })), totalRepayment: nonnegative, financingCost: money,
      policyChecks: z.array(z.object({ policyId: z.string(), label: z.string(), passed: z.boolean(), detail: z.string() })),
    })),
  }),
  z.object({ status: z.literal('incomplete'), caseVersion: z.number().int().positive(), calculationVersion: z.string(), issues: z.array(z.object({ factId: z.string(), message: z.string() })) }),
]);
const snapshot = z.object({
  id: z.string(), caseId: z.string(), caseVersion: z.number().int().positive(), memberName: z.string(), recordedAt: z.string(), reviewer: actor,
  input, periodStart: date, periodEnd: date, facts: z.array(fact), sources: z.array(source), offers: z.array(offer), recommendation: recommendation.nullable(), assessment,
  explanation: z.object({ origin: z.literal('template'), summary: z.string(), sections: z.array(z.object({ title: z.string(), body: z.string(), sourceIds: z.array(z.string()) })) }).optional(),
});
const record: z.ZodType<CaseRecord> = z.object({
  id: z.string(), member: z.object({ name: z.string(), initials: z.string(), occupation: z.string(), memberSince: z.string() }),
  purpose: z.string(), createdAt: z.string(), periodStart: date, periodEnd: date, version: z.number().int().positive(),
  facts: z.array(fact), sources: z.array(source), offers: z.array(offer).min(1),
  corrections: z.array(z.object({ id: z.string(), factId: z.string(), before: fact, after: fact, reason: z.string(), actor, at: z.string() })),
  recommendation: recommendation.nullable(), decisions: z.array(snapshot),
  followUp: z.object({ reviewDate: date, note: z.string(), updatedAt: z.string() }).nullable(),
});
export const storedWorkspaceSchema = z.object({ schemaVersion: z.literal(1), records: z.array(record).length(3) })
  .refine(value => ['AG-001', 'AG-002', 'AG-003'].every(id => value.records.filter(item => item.id === id).length === 1));
