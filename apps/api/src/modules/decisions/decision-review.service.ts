import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import {
  AssignmentCreateSchema, CommandReceiptSchema, DecisionConcernCheckSchema, DecisionConcernCreateSchema, DecisionConflictCreateSchema,
  DecisionNoticeAcknowledgmentSchema, DecisionNoticePageSchema, DecisionReviewAssignmentSchema, DecisionReviewConfirmSchema,
  DecisionReviewDispositionSchema, DecisionReviewEventPageSchema, DecisionReviewEventPayloadSchema, DecisionReviewEventSchema,
  DecisionReviewSchema, Id, Version,
} from '../../../../../packages/contracts/src/schemas.js';
import { canonical, command, recordEvent } from '../../platform/commands.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import { requireFreshMfa, requireRoles } from '../identity/identity.service.js';
import { businessDay } from '../servicing/command-rules.js';
import { ReviewContextSchema, type ReviewContext } from './context.js';
import { decisionOperation } from './decision-errors.js';
import { LendingDecisionProducers } from './lending-producers.js';
import { loadReviewReadiness } from './review-readiness.js';
import { validateReviewEvidence } from './rules.js';

const Page=z.strictObject({cursor:Id.optional(),limit:z.coerce.number().int().min(1).max(100).default(25)});
type Payload=z.output<typeof DecisionReviewEventPayloadSchema>;
type ReviewState=Awaited<ReturnType<DecisionReviewService['basis']>>;
const readerRoles=['officer','reviewer','auditor'];

