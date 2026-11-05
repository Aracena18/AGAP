import { z } from 'zod';
import { CalendarDay, Currency, Id, Instant, MoneyAmount, Text } from './common.js';
export const TrialBalanceCreateSchema = z.strictObject({ fromDate: CalendarDay, throughDate: CalendarDay }).refine(value => {
    const days = (Date.parse(value.throughDate) - Date.parse(value.fromDate)) / 86400000;
    return days >= 0 && days < 366;
}, 'Choose an inclusive date range of up to 366 days.');
const Balances = { openingDebitCentavos: MoneyAmount, openingCreditCentavos: MoneyAmount, debitCentavos: MoneyAmount, creditCentavos: MoneyAmount, closingDebitCentavos: MoneyAmount, closingCreditCentavos: MoneyAmount };
export const TrialBalanceAccountSchema = z.strictObject({ accountId: Id, code: Text, label: Text, currency: Currency, active: z.boolean(), ...Balances });
const TrialBalanceBodySchema = z.strictObject({
    id: Id, organizationId: Id, createdBy: Id, createdAt: Instant, engineVersion: z.literal('trial-balance-v1'), evidenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
    fromDate: CalendarDay, throughDate: CalendarDay, cutoffAt: Instant, databaseSnapshot: Text, currency: Currency,
    status: z.enum(['available', 'empty', 'unavailable']), issues: z.array(Text), accounts: z.array(TrialBalanceAccountSchema).max(5000),
    totals: z.strictObject(Balances).nullable(), balanced: z.boolean().nullable(), sourceJournalCount: z.number().int().nonnegative().safe(), sourceLineCount: z.number().int().nonnegative().safe(), postedThrough: Instant.nullable(),
});
export const TrialBalanceRunSchema = TrialBalanceBodySchema.superRefine((run, context) => {
    if (run.status === 'unavailable' ? (run.totals !== null || run.balanced !== null || run.accounts.length !== 0 || run.issues.length === 0) : (run.totals === null || run.balanced === null || run.issues.length !== 0))
        context.addIssue({ code: 'custom', message: 'Report availability and evidence disagree.' });
    if (run.status === 'empty' && run.accounts.length !== 0)
        context.addIssue({ code: 'custom', message: 'Empty report contains accounts.' });
    if (run.status === 'available' && run.accounts.length === 0)
        context.addIssue({ code: 'custom', message: 'Available report has no accounts.' });
    for (const row of run.accounts) {
        const opening = BigInt(row.openingDebitCentavos) - BigInt(row.openingCreditCentavos), closing = BigInt(row.closingDebitCentavos) - BigInt(row.closingCreditCentavos);
        if ((row.openingDebitCentavos > 0 && row.openingCreditCentavos > 0) || (row.closingDebitCentavos > 0 && row.closingCreditCentavos > 0) || closing !== opening + BigInt(row.debitCentavos) - BigInt(row.creditCentavos))
            context.addIssue({ code: 'custom', message: 'Account balance conservation failed.' });
    }
    if (run.totals) {
        for (const key of Object.keys(Balances) as (keyof typeof Balances)[])
            if (run.accounts.reduce((sum, row) => sum + BigInt(row[key]), 0n) !== BigInt(run.totals[key]))
                context.addIssue({ code: 'custom', message: 'Report totals disagree with account rows.' });
        const expected = run.totals.openingDebitCentavos === run.totals.openingCreditCentavos && run.totals.debitCentavos === run.totals.creditCentavos && run.totals.closingDebitCentavos === run.totals.closingCreditCentavos;
        if (run.balanced !== expected)
            context.addIssue({ code: 'custom', message: 'Report balance flag disagrees with totals.' });
    }
});
export const TrialBalanceSummarySchema = TrialBalanceBodySchema.pick({ id: true, createdBy: true, createdAt: true, fromDate: true, throughDate: true, status: true, balanced: true });
export const TrialBalancePageSchema = z.strictObject({ items: z.array(TrialBalanceSummarySchema).max(20), nextCursor: Id.nullable() });
export const accountingReportSchemas = { TrialBalanceCreate: TrialBalanceCreateSchema, TrialBalanceRun: TrialBalanceRunSchema, TrialBalancePage: TrialBalancePageSchema };
