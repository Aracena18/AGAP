import type { CaseRecord, EvidenceFact, LoanOffer } from '../domain/types';

const pesos = (value: number) => value * 100;
function offer(id: string, label: string, day: number): LoanOffer {
  return {
    id, label, principal: pesos(30000), netReceived: pesos(30000), feesPaidSeparately: 0, termMonths: 12, available: true,
    policyNote: 'Fictional policy: either listed repayment date is available; changes require a human review.',
    payments: Array.from({ length: 12 }, (_, index) => {
      const monthIndex = 10 + index;
      return { date: `${2026 + Math.floor(monthIndex / 12)}-${String(monthIndex % 12 + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`, amount: pesos(3000) };
    }),
  };
}
function fact(id: string, label: string, category: EvidenceFact['category'], value: number, day: number, sourceId: string): EvidenceFact {
  return { id, label, category, value: pesos(value), status: sourceId === 'statement' ? 'member-reported' : 'document-supported', sourceId,
    effectiveDate: '2026-10-20', cashDate: `2026-11-${String(day).padStart(2, '0')}`, critical: true, alreadyDeducted: false };
}
function base(id: string, name: string, initials: string, occupation: string): CaseRecord {
  return {
    id, member: { name, initials, occupation, memberSince: '2021' }, purpose: 'Home essentials', createdAt: '2026-10-20',
    periodStart: '2026-11-01', periodEnd: '2026-11-30', version: 1,
    facts: [
      fact('opening', 'Opening spendable cash', 'opening', 9000, 1, 'statement'),
      fact('income', 'Monthly take-home pay', 'income', 24000, 15, 'payslip'),
      fact('rent', 'Rent', 'expense', 6000, 5, 'statement'),
      fact('existing-debt', 'Existing loan payment', 'obligation', 2000, 7, 'loan-ledger'),
      fact('essentials-first', 'Household essentials · first half', 'expense', 5500, 20, 'statement'),
      fact('essentials-second', 'Household essentials · second half', 'expense', 5500, 28, 'statement'),
    ],
    sources: [
      { id: 'payslip', title: 'Current payslip', kind: 'document', date: '2026-10-20', excerpt: 'FICTIONAL DOCUMENT · Monthly take-home pay: PHP 24,000, paid on the 15th. The existing PHP 2,000 loan payment is not deducted from this figure.' },
      { id: 'old-worksheet', title: 'Previous assessment worksheet', kind: 'worksheet', date: '2026-09-20', excerpt: 'FICTIONAL WORKSHEET · Recorded monthly take-home pay: PHP 28,000. This older figure differs from the current payslip.' },
      { id: 'statement', title: 'Member circumstances discussion', kind: 'statement', date: '2026-10-20', excerpt: 'FICTIONAL MEMBER STATEMENT · Opening spendable cash PHP 9,000; rent PHP 6,000 on the 5th; household essentials PHP 5,500 on the 20th and PHP 5,500 on the 28th. Loan proceeds are reserved for the purchase and excluded from spendable cash.' },
      { id: 'loan-ledger', title: 'Existing obligation record', kind: 'document', date: '2026-10-20', excerpt: 'FICTIONAL RECORD · PHP 2,000 is due on the 7th. This payment has not already been deducted from take-home pay.' },
    ],
    offers: [offer('requested', 'Requested schedule', 10), offer('payday-aligned', 'After-payday schedule', 16)],
    corrections: [], recommendation: null, decisions: [], followUp: null,
  };
}
export function createDemoCases(): CaseRecord[] {
  const ana = base('AG-001', 'Ana Dela Cruz', 'AD', 'Office administrator');
  const income = ana.facts.find(item => item.id === 'income')!;
  income.value = pesos(28000);
  income.status = 'conflicting';
  income.sourceId = 'old-worksheet';
  income.effectiveDate = '2026-09-20';
  income.candidates = [
    { value: pesos(28000), sourceId: 'old-worksheet', effectiveDate: '2026-09-20' },
    { value: pesos(24000), sourceId: 'payslip', effectiveDate: '2026-10-20' },
  ];
  const ben = base('AG-002', 'Ben Mendoza', 'BM', 'Retail associate');
  ben.facts.find(item => item.id === 'income')!.value = pesos(18000);
  ben.sources = ben.sources.filter(source => source.id !== 'old-worksheet');
  ben.sources.find(source => source.id === 'payslip')!.excerpt = 'FICTIONAL DOCUMENT · Monthly take-home pay: PHP 18,000, paid on the 15th. The PHP 2,000 existing loan payment is not already deducted.';
  const cora = base('AG-003', 'Cora Reyes', 'CR', 'Market vendor');
  const coraIncome = cora.facts.find(item => item.id === 'income')!;
  Object.assign(coraIncome, { value: null, status: 'missing', sourceId: null });
  cora.sources = cora.sources.filter(source => !['payslip', 'old-worksheet'].includes(source.id));
  return [ana, ben, cora];
}