/** Durable accountable human review. No model result becomes a check or decision. */
export class DecisionReviewService {
  constructor(private readonly uow:UnitOfWork,private readonly ports:LendingDecisionProducers,private readonly now=()=>new Date()) {}
  private async basis(tx:TransactionContext,app:string) {
    const c=ReviewContextSchema.parse({...await this.ports.loadStaffBasis(tx,app),recommendation:null});
    const grants=c.authority.status==='configured'?c.authority.grants:[];
    const users=await this.ports.participants(tx,app,[...new Set([...grants.map(g=>g.userId),...(c.application.assignedOfficerId?[c.application.assignedOfficerId]:[])])]);
    const state=await loadReviewReadiness(tx,c,users),names=await this.ports.candidateNames(tx,app,grants.map(g=>g.userId));
    if(grants.length>100)throw new ApiError(503,'review_roster_unavailable','The complete reviewer roster exceeds this interface. No partial eligibility is claimed.');
    const day=businessDay(this.now().toISOString());
    const effective=c.authority.status==='configured'&&c.authority.effectiveFrom<=day&&day<=c.authority.effectiveThrough;
    const reviewers=grants.map(g=>{
      const user=users.find(u=>u.userId===g.userId),clear=c.conflicts.some(d=>d.userId===g.userId&&d.status==='clear');
      const available=effective&&g.outcomes.length>0&&g.userId!==c.application.assignedOfficerId&&!!user?.active
        &&user.branchIds.includes(c.application.branchId)&&user.roles.includes('reviewer')&&clear;
      return {userId:g.userId,displayName:names.find(n=>n.userId===g.userId)?.displayName??`Reviewer ${g.userId}`,available,
        reason:available?null:'Current separate reviewer access, configured authority and conflict clearance are required.'};
    });
    return {c,state,reviewers};
  }
  private ownClear(c:ReviewContext,userId:string) {
    if(!c.conflicts.some(f=>f.userId===userId&&f.status==='clear'))throw new ApiError(403,'conflict_clearance_required','Current conflict clearance is required. A recorded restriction needs another eligible participant.');
  }
  private assigned(tx:TransactionContext,c:ReviewContext) {
    requireRoles(tx.actor,['officer']);
    if(c.application.assignedOfficerId!==tx.actor.userId)throw new ApiError(403,'assignment_required','Only the assigned officer may prepare this review.');
    this.ownClear(c,tx.actor.userId);
  }
  private checkBasis(review:ReviewState,hash:string) {
    if(review.state.hash!==hash)throw new ApiError(409,'review_basis_changed','The evidence or assessment changed. Review the current basis before a new submission.');
  }
  private async persist(tx:TransactionContext,app:string,version:number,event:Payload) {
    const id=randomUUID();
    const receipt=CommandReceiptSchema.parse((await tx.query('SELECT decisions.record_review_event($1,$2,$3,$4) AS data',[app,version,id,canonical(event)])).rows[0]?.data);
    await recordEvent(tx,`decision.review.${event.kind}`,app,receipt.version);return receipt;
  }
  private write(actor:ActorContext,app:string,version:number,key:unknown,operation:string,data:unknown,work:(tx:TransactionContext,review:ReviewState)=>Promise<z.output<typeof CommandReceiptSchema>>) {
    Id.parse(app);Version.parse(version);
    return decisionOperation(()=>this.uow.run(actor,async tx=>{
      await this.ports.authorizeStaff(tx,app);
      return command(tx,`${operation}:${app}`,key,{app,version,data},async()=>{
        const review=await this.basis(tx,app);
        if(review.c.application.version!==version)throw new ApiError(412,'stale_version','The application changed. Refresh before a new review action.');
        return work(tx,review);
      });
    }));
  }
  get(actor:ActorContext,applicationId:string) {
    requireRoles(actor,readerRoles);const app=Id.parse(applicationId);
    return decisionOperation(()=>this.uow.run(actor,async tx=>{
      await this.ports.authorizeStaff(tx,app);
      const {c,state,reviewers}=await this.basis(tx,app),own=c.conflicts.find(f=>f.userId===actor.userId);
      const assigned=actor.roles.includes('officer')&&c.application.assignedOfficerId===actor.userId&&own?.status==='clear';
      const concerns=state.concerns.map(x=>{
        if(x.raised.event.kind!=='raise_concern')throw new Error('Expected concern history.');
        const check=x.check?.event.kind==='check_concern'?{id:x.check.id,recordedBy:x.check.recordedBy,recordedAt:x.check.recordedAt,...x.check.event.data}:null;
        const assignment=x.assignment?.event.kind==='assign_review'?{id:x.assignment.id,recordedBy:x.assignment.recordedBy,recordedAt:x.assignment.recordedAt,
          reviewerId:x.assignment.event.data.reviewerId,reviewerName:x.assignment.event.reviewerName,reason:x.assignment.event.data.reason}:null;
        const disposition=x.disposition?.event.kind==='review_disposition'?{id:x.disposition.id,recordedBy:x.disposition.recordedBy,recordedAt:x.disposition.recordedAt,
          outcome:x.disposition.event.data.outcome,reason:x.disposition.event.data.reason}:null;
        return {id:x.raised.id,recordedBy:x.raised.recordedBy,recordedAt:x.raised.recordedAt,origin:'manual',source:x.raised.event.data.source,
          description:x.raised.event.data.description,state:x.state,check:check?{id:check.id,recordedBy:check.recordedBy,recordedAt:check.recordedAt,outcome:check.outcome,reason:check.reason,correctedText:check.correctedText}:null,assignment,disposition};
      });
      const current=state.proof.state==='current';
      const status=!state.evidenceCurrent?'assessment_unavailable':concerns.some(x=>x.state==='awaiting_check')?'awaiting_concern_check'
        :concerns.some(x=>x.state!=='resolved'&&x.state!=='dismissed')?'escalated_review':current?'ready':'needs_confirmation';
      const confirmation=state.confirmation?.event.kind==='confirm_current'?{id:state.confirmation.id,recordedBy:state.confirmation.recordedBy,
        recordedAt:state.confirmation.recordedAt,mode:'manual',reason:state.confirmation.event.data.reason,current}:null;
      return DecisionReviewSchema.parse({applicationId:app,version:c.application.version,inputVersion:c.application.assessmentInputVersion,
        reviewVersion:state.revision,evidenceBasisHash:state.hash,state:status,message:current?'The recorded evidence check is current. A separate authorized human decision is still required.':state.proof.state==='pending'?state.proof.reason:'Current review is unavailable.',
        confirmation,ownConflict:{status:own?.status??'unavailable',reference:own?.reference??null},
        canConfirm:assigned&&state.evidenceCurrent&&concerns.every(x=>x.state==='resolved'||x.state==='dismissed'),canRaiseConcern:assigned,canCheckConcerns:assigned,
        concerns,reviewers,sources:await this.ports.sourceMetadata(tx,app)});
    }));
  }
  declare(actor:ActorContext,app:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['officer','reviewer']);const data=DecisionConflictCreateSchema.parse(input);
    return this.write(actor,app,version,key,'decision.review.declare',data,async(tx,{c})=>{
      if(c.application.assignedOfficerId!==actor.userId&&!(c.authority.status==='configured'&&c.authority.grants.some(g=>g.userId===actor.userId)))throw new ApiError(403,'review_grant_required','This account has no preparation assignment or configured reviewer grant.');
      const receipt=CommandReceiptSchema.parse((await tx.query('SELECT decisions.record_conflict_declaration($1,$2,$3,$4) AS data',[app,version,data.status,data.reference])).rows[0]?.data);
      await recordEvent(tx,'decision.conflict_declared',app,receipt.version);return receipt;
    });
  }
  confirm(actor:ActorContext,app:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['officer']);const data=DecisionReviewConfirmSchema.parse(input);
    return this.write(actor,app,version,key,'decision.review.confirm',data,async(tx,review)=>{
      this.assigned(tx,review.c);this.checkBasis(review,data.evidenceBasisHash);validateReviewEvidence(review.c,this.now().toISOString());
      if(review.state.concerns.some(x=>x.state!=='resolved'&&x.state!=='dismissed'))throw new ApiError(409,'concern_review_required','Check every concern and complete its required assigned review before confirming currentness.');
      return this.persist(tx,app,version,{kind:'confirm_current',data});
    });
  }
  raise(actor:ActorContext,app:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['officer']);const data=DecisionConcernCreateSchema.parse(input);
    return this.write(actor,app,version,key,'decision.review.raise',data,async(tx,review)=>{
      this.assigned(tx,review.c);this.checkBasis(review,data.evidenceBasisHash);
      if(review.state.concerns.length>=100)throw new ApiError(409,'concern_capacity','This review requires a complete expanded concern inventory before adding another item.');
      const source=await this.ports.citation(tx,app,data.source);
      return this.persist(tx,app,version,{kind:'raise_concern',data:{...data,source}});
    });
  }
  check(actor:ActorContext,app:string,concernId:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['officer']);Id.parse(concernId);const data=DecisionConcernCheckSchema.parse(input);
    return this.write(actor,app,version,key,'decision.review.check',{concernId,data},async(tx,review)=>{
      this.assigned(tx,review.c);this.checkBasis(review,data.evidenceBasisHash);
      if(!review.state.concerns.some(x=>x.raised.id===concernId))throw notFound();
      return this.persist(tx,app,version,{kind:'check_concern',concernId,data});
    });
  }
  assign(actor:ActorContext,app:string,concernId:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['officer']);Id.parse(concernId);const data=DecisionReviewAssignmentSchema.parse(input);
    return this.write(actor,app,version,key,'decision.review.assign',{concernId,data},async(tx,review)=>{
      this.assigned(tx,review.c);this.checkBasis(review,data.evidenceBasisHash);
      const concern=review.state.concerns.find(x=>x.raised.id===concernId),reviewer=review.reviewers.find(r=>r.userId===data.reviewerId&&r.available);
      if(!concern)throw notFound();
      if(!['needs_assignment','escalated','resolved'].includes(concern.state)||!reviewer)throw new ApiError(409,'reviewer_assignment_required','Check the concern and choose a separate currently eligible reviewer.');
      return this.persist(tx,app,version,{kind:'assign_review',concernId,reviewerName:reviewer.displayName,data});
    });
  }
  dispose(actor:ActorContext,app:string,concernId:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['reviewer']);Id.parse(concernId);const data=DecisionReviewDispositionSchema.parse(input);
    return this.write(actor,app,version,key,'decision.review.dispose',{concernId,data},async(tx,review)=>{
      this.ownClear(review.c,actor.userId);this.checkBasis(review,data.evidenceBasisHash);
      const concern=review.state.concerns.find(x=>x.raised.id===concernId);
      if(!concern)throw notFound();
      if(!concern.assignment||concern.assignment.id!==data.assignmentId||concern.assignment.event.kind!=='assign_review'
        ||concern.assignment.event.data.reviewerId!==actor.userId||!review.reviewers.some(r=>r.userId===actor.userId&&r.available)
        ||!['escalated','resolved'].includes(concern.state))throw new ApiError(403,'assigned_reviewer_required','Only the current separate assigned reviewer may record this disposition.');
      return this.persist(tx,app,version,{kind:'review_disposition',concernId,data});
    });
  }
  reassignPreparation(actor:ActorContext,app:string,input:unknown,version:number,key:unknown) {
    requireRoles(actor,['administrator']);requireFreshMfa(actor);Id.parse(app);Version.parse(version);const data=AssignmentCreateSchema.parse(input);
    return decisionOperation(()=>this.uow.run(actor,async tx=>{
      requireLendingTransaction(tx);
      if(!(await tx.query('SELECT id FROM applications.applications WHERE organization_id=$1 AND id=$2',[actor.organizationId,app])).rowCount)throw notFound();
      return command(tx,`decision.review.reassign-preparation:${app}`,key,{app,version,data},()=>this.persist(tx,app,version,{kind:'reassign_preparation',data}));
    }));
  }
  history(actor:ActorContext,app:string,input:unknown={}) {
    requireRoles(actor,readerRoles);Id.parse(app);const query=Page.parse(input);
    return decisionOperation(()=>this.uow.run(actor,async tx=>{
      await this.ports.authorizeStaff(tx,app);
      const cursor=query.cursor?(await tx.query('SELECT review_version FROM decisions.staff_review_events WHERE organization_id=$1 AND application_id=$2 AND id=$3',[actor.organizationId,app,query.cursor])).rows[0]:null;
      if(query.cursor&&!cursor)throw notFound();
      const rows=(await tx.query(`SELECT * FROM decisions.staff_review_events WHERE organization_id=$1 AND application_id=$2
        AND ($3::bigint IS NULL OR review_version<$3) ORDER BY review_version DESC LIMIT $4`,[actor.organizationId,app,cursor?.review_version??null,query.limit+1])).rows;
      const items=rows.slice(0,query.limit).map(r=>DecisionReviewEventSchema.parse({id:r.id,version:Number(r.review_version),recordedBy:r.actor_id,recordedAt:(r.recorded_at as Date).toISOString(),evidenceBasisHash:r.evidence_basis_hash,event:r.payload}));
      return DecisionReviewEventPageSchema.parse({items,nextCursor:rows.length>query.limit?items.at(-1)!.id:null});
    }));
  }
  notices(actor:ActorContext,input:unknown={}) {
    requireRoles(actor,['reviewer']);const query=Page.parse(input);
    return decisionOperation(()=>this.uow.run(actor,async tx=>{
      requireLendingTransaction(tx);
      const cursor=query.cursor?(await tx.query('SELECT created_at,id FROM decisions.own_review_notices WHERE organization_id=$1 AND id=$2',[actor.organizationId,query.cursor])).rows[0]:null;
      if(query.cursor&&!cursor)throw notFound();
      const rows=(await tx.query(`SELECT * FROM decisions.own_review_notices WHERE organization_id=$1
        AND ($2::timestamptz IS NULL OR (created_at,id)<($2::timestamptz,$3::uuid)) ORDER BY created_at DESC,id DESC LIMIT $4`,[actor.organizationId,cursor?.created_at??null,cursor?.id??null,query.limit+1])).rows;
      const items=rows.slice(0,query.limit).map(r=>({id:r.id,applicationId:r.application_id,concernId:r.concern_id,assignmentId:r.assignment_id,
        createdAt:(r.created_at as Date).toISOString(),acknowledgedAt:r.acknowledged_at?(r.acknowledged_at as Date).toISOString():null}));
      return DecisionNoticePageSchema.parse({items,nextCursor:rows.length>query.limit?items.at(-1)!.id:null});
    }));
  }
  acknowledge(actor:ActorContext,noticeId:string,input:unknown,key:unknown) {
    requireRoles(actor,['reviewer']);Id.parse(noticeId);const data=DecisionNoticeAcknowledgmentSchema.parse(input);
    return decisionOperation(()=>this.uow.run(actor,async tx=>{
      requireLendingTransaction(tx);
      if(!(await tx.query('SELECT id FROM decisions.own_review_notices WHERE organization_id=$1 AND id=$2',[actor.organizationId,noticeId])).rowCount)throw notFound();
      return command(tx,`decision.review.acknowledge:${noticeId}`,key,{noticeId,data},async()=>{
        const receipt=CommandReceiptSchema.parse((await tx.query('SELECT decisions.acknowledge_review_notice($1) AS data',[noticeId])).rows[0]?.data);
        await recordEvent(tx,'decision.review_notice_acknowledged',noticeId,1);return receipt;
      });
    }));
  }
}
