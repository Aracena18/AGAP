import { randomUUID } from 'node:crypto';
import type { z } from 'zod';
import type { ActorContext, MemberActorContext, TransactionContext, MemberTransactionContext, UnitOfWork, MemberUnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { WorkflowView, WorkflowFact, WorkflowFactInput, WorkflowDraftReview, WorkflowAssessment, WorkflowPolicy } from '../../../../../packages/contracts/src/workflow.js';
import { AssessmentCreateSchema, VerificationSchema, EvidenceCorrectionSchema, DraftConfirmationSchema, Id } from '../../../../../packages/contracts/src/schemas.js';
import { assessWorkflow } from '../../../../../packages/finance/src/workflow-assessment.js';
import { command, recordEvent } from '../../platform/commands.js';
import { memberCommand, memberEvent } from '../../platform/member-commands.js';
import { ApiError, notFound } from '../../platform/errors.js';

type Tx = TransactionContext | MemberTransactionContext;
export type WorkflowActor = ActorContext | MemberActorContext;
const isMember = (actor: WorkflowActor): actor is MemberActorContext => 'kind' in actor;
export class WorkflowService {
  constructor(private readonly uow: UnitOfWork, private readonly memberUow: MemberUnitOfWork, readonly aiAvailable = false, private readonly allowFictional = false) {}
  run<T>(actor: WorkflowActor, work: (tx: Tx) => Promise<T>) { return isMember(actor) ? this.memberUow.run(actor, work) : this.uow.run(actor, work); }
  async access(tx: Tx, id: string) {
    Id.parse(id);
    const a = (await tx.query('SELECT * FROM applications.applications WHERE id=$1 AND organization_id=$2', [id, tx.actor.organizationId])).rows[0];
    if (!a || !(await tx.query<{ allowed: boolean }>('SELECT evidence.can_access($1) AS allowed', [id])).rows[0].allowed) throw notFound();
    return a;
  }
  private cache<T>(tx: Tx, operation: string, key: unknown, input: unknown, execute: () => Promise<T>) {
    return isMember(tx.actor) ? memberCommand(tx as MemberTransactionContext, operation, key, input, execute) : command(tx as TransactionContext, operation, key, input, execute);
  }
  async advance(tx: Tx, id: string, version: number | null, action: string) {
    try {
      const next = Number((await tx.query<{ version: string }>('SELECT evidence.advance($1,$2,$3) AS version', [id, version, action])).rows[0].version);
      if (isMember(tx.actor)) await memberEvent(tx as MemberTransactionContext, `member.evidence.${action}`, id, next);
      else await recordEvent(tx as TransactionContext, `evidence.${action}`, id, next);
      return next;
    } catch (e) {
      const code = e && typeof e === 'object' && 'code' in e ? e.code : '';
      if (code === 'AG412') throw new ApiError(412, 'stale_version', 'The application changed. Reload before saving.');
      if (code === 'AG409') throw new ApiError(409, 'review_required', 'This application needs a separate review before further changes.');
      if (code === '42501') throw new ApiError(403, 'evidence_forbidden', 'This action requires the assigned officer or an authorized verifier.');
      throw e;
    }
  }
  async policy(tx: Tx) {
    const rows = (await tx.query('SELECT body FROM credit.policies WHERE organization_id=$1 ORDER BY published_at DESC,id', [tx.actor.organizationId])).rows;
    return rows.map(row => WorkflowPolicy.parse(row.body)).find(p => p.status === 'approved' && !!p.approvalReference || this.allowFictional && p.status === 'fictional') ?? null;
  }
  view(actor: WorkflowActor, id: string) { return this.run(actor, tx => this.viewIn(tx, id)); }
  async viewIn(tx: Tx, id: string) {
    const a = await this.access(tx, id), policy = await this.policy(tx);
    const sources = (await tx.query(`SELECT s.*,p.state,p.stage,p.message,p.pages,p.text_version_id,EXISTS(SELECT 1 FROM evidence.retirements r WHERE r.source_id=s.id) AS retired,
      (SELECT v.outcome FROM evidence.verification_outcomes v WHERE v.source_id=s.id ORDER BY v.recorded_at DESC,v.id DESC LIMIT 1) AS verification
      FROM evidence.sources s LEFT JOIN evidence.processing p ON p.source_id=s.id WHERE s.application_id=$1 ORDER BY s.created_at,s.id`, [id])).rows;
    const facts = (await tx.query('SELECT DISTINCT ON(id) body FROM evidence.facts WHERE application_id=$1 ORDER BY id,revision DESC', [id])).rows.map(row => WorkflowFact.parse(row.body));
    const drafts = (await tx.query(`SELECT d.body,COALESCE(r.state,'suggested') AS state FROM evidence.drafts d LEFT JOIN evidence.draft_reviews r ON r.draft_id=d.id WHERE d.application_id=$1 ORDER BY d.created_at,d.id`, [id])).rows.map(row => ({ ...(row.body as object), state: row.state }));
    const result = (await tx.query('SELECT body FROM credit.assessment_views WHERE application_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1', [id])).rows[0];
    return WorkflowView.parse({ applicationId: id, version: Number(a.version), inputVersion: Number(a.assessment_input_version),
      sources: sources.map(s => ({ id: s.id, version: Number(s.version), textVersionId:s.text_version_id??null, kind: s.kind, label: s.label,
        date: String(s.source_date instanceof Date ? s.source_date.toISOString().slice(0,10) : s.source_date), state: s.retired?'blocked':s.kind === 'statement' ? 'cleared' : s.state,
        processing: s.retired?'manual':s.kind === 'statement' ? 'manual' : s.stage, message: s.retired?'This document is unavailable under a recorded retention decision.':s.message ?? null,
        verification: s.verification ?? 'not_checked', pages: s.kind === 'statement' ? [{ page: 1, text: s.statement }] : s.state === 'cleared'&&!s.retired ? s.pages : [] })),
      facts, drafts, offers: policy?.offers.map(({ separateFees: _fees, ...offer }) => { void _fees; return {...offer,available:offer.available&&offer.principalCentavos===Number(a.requested_principal_centavos)}; }) ?? [],
      latestAssessment: result ? { ...(result.body as object), stale: (result.body as { inputVersion: number }).inputVersion !== Number(a.assessment_input_version) || (result.body as {policyVersionId:string|null}).policyVersionId!==(policy?.id??null) || facts.some(f=>f.input.relevance==='included'&&!sources.some(s=>s.id===f.sourceId&&!s.retired&&(s.kind==='statement'||s.state==='cleared'))) } : null,
      aiAvailable: this.aiAvailable,
    });
  }
  async memberEvidence(actor:MemberActorContext,id:string){const view=await this.view(actor,id);return {state:'available' as const,data:{sources:view.sources.map(s=>({id:s.id,fileName:s.label,version:s.version,state:s.state,verification:s.verification})),drafts:view.drafts.filter(d=>d.state==='suggested'&&view.sources.some(s=>s.id===d.source.sourceId&&s.state==='cleared')).map(d=>({id:d.id,origin:d.origin,provenance:d.provenance,source:d.source,value:d.suggestion.value,question:`Review ${d.suggestion.label}: confirm dates, amount basis and limitations.`,state:'suggested' as const}))}};}
  saveFact(actor: WorkflowActor, id: string, input: unknown, version: number, key: unknown) {
    const data = WorkflowFactInput.parse(input);
    return this.run(actor, async tx => {
      await this.access(tx, id);
      return this.cache(tx, `workflow.fact:${id}`, key, { data, version }, async () => {
        const next = await this.advance(tx, id, version, 'fact');
        await this.factIn(tx, id, data); return { id, version: next };
      });
    });
  }
  private async factIn(tx: Tx, app: string, data: z.output<typeof WorkflowFactInput>) {
    let sourceId = data.sourceId, sourceVersion = data.sourceVersion;
    if (data.statement) {
      if (sourceId || sourceVersion) throw new ApiError(422, 'source_conflict', 'Choose a document or record a statement, not both.');
      sourceId = randomUUID(); sourceVersion = 1;
      await tx.query("INSERT INTO evidence.sources(id,organization_id,application_id,kind,label,source_date,statement) VALUES($1,$2,$3,'statement',$4,$5,$6)", [sourceId, tx.actor.organizationId, app, `Statement: ${data.label}`, data.effectiveDate, data.statement]);
    }
    if (!sourceId || !sourceVersion) throw new ApiError(422, 'source_required', 'Choose a cleared source or record the member statement.');
    const source = (await tx.query(`SELECT s.kind,s.version,p.state,EXISTS(SELECT 1 FROM evidence.retirements r WHERE r.source_id=s.id) AS retired FROM evidence.sources s LEFT JOIN evidence.processing p ON p.source_id=s.id WHERE s.id=$1 AND s.application_id=$2`, [sourceId, app])).rows[0];
    if (!source || Number(source.version) !== sourceVersion || data.relevance==='included'&&(source.retired || source.kind === 'document' && source.state !== 'cleared')) throw new ApiError(422, 'source_unavailable', 'Use the current cleared source version.');
    const previous = data.factId ? (await tx.query('SELECT body,revision FROM evidence.facts WHERE id=$1 AND application_id=$2 ORDER BY revision DESC LIMIT 1', [data.factId, app])).rows[0] : null;
    if (data.factId && !previous) throw notFound();
    const fact = WorkflowFact.parse({ id: data.factId ?? randomUUID(), revision: previous ? Number(previous.revision) + 1 : 1,
      input: { ...data, sourceId, sourceVersion, statement: null }, sourceId, sourceVersion, recordedAt: new Date().toISOString() });
    await tx.query('INSERT INTO evidence.facts(organization_id,application_id,id,revision,source_id,body) VALUES($1,$2,$3,$4,$5,$6)', [tx.actor.organizationId, app, fact.id, fact.revision, sourceId, JSON.stringify(fact)]);
    return fact;
  }
  review(actor: WorkflowActor, id: string, input: unknown, version: number, key: unknown) {
    const data = WorkflowDraftReview.parse(input);
    return this.run(actor, async tx => {
      await this.access(tx, id);
      return this.cache(tx, `workflow.review:${id}`, key, { data, version }, async () => {
        const next = await this.advance(tx, id, version, 'fact');
        const draft = (await tx.query('SELECT d.*,r.state AS review_state,s.version AS source_version,p.text_sha256 AS current_text_sha256,p.state AS source_state FROM evidence.drafts d JOIN evidence.processing p ON p.source_id=d.source_id JOIN evidence.sources s ON s.id=d.source_id LEFT JOIN evidence.draft_reviews r ON r.draft_id=d.id WHERE d.id=$1 AND d.application_id=$2', [data.draftId, id])).rows[0];
        if (!draft || draft.review_state || draft.source_state !== 'cleared' || draft.text_sha256 !== draft.current_text_sha256) throw new ApiError(409, 'draft_unavailable', 'Reload the current suggestion and source.');
        let factId:string|null=null;
        if (data.action !== 'not_applicable') {
          if (!data.fact || data.fact.sourceId !== draft.source_id || data.fact.sourceVersion !== Number(draft.source_version) || data.fact.statement) throw new ApiError(422, 'draft_source', 'Confirm the exact source for this suggestion.');
          factId=(await this.factIn(tx, id, data.fact)).id;
        }
        await tx.query('INSERT INTO evidence.draft_reviews(organization_id,application_id,draft_id,state,reason,fact_id) VALUES($1,$2,$3,$4,$5,$6)', [tx.actor.organizationId, id, data.draftId, data.action === 'not_applicable' ? 'rejected' : 'accepted', data.reason,factId]);
        return { id, version: next };
      });
    });
  }
  verify(actor: ActorContext, id: string, input: unknown, version: number, key: unknown) {
    const data = VerificationSchema.parse(input);
    return this.run(actor, async tx => {
      await this.access(tx, id);
      return this.cache(tx, `workflow.verify:${id}`, key, { data, version }, async () => {
        const next = await this.advance(tx, id, version, 'verification');
        const source = (await tx.query('SELECT id FROM evidence.sources WHERE id=$1 AND application_id=$2', [data.sourceId, id])).rows[0];
        if (!source) throw notFound();
        await tx.query('INSERT INTO evidence.verifications(id,organization_id,application_id,source_id,body,recorded_by) VALUES($1,$2,$3,$4,$5,$6)', [randomUUID(), actor.organizationId, id, data.sourceId, JSON.stringify(data), actor.userId]);
        return { id, version: next };
      });
    });
  }
  assess(actor: ActorContext, id: string, input: unknown, version: number, key: unknown) {
    const data = AssessmentCreateSchema.parse(input);
    return this.run(actor, async tx => {
      await this.access(tx, id);
      return this.cache(tx, `workflow.assess:${id}`, key, { data, version }, async () => {
        await this.access(tx,id);
        await tx.query('SELECT id FROM applications.applications WHERE id=$1 FOR UPDATE',[id]);
        const current = await this.viewIn(tx, id), policy = await this.policy(tx);
        if (current.inputVersion !== data.inputVersion) throw new ApiError(412, 'stale_inputs', 'The evidence changed. Reload before assessing.');
        const a=await this.access(tx,id);
        if(policy)policy.offers=policy.offers.map(o=>({...o,available:o.available&&o.principalCentavos===Number(a.requested_principal_centavos)}));
        const calculated = assessWorkflow(current.facts, policy, data.offerVersionIds, data.periodStart, data.periodEnd);
        const uncleared=current.facts.filter(f=>f.input.relevance==='included'&&!current.sources.some(s=>s.id===f.sourceId&&s.version===f.sourceVersion&&s.state==='cleared'));
        if(uncleared.length){calculated.issues.push('One or more confirmed facts no longer have an available cleared source.');calculated.scenarios=[];}
        const result = WorkflowAssessment.parse({ id: randomUUID(), applicationId: id, inputVersion: current.inputVersion, policyVersionId: policy?.id ?? null,
          engineVersion: 'dated-cash-flow-v4', createdAt: new Date().toISOString(), periodStart: data.periodStart, periodEnd: data.periodEnd,
          status: calculated.issues.length ? 'incomplete' : 'complete', ...calculated, stale: false });
        await this.advance(tx,id,version,result.status==='complete'?'assessment_complete':'assessment');
        await tx.query('INSERT INTO credit.assessments(id,organization_id,application_id,body,input_snapshot) VALUES($1,$2,$3,$4,$5)', [result.id, actor.organizationId, id, JSON.stringify(result), JSON.stringify({ facts: current.facts, sources:current.sources, policy })]);
        return result;
      });
    });
  }
  async correct(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){
    const data=EvidenceCorrectionSchema.parse(input),view=await this.view(actor,id),fact=view.facts.find(f=>f.id===data.factId);
    if(!fact)throw notFound();
    return this.saveFact(actor,id,{...fact.input,factId:fact.id,value:data.value,sourceId:data.sourceId??fact.sourceId,sourceVersion:fact.sourceVersion,effectiveDate:data.effectiveDate,cashDates:[data.cashDate],reason:data.reason},version,key);
  }
  async confirm(actor:MemberActorContext,id:string,input:unknown,version:number,key:unknown){
    const parsed=WorkflowDraftReview.safeParse(input);if(parsed.success)return this.review(actor,id,parsed.data,version,key);
    const data=DraftConfirmationSchema.parse(input),view=await this.view(actor,id),draft=view.drafts.find(d=>d.id===data.draftId);
    if(!draft||draft.source.sourceId!==data.sourceId||draft.source.sourceVersion!==data.sourceVersion)throw notFound();
    return this.review(actor,id,{draftId:data.draftId,action:data.action,reason:data.reason,fact:data.action==='not_applicable'?null:{...draft.suggestion,value:data.value,effectiveDate:data.effectiveDate}},version,key);
  }
  history(actor: ActorContext, id: string) {
    return this.run(actor, async tx => {
      const a = await this.access(tx, id);
      return { verifications:(await tx.query('SELECT body,recorded_by,recorded_at FROM evidence.staff_verifications WHERE application_id=$1 ORDER BY recorded_at,id',[id])).rows.map(r=>({verification:VerificationSchema.parse(r.body),actorId:r.recorded_by,recordedAt:new Date(r.recorded_at as string).toISOString()})), facts: (await tx.query('SELECT body FROM evidence.facts WHERE application_id=$1 ORDER BY recorded_at,id,revision', [id])).rows.map(r => WorkflowFact.parse(r.body)),
        assessments: (await tx.query('SELECT body FROM credit.assessment_views WHERE application_id=$1 ORDER BY created_at,id', [id])).rows.map(r => WorkflowAssessment.parse({ ...(r.body as object), stale: (r.body as { inputVersion: number }).inputVersion !== Number(a.assessment_input_version) })) };
    });
  }
}
