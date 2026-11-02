import { createHash } from 'node:crypto';
import { z } from 'zod';
import { money } from '../../../../../src/domain/format.js';
import { Text } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError } from '../../platform/errors.js';
import type { ReviewContext } from './context.js';
import type { PreviewRequestSchema } from './backend-contracts.js';

export function termsChecksum(text: string) { return createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex'); }
/** No financial calculation or external rendering. Exact supplied numbers only. */
export function decisionDocument(c: ReviewContext, request: z.output<typeof PreviewRequestSchema>) {
  const selected = c.offers.find(o => o.id === request.offerVersionId);
  const scenario = c.assessment?.status === 'complete' ? c.assessment.scenarios.find(s => s.offerVersionId === selected?.id) : undefined;
  const explanation = [
    `Application ${request.outcome === 'return' ? 'returned for clarification' : request.outcome === 'approve' ? 'approved by the reviewer' : 'declined by the reviewer'}.`,
    request.rationale,
    ...(selected && scenario ? [`Net proceeds ${money(selected.netReceivedCentavos)}; total repayment ${money(scenario.totalRepaymentCentavos)}; financing cost ${money(scenario.financingCostCentavos)}.`,
      `For ${c.periodStart} to ${c.periodEnd}, monthly remaining ${money(scenario.monthlyRemainingCentavos)}; lowest dated balance ${money(scenario.lowestBalanceCentavos)}.`] : ['No complete approved terms are supplied.']),
    `Review date: ${request.reviewDate}. This record is not a guarantee of future affordability.`,
  ].join('\n');
  if (!Text.safeParse(explanation).success) throw new ApiError(422, 'explanation_too_long', 'Shorten the rationale so the complete reviewed explanation can be preserved.');
  const terms = request.outcome === 'approve' && selected && scenario ? [
    'AGAP — exact reviewed terms', `Member: ${c.application.memberName}`, `Purpose: ${c.application.purpose}`,
    explanation, `Principal: ${money(selected.principalCentavos)}. Term: ${selected.termMonths} months.`,
    `Separately paid fees: ${money(selected.feesPaidSeparatelyCentavos)}.`,
    ...selected.payments.map(p => `${p.date}: ${money(p.amountCentavos)}`),
    'Acknowledgment records acceptance of this exact version. It does not release money.',
  ].join('\n') : null;
  if (terms && Buffer.byteLength(terms, 'utf8') > 65536) throw new ApiError(422, 'terms_too_large', 'The supplied terms exceed the supported review-document size.');
  return { explanation, terms };
}
