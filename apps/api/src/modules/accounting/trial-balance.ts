import { TrialBalanceAccountSchema } from '../../../../../packages/contracts/src/accounting-reports.js';
import type { z } from 'zod';
export type BalanceAccount = z.output<typeof TrialBalanceAccountSchema>;
const columns = ['openingDebitCentavos', 'openingCreditCentavos', 'debitCentavos', 'creditCentavos', 'closingDebitCentavos', 'closingCreditCentavos'] as const;
function exact(value: unknown) { if (typeof value !== 'string' || !/^\d+$/.test(value))
    throw new Error('Ledger aggregate is invalid.'); return BigInt(value); }
function safe(value: bigint) { if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('Ledger aggregate exceeds safe centavos.'); return Number(value); }
/** Converts authoritative SQL aggregates once; no stored journal/request is rewritten. */
export function trialBalance(rows: Record<string, unknown>[]) {
    if (rows.length > 5000)
        return { status: 'unavailable' as const, accounts: [], totals: null, balanced: null, issues: ['More than 5000 accounts require a smaller reviewed reporting scope.'] };
    try {
        const accounts = rows.map(row => {
            const opening = exact(row.opening_debit) - exact(row.opening_credit), debit = exact(row.debit), credit = exact(row.credit), closing = opening + debit - credit;
            return TrialBalanceAccountSchema.parse({ accountId: row.id, code: row.code, label: row.label, currency: row.currency, active: row.active,
                openingDebitCentavos: safe(opening > 0n ? opening : 0n), openingCreditCentavos: safe(opening < 0n ? -opening : 0n), debitCentavos: safe(debit), creditCentavos: safe(credit), closingDebitCentavos: safe(closing > 0n ? closing : 0n), closingCreditCentavos: safe(closing < 0n ? -closing : 0n) });
        });
        const totals = Object.fromEntries(columns.map(column => [column, safe(accounts.reduce((sum, row) => sum + BigInt(row[column]), 0n))])) as Record<typeof columns[number], number>;
        return { status: accounts.length ? 'available' as const : 'empty' as const, accounts, totals, balanced: totals.openingDebitCentavos === totals.openingCreditCentavos && totals.debitCentavos === totals.creditCentavos && totals.closingDebitCentavos === totals.closingCreditCentavos, issues: [] };
    }
    catch {
        return { status: 'unavailable' as const, accounts: [], totals: null, balanced: null, issues: ['Posted account aggregates cannot be represented safely. No zero or balanced result is inferred.'] };
    }
}
