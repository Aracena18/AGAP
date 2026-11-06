import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext,MemberActorContext,UnitOfWork,MemberUnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { PreparedReview,PreparedReviewPacket } from '../../../../../packages/contracts/src/prepared-review.js';
import type { WorkflowView } from '../../../../../packages/contracts/src/workflow.js';
import { comparePrepared } from '../../../../../packages/finance/src/prepared-review.js';
import { canonical } from '../../platform/commands.js';
import { WorkflowService } from '../evidence/workflow.service.js';
import { Id,Instant,Version } from '../../../../../packages/contracts/src/common.js';
import { GuidanceService } from '../evidence/guidance.service.js';
import { ApiError } from '../../platform/errors.js';
export function preparedBasis(view:z.output<typeof WorkflowView>,guidanceRevision=1){return createHash('sha256').update(canonical([view.applicationId,view.inputVersion,view.sources,view.facts,view.drafts,view.offers,view.latestAssessment,guidanceRevision])).digest('hex');}
export class PreparedReviewService{
 constructor(private readonly workflow:WorkflowService,private readonly uow:UnitOfWork,private readonly memberUow:MemberUnitOfWork){}
 read(actor:ActorContext|MemberActorContext,id:string){
  if(!('kind' in actor)&&!actor.roles.some(r=>['officer','reviewer','auditor'].includes(r)))throw new ApiError(403,'review_access_required','Lending review access is required.');
  const work=async(tx:import('../../../../../packages/contracts/src/ports.js').TransactionContext|import('../../../../../packages/contracts/src/ports.js').MemberTransactionContext)=>{
   const application=await this.workflow.access(tx,id);
   const row=(await tx.query('SELECT body,basis_hash FROM reviews.prepared_packets WHERE application_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[id])).rows[0];
   if(!row)return PreparedReview.parse({state:'absent'});
   if(application.status==='decision_recorded')return PreparedReview.parse({state:'stale',message:'A separate loan decision has been recorded. Open the application to inspect its current saved decision.'});
   const view=await this.workflow.viewIn(tx,id);
   const revision=Number((await tx.query('SELECT COALESCE(max(revision),1) AS revision FROM evidence.clarifications WHERE application_id=$1',[id])).rows[0].revision);
   if(row.basis_hash!==preparedBasis(view,revision))return PreparedReview.parse({state:'stale',message:'The saved review no longer matches the current information. Ask the cooperative to prepare a renewed review.'});
   const guidance=await new GuidanceService(this.workflow).readIn(tx,id);
   const packet=PreparedReviewPacket.parse(row.body);let comparisons:ReturnType<typeof comparePrepared>;
   try{comparisons=comparePrepared(view,packet);}catch{return PreparedReview.parse({state:'stale',message:'The saved financial review requires renewed assessment.'});}
   if(!comparisons.some(c=>c.offer.id===packet.requestedOfferId)||!comparisons.some(c=>c.offer.id===packet.suggestedOfferId)||packet.findings.some(f=>f.sourceIds.some(s=>!view.sources.some(source=>source.id===s))))throw new ApiError(503,'prepared_review_unavailable','The prepared review references are unavailable.');
   const requested=comparisons.find(c=>c.offer.id===packet.requestedOfferId)!;
   // Existing guarded bridge exposes only public recommendation fields, never staff snapshots/reasons.
   const current=(await tx.query('SELECT decisions.prepared_recommendation($1) AS body',[id])).rows[0]?.body;
   let recommendation=null;
   if(current){const rec=z.strictObject({id:Id,applicationId:Id,assessmentId:Id,inputVersion:Version,offerVersionId:Id,preparedAt:Instant}).parse(current),offer=view.offers.find(o=>o.id===rec.offerVersionId);if(offer&&comparisons.some(c=>c.offer.id===offer.id)&&rec.assessmentId===view.latestAssessment?.id&&rec.inputVersion===view.inputVersion)recommendation={id:rec.id,offer,recordedAt:rec.preparedAt};}
   return PreparedReview.parse({state:'ready',packet,workflow:view,guidance,comparisons,attention:requested.passes?'routine':'urgent',reason:requested.passes?'The requested schedule passes the supplied financial checks.':'The requested schedule needs review; compare the calculated alternative.',recommendation});
  };
  return 'kind' in actor?this.memberUow.run(actor,work):this.uow.run(actor,work);
 }
}
