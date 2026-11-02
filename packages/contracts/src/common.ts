import { z } from 'zod';
import type { CalendarDate, Money } from '../../../src/domain/types.js';

export const CONTRACT_VERSION = '0.3.0';
export const Id = z.uuid();
export const MoneyAmount: z.ZodType<Money> = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const SignedMoney: z.ZodType<Money> = z.number().int().min(Number.MIN_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);
export const PositiveMoneyAmount: z.ZodType<Money> = z.number().int().min(1).max(Number.MAX_SAFE_INTEGER);
export const CalendarDay: z.ZodType<CalendarDate> = z.iso.date();
export const Instant = z.iso.datetime({ offset: true });
export const Version = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
export const Text = z.string().trim().min(1).max(2000);
export const RecordMode=z.enum(['fictional','real']);
export const Currency = z.literal('PHP');
export const Role = z.enum(['officer', 'verifier', 'reviewer', 'cashier', 'financial_authorizer', 'accountant', 'auditor', 'administrator']);
export type StaffRole = z.infer<typeof Role>;


export const FactValueSchema = z.discriminatedUnion('availability', [
  z.strictObject({ availability: z.literal('recorded'), amountCentavos: MoneyAmount }),
  z.strictObject({ availability: z.literal('unavailable'), reason: Text }),
]);

export const PolicyCheckSchema = z.strictObject({ policyId: z.string(), passed: z.boolean(), detail: Text, overridable: z.boolean() });

export const OfferSchema = z.strictObject({
  id: Id, productVersionId: Id, label: Text, principalCentavos: MoneyAmount, netReceivedCentavos: MoneyAmount, feesPaidSeparatelyCentavos: MoneyAmount,
  termMonths: z.number().int().positive(), payments: z.array(z.strictObject({ date: CalendarDay, amountCentavos: MoneyAmount })).min(1), available: z.boolean(),
});

export const SourceReferenceSchema = z.strictObject({sourceId:Id,sourceVersion:Version,excerpt:Text,page:z.number().int().positive().optional()});

export const ModelArtifactSchema = z.strictObject({
  baseModel:Text,baseRevision:z.string().regex(/^[a-f0-9]{40}$/),artifactSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  promptVersion:Text,schemaVersion:Text,datasetManifestSha256:z.string().regex(/^[a-f0-9]{64}$/).nullable(),evaluationReference:Text,
});

export const VerificationSchema = z.strictObject({ sourceId: Id, method: Text, outcome: z.enum(['supported', 'mismatch', 'unavailable']), checkedOn: CalendarDay, limitations: Text });
