import { describe, expect, it } from 'vitest';
import { trialBalance } from './trial-balance.js';
const id = '00000000-0000-4000-8000-000000000001';
const row = (patch: Record<string, unknown> = {}) => ({ id, code: '100', label: 'Fictional account', currency: 'PHP', active: true, opening_debit: '0', opening_credit: '0', debit: '0', credit: '0', ...patch });
describe('exact posted trial balance', () => {
    it('retains opening and period movements and separates debit/credit closing balances', () => { const result = trialBalance([row({ opening_debit: '1200', debit: '300', credit: '500' }), row({ id: '00000000-0000-4000-8000-000000000002', opening_credit: '1200', debit: '500', credit: '300', active: false })]); expect(result).toMatchObject({ status: 'available', balanced: true, totals: { openingDebitCentavos: 1200, openingCreditCentavos: 1200, debitCentavos: 800, creditCentavos: 800, closingDebitCentavos: 1000, closingCreditCentavos: 1000 } }); expect(result.accounts[1].active).toBe(false); });
    it('uses exact large intermediate sums before netting', () => { expect(trialBalance([row({ opening_debit: '9007199254740992', opening_credit: '9007199254740991' })]).accounts[0].openingDebitCentavos).toBe(1); });
    it('does not infer zero or balance when amounts or result totals are unsafe', () => { for (const rows of [[row({ debit: '9007199254740992' })], [row({ debit: '-1' })], [row({ debit: '1.5' })], [row({ debit: null })], [row({ debit: '9007199254740991' }), row({ debit: '1' })]])
        expect(trialBalance(rows)).toMatchObject({ status: 'unavailable', totals: null, balanced: null, accounts: [] }); });
    it('distinguishes a measured zero from no accounts and from too many accounts', () => { expect(trialBalance([])).toMatchObject({ status: 'empty', balanced: true, totals: { debitCentavos: 0 } }); expect(trialBalance([row()])).toMatchObject({ status: 'available', balanced: true }); expect(trialBalance(Array.from({ length: 5001 }, () => row()))).toMatchObject({ status: 'unavailable', totals: null }); });
    it('reports imbalance rather than claiming external reconciliation', () => { expect(trialBalance([row({ debit: '100' })])).toMatchObject({ status: 'available', balanced: false, totals: { closingDebitCentavos: 100, closingCreditCentavos: 0 } }); });
});
