import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { AssessmentSchema } from '../../../../../packages/contracts/src/schemas.js';
import { WorkflowAssessment, WorkflowFact, WorkflowPolicy, WorkflowSource } from '../../../../../packages/contracts/src/workflow.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import { ApiError } from '../../platform/errors.js';
import { workflowDigest } from '../decisions/workflow-digest.js';
import { datedScenario, WorkflowDecisionBasisSchema } from '../decisions/workflow-basis.js';
import { WorkflowService } from './workflow.service.js';

const SavedInput = z.strictObject({facts:z.array(WorkflowFact),sources:z.array(WorkflowSource),policy:WorkflowPolicy});
/** Credit-owned authoritative producer on the caller transaction, never HTTP input.
 * The immutable original input remains protected in credit.assessments; its digest
 * commits the full original, while the new decision stores bounded commitments.
 */
export class WorkflowDecisionProducer {
  constructor(private readonly workflow: WorkflowService) {}
  async load(tx: TransactionContext, applicationId: string) {
    requireLendingTransaction(tx);
    await this.workflow.access(tx,applicationId);
    await tx.query('SELECT id FROM applications.applications WHERE id=$1 AND organization_id=$2 FOR UPDATE',[applicationId,tx.actor.organizationId]);
    const current=await this.workflow.viewIn(tx,applicationId);
    const raw=(await tx.query('SELECT credit.staff_decision_input($1) AS data',[applicationId])).rows[0]?.data;
    if (!raw) throw new ApiError(409,'assessment_basis_unavailable','Save an authoritative assessment before opening the decision workspace.');
    const saved=z.object({assessment:WorkflowAssessment,input:SavedInput,confirmations:WorkflowDecisionBasisSchema.shape.confirmations}).parse(raw);
    const policy=await this.workflow.policy(tx), application=await this.workflow.access(tx,applicationId);
    const applicablePolicy=policy ? {...policy,offers:policy.offers.map(o => ({...o,available:o.available && o.principalCentavos===Number(application.requested_principal_centavos)}))} : null;
    const currentPolicyId=applicablePolicy?.id??null;
    const rows=(await tx.query(`SELECT s.id,s.version,s.kind,s.source_date::text AS source_date,s.sha256,s.statement,p.state,p.text_version_id,p.text_sha256,
      EXISTS(SELECT 1 FROM evidence.retirements r WHERE r.source_id=s.id) AS retired,
      (SELECT v.outcome FROM evidence.verification_outcomes v WHERE v.source_id=s.id ORDER BY v.recorded_at DESC,v.id DESC LIMIT 1) AS verification
      FROM evidence.sources s LEFT JOIN evidence.processing p ON p.source_id=s.id
      WHERE s.organization_id=$1 AND s.application_id=$2 ORDER BY s.created_at,s.id`,[tx.actor.organizationId,applicationId])).rows;
    const sourceIds=new Set(saved.input.sources.map(s => s.id));
    const sources=rows.filter(s => sourceIds.has(String(s.id))).map(s => ({sourceId:s.id,sourceVersion:Number(s.version),kind:s.kind,
      date:s.source_date,
      originalSha256:s.sha256,statementSha256:s.kind==='statement' ? createHash('sha256').update(String(s.statement),'utf8').digest('hex') : null,
      textVersionId:s.text_version_id??null,textSha256:s.text_sha256??null,
      state:s.retired ? 'blocked' : s.kind==='statement' ? 'cleared' : s.state,verification:s.verification??'not_checked'}));
    const sourceChanged=saved.input.sources.some(old => !current.sources.some(s => s.id===old.id && s.version===old.version
      && s.date===old.date && s.textVersionId===old.textVersionId && s.state===old.state && s.verification===old.verification));
    const stale=current.latestAssessment?.id!==saved.assessment.id || current.latestAssessment.stale || sourceChanged
      || workflowDigest(saved.input.facts)!==workflowDigest(current.facts) || workflowDigest(saved.input.policy)!==workflowDigest(applicablePolicy);
    const workflowBasis=WorkflowDecisionBasisSchema.parse({format:'workflow-decision-basis/v1',inputSnapshotSha256:workflowDigest((raw as {input:unknown}).input),
      assessment:{...saved.assessment,stale:!!stale},facts:saved.input.facts,policy:saved.input.policy,sources,confirmations:saved.confirmations});
    const a=workflowBasis.assessment;
    const basis={id:a.id,applicationId:a.applicationId,inputVersion:a.inputVersion,engineVersion:a.engineVersion,policyVersionId:a.policyVersionId,createdAt:a.createdAt};
    const assessment=AssessmentSchema.parse(a.status==='complete' ? {...basis,status:'complete',scenarios:a.scenarios.map(datedScenario),warnings:[]}
      : {...basis,status:'incomplete',issues:a.issues.map(message => ({factId:null,message}))});
    return {periodStart:a.periodStart,periodEnd:a.periodEnd,currentAssessmentPolicyVersionId:currentPolicyId,assessment,
      offers:saved.input.policy.offers.map(({separateFees,...offer}) => {void separateFees;return offer;}),sources:[],facts:[],workflowBasis};
  }
}
