import { z } from 'zod';
import { CalendarDay, DatedScenarioSchema, Id, Instant, Version } from '../../../../../packages/contracts/src/schemas.js';
import { WorkflowAssessment, WorkflowFact, WorkflowPolicy } from '../../../../../packages/contracts/src/workflow.js';

const Hash = z.string().regex(/^[a-f0-9]{64}$/);
/** Private, bounded commitments: no OCR pages or invented hashes for statements. */
export const WorkflowSourceCommitment = z.strictObject({
  sourceId: Id, sourceVersion: Version, kind: z.enum(['document', 'statement']), date: CalendarDay,
  originalSha256: Hash.nullable(), statementSha256: Hash.nullable(),
  textVersionId: Id.nullable(), textSha256: Hash.nullable(),
  state: z.enum(['quarantined', 'cleared', 'blocked']),
  verification: z.enum(['not_checked', 'supported', 'mismatch', 'unavailable']),
}).superRefine((s, ctx) => {
  if (s.kind === 'statement' ? !s.statementSha256 || s.originalSha256 !== null || s.textVersionId !== null || s.textSha256 !== null
    : !s.originalSha256 || s.statementSha256 !== null || (s.textVersionId === null) !== (s.textSha256 === null))
    ctx.addIssue({ code: 'custom', message: 'The source commitment does not match its provenance kind.' });
});
export const WorkflowDecisionBasisSchema = z.strictObject({
  format: z.literal('workflow-decision-basis/v1'), inputSnapshotSha256: Hash,
  assessment: WorkflowAssessment, facts: z.array(WorkflowFact), policy: WorkflowPolicy,
  sources: z.array(WorkflowSourceCommitment),
  confirmations: z.array(z.strictObject({factId:Id,revision:Version,staffId:Id.nullable(),memberId:Id.nullable(),recordedAt:Instant})),
}).superRefine((b, ctx) => {
  const reject = (message: string) => ctx.addIssue({code:'custom',message});
  if (b.assessment.policyVersionId !== b.policy.id) reject('Assessment and saved policy versions differ.');
  for (const ids of [b.facts.map(f => f.id), b.sources.map(s => s.sourceId), b.policy.offers.map(o => o.id), b.assessment.scenarios.map(s => s.offerId)])
    if (new Set(ids).size !== ids.length) reject('The saved workflow contains duplicate identities.');
  for (const f of b.facts) {
    if (f.input.sourceId !== f.sourceId || f.input.sourceVersion !== f.sourceVersion
      || !b.sources.some(s => s.sourceId === f.sourceId && s.sourceVersion === f.sourceVersion)) reject('A fact has no exact source commitment.');
    const confirmations=b.confirmations.filter(c => c.factId === f.id && c.revision === f.revision);
    if (confirmations.length !== 1 || (confirmations[0].staffId === null) === (confirmations[0].memberId === null)) reject('Each fact needs its actual human confirmation identity.');
  }
  if (b.confirmations.length !== b.facts.length) reject('Confirmation provenance differs from the saved facts.');
  if (b.assessment.status === 'complete' && (b.assessment.issues.length || !b.assessment.scenarios.length)) reject('A complete assessment needs checked scenarios without unresolved issues.');
  for (const s of b.assessment.scenarios)
    if (!b.policy.offers.some(o => o.id === s.offerId)) reject('A checked scenario has no saved offer.');
});
export type WorkflowDecisionBasis = z.output<typeof WorkflowDecisionBasisSchema>;

/** Copy checked results; never recalculate or flatten dated occurrences. */
export function datedScenario(input: z.input<typeof WorkflowAssessment>['scenarios'][number]) {
  return DatedScenarioSchema.parse({format:'dated-scenario/v1', offerVersionId:input.offerId, monthlyRemainingCentavos:null,
    lowestBalanceCentavos:input.lowestBalanceCentavos, closingBalanceCentavos:input.closingBalanceCentavos,
    totalRepaymentCentavos:input.totalRepaymentCentavos, financingCostCentavos:input.financingCostCentavos,
    shortageDates:input.shortageDates, policyChecks:input.checks.map(c => ({policyId:c.id,passed:c.passed,detail:c.detail,overridable:false})), workflow:input});
}
