import { z } from 'zod';
import type { TransactionContext } from '../../../../../packages/contracts/src/ports.js';
import { DecisionReviewEventSchema, Id, Version } from '../../../../../packages/contracts/src/schemas.js';
import { ApiError } from '../../platform/errors.js';
import { requireLendingTransaction } from '../../platform/lending-transaction.js';
import { ReviewReadinessSchema, type ReviewContext } from './context.js';
import { DecisionRuleError, reviewEvidenceHash, validateReviewEvidence } from './rules.js';

export type ReviewEvent=z.output<typeof DecisionReviewEventSchema>;
export const REVIEW_EVENT_LIMIT=1000;
export type ReviewerIdentity={userId:string;active:boolean;organizationId:string;branchIds:string[];roles:string[]};
/** Fold immutable human actions; this never changes facts or financial checks. */
export function evaluateReviewReadiness(c:ReviewContext,events:ReviewEvent[],revision:number,participants:ReviewerIdentity[],at=new Date().toISOString()) {
  if(events.length!==revision-1||events.some((e,index)=>e.version!==index+2)
    ||new Set(events.map(e=>e.id)).size!==events.length
    ||events.some(e=>e.event.kind==='reassign_preparation'?e.evidenceBasisHash!==null:e.event.data.evidenceBasisHash!==e.evidenceBasisHash))
    throw new ApiError(503,'review_integrity','The complete saved review stream cannot be verified. No readiness is claimed.');
  const hash=reviewEvidenceHash(c),officer=c.application.assignedOfficerId,latestFirst=[...events].reverse();
  let evidenceCurrent=false,evidenceMessage='';
  try{validateReviewEvidence(c,at);evidenceCurrent=true;}catch(error){if(!(error instanceof DecisionRuleError))throw error;evidenceMessage=error.message;}
  const validOfficer=!!officer&&participants.some(p=>p.userId===officer&&p.active&&p.organizationId===c.application.organizationId
    &&p.branchIds.includes(c.application.branchId)&&p.roles.includes('officer'))&&c.conflicts.some(f=>f.userId===officer&&f.status==='clear');
  const validReviewer=(userId:string)=>userId!==officer && participants.some(p=>p.userId===userId&&p.active
    &&p.organizationId===c.application.organizationId&&p.branchIds.includes(c.application.branchId)&&p.roles.includes('reviewer'))
    &&c.conflicts.some(f=>f.userId===userId&&f.status==='clear');
  const concerns=events.filter(e=>e.event.kind==='raise_concern').map(raised=>{
    if(raised.event.kind!=='raise_concern')throw new Error('Expected a concern.');
    const actions=latestFirst.filter(e=>e.evidenceBasisHash===hash&&'concernId' in e.event&&e.event.concernId===raised.id);
    const check=actions.find(e=>e.event.kind==='check_concern'&&e.recordedBy===officer);
    const assignment=actions.find(e=>e.event.kind==='assign_review'&&e.recordedBy===officer);
    const assignmentData=assignment?.event.kind==='assign_review'?assignment.event:null;
    const disposition=assignmentData?actions.find(e=>e.event.kind==='review_disposition'
      &&e.event.data.assignmentId===assignment!.id&&e.recordedBy===assignmentData.data.reviewerId):undefined;
    const checkData=check?.event.kind==='check_concern'?check.event.data:null;
    const dispositionData=disposition?.event.kind==='review_disposition'?disposition.event.data:null;
    const currentAssignment=assignmentData&&check&&assignment!.version>check.version&&validReviewer(assignmentData.data.reviewerId);
    const state=!checkData?'awaiting_check' as const:checkData.outcome==='dismissed'?'dismissed' as const
      :!currentAssignment?'needs_assignment' as const:dispositionData?.outcome==='resolved'&&disposition!.version>assignment!.version?'resolved' as const:'escalated' as const;
    return {raised,check,assignment,disposition,state};
  });
  if(concerns.length>100)throw new ApiError(503,'review_inventory_unavailable','The complete concern inventory exceeds this review interface. No readiness is claimed.');
  const confirmation=latestFirst.find(e=>e.event.kind==='confirm_current');
  const participantsNeeded=[...new Set(concerns.filter(x=>x.state==='resolved').flatMap(x=>x.disposition?[x.disposition.recordedBy]:[]))];
  const current=evidenceCurrent&&validOfficer&&!!confirmation&&confirmation.version===revision&&confirmation.evidenceBasisHash===hash&&confirmation.recordedBy===officer
    &&concerns.every(x=>x.state==='resolved'||x.state==='dismissed')&&participantsNeeded.every(validReviewer);
  const pending=!evidenceCurrent?evidenceMessage:!validOfficer?'Current clearance from the active assigned officer is required.':concerns.some(x=>x.state==='awaiting_check')?'Check every concern against the current sources.'
    :concerns.some(x=>x.state!=='resolved'&&x.state!=='dismissed')?'Complete the assigned review disposition for every escalated concern.'
      :'The assigned officer must confirm the complete current evidence and all checked scenarios.';
  const proof=ReviewReadinessSchema.parse(current?{state:'current',revision,confirmationId:confirmation!.id,confirmedBy:confirmation!.recordedBy,
    confirmedAt:confirmation!.recordedAt,evidenceBasisHash:hash,mode:'manual',reviewParticipantIds:participantsNeeded}:{state:'pending',revision,reason:pending});
  return {hash,revision,events,concerns,confirmation,proof,evidenceCurrent,evidenceMessage};
}
/** Staff-only owner projection on the caller transaction; no nested coordinator. */
export async function loadReviewReadiness(tx:TransactionContext,c:ReviewContext,participants:ReviewerIdentity[]) {
  requireLendingTransaction(tx);
  const stream=(await tx.query('SELECT version FROM decisions.staff_review_streams WHERE organization_id=$1 AND application_id=$2',[tx.actor.organizationId,c.application.id])).rows[0];
  const revision=stream?Version.parse(Number(stream.version)):1;
  const rows=(await tx.query(`SELECT id,review_version,actor_id,recorded_at,evidence_basis_hash,payload FROM decisions.staff_review_events
    WHERE organization_id=$1 AND application_id=$2 ORDER BY review_version LIMIT $3`,[tx.actor.organizationId,c.application.id,REVIEW_EVENT_LIMIT+1])).rows;
  if(rows.length>REVIEW_EVENT_LIMIT)throw new ApiError(503,'review_inventory_unavailable','The complete review history exceeds this interface. No partial readiness is claimed.');
  const events=rows.map(r=>DecisionReviewEventSchema.parse({id:r.id,version:Number(r.review_version),recordedBy:r.actor_id,
    recordedAt:(r.recorded_at as Date).toISOString(),evidenceBasisHash:r.evidence_basis_hash,event:r.payload}));
  const ids=new Set<string>();
  for(const e of events){Id.parse(e.id);if(ids.has(e.id)||e.version>revision)throw new ApiError(503,'review_integrity','The saved review history is inconsistent.');ids.add(e.id);}
  return evaluateReviewReadiness(c,events,revision,participants);
}
