import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ActorContext, TransactionContext, UnitOfWork } from '../../../../../packages/contracts/src/ports.js';
import { Id } from '../../../../../packages/contracts/src/common.js';
import { PriorityReviewRecover, PriorityReviewQueueQuery, PriorityRuleConcern, PriorityConcernCheck, PriorityEscalationAssign, PriorityEscalationDisposition, PriorityNoticeAck, PriorityReviewHistory, PriorityReviewNotices, PriorityReviewPage, PriorityReviewReceipt, PriorityReviewSummary, PriorityReviewers, PrioritySourceReview, type ReviewConcern, type ReviewEscalation, type ReviewQueueRow, type SourceSpan } from '../../../../../packages/contracts/src/priority-review.js';
import { ApiError, notFound } from '../../platform/errors.js';
import { canonical, command, recordEvent } from '../../platform/commands.js';
import { WorkflowService } from '../evidence/workflow.service.js';
import type { ReviewDecisionBasisPort, ReviewModelAdapter, ReviewTx } from './contracts.js';
import { deriveReadiness, materialHash, type GuardEvent, type MaterialContext } from './readiness.js';

type Event={id:string;kind:string;body:Record<string,unknown>;actor_id:string;version:number;recorded_at:Date|string};
const iso=(at:Date|string)=>new Date(at).toISOString();
const digest=(value:unknown)=>createHash('sha256').update(canonical(value)).digest('hex');
const receipt=(id:string,version:number,status:'saved'|'running'|'completed'|'failed',message:string)=>PriorityReviewReceipt.parse({id,version,status,message});
const cursorSchema=z.strictObject({id:Id,offset:z.number().int().min(0).max(500),scope:z.string().length(64)});
export class ReviewService {
 constructor(private readonly uow:UnitOfWork,private readonly workflow:WorkflowService,private readonly adapter:ReviewModelAdapter|null,private readonly basis:ReviewDecisionBasisPort){}
 private async access(tx:TransactionContext,id:string,prepare=false){
  Id.parse(id);const a=await this.workflow.access(tx,id);
  if(!tx.actor.roles.some(r=>['officer','reviewer','auditor'].includes(r)))throw notFound();
  if(prepare&&(!tx.actor.roles.includes('officer')||a.assigned_officer_id!==tx.actor.userId))throw new ApiError(403,'review_preparer_required','The assigned preparing officer must record this action.');
  return a;
 }
 private async events(tx:TransactionContext,id:string){return (await tx.query<Event>('SELECT id,kind,body,actor_id,version,recorded_at FROM reviews.staff_events WHERE application_id=$1 ORDER BY version',[id])).rows.map(e=>({...e,version:Number(e.version)}));}
 private async version(tx:TransactionContext,id:string){return Number((await tx.query<{version:string}>('SELECT COALESCE(max(version),1)::text AS version FROM reviews.staff_events WHERE application_id=$1',[id])).rows[0].version);}
 private async expected(tx:TransactionContext,id:string,version:number){if(await this.version(tx,id)!==version)throw new ApiError(412,'stale_review','The review changed. Refresh it before saving.');}
 private async append(tx:TransactionContext,id:string,kind:string,body:Record<string,unknown>){
  const version=await this.version(tx,id)+1;
  await tx.query('INSERT INTO reviews.events(id,organization_id,application_id,version,kind,body,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),tx.actor.organizationId,id,version,kind,JSON.stringify(body),tx.actor.userId]);
  await recordEvent(tx,`review.${kind}`,id,version);return version;
 }
 private async inputs(tx:ReviewTx,id:string){
  Id.parse(id);const value=(await tx.query<{body:MaterialContext|null}>('SELECT reviews.material_context($1) AS body',[id])).rows[0]?.body;if(!value)throw notFound();
  const basis=await this.basis.load(tx,id),events=(await tx.query<{body:GuardEvent[]|null}>('SELECT reviews.guard_events($1) AS body',[id])).rows[0]?.body;
  if(!events)throw notFound();return {context:value,basis,events};
 }
 async readinessIn(tx:ReviewTx,id:string,options:{requireRecommendation?:boolean}={}){const i=await this.inputs(tx,id);return deriveReadiness(i.context,i.basis,i.events,options);}
 async readyGuard(tx:ReviewTx,id:string,options:{requireRecommendation?:boolean}={}){
  const result=await this.readinessIn(tx,id,options);if(!result.ready)throw new ApiError(409,'review_not_ready',result.nextAction,result.blockers.map(b=>({path:'review',message:b.message})));
 }
 async concernGuard(tx:ReviewTx,id:string){const r=await this.readinessIn(tx,id);const blockers=r.blockers.filter(b=>b.code.startsWith('concern_')||b.code==='material_concern');if(blockers.length)throw new ApiError(409,'concern_review_required','Check and resolve the current source-linked concerns before proceeding.');}
 private folded(events:Event[],hash:string){
  const concerns=new Map<string,ReviewConcern>(),escalations=new Map<string,ReviewEscalation>();
  for(const e of events){const b=e.body;
   if(e.kind==='concern')concerns.set(String(b.id),{...(b as unknown as ReviewConcern),stale:false});
   if(e.kind==='check'){const c=concerns.get(String(b.concernId));if(c)Object.assign(c,{state:b.state,text:b.text,material:b.material,basisHash:b.basisHash,checkedBy:e.actor_id,checkedAt:iso(e.recorded_at),reason:b.reason});}
   if(e.kind==='escalation')escalations.set(String(b.id),{...(b as unknown as ReviewEscalation),stale:false});
   if(e.kind==='disposition'){const s=escalations.get(String(b.escalationId));if(s)Object.assign(s,{state:b.state,basisHash:b.basisHash,dispositionBy:e.actor_id,dispositionAt:iso(e.recorded_at),dispositionReason:b.reason});}
  }
  return {concerns:[...concerns.values()].map(c=>({...c,stale:c.basisHash!==hash})),escalations:[...escalations.values()].map(e=>({...e,stale:e.basisHash!==hash}))};
 }
 private async summaryIn(tx:TransactionContext,id:string){
  const a=await this.access(tx,id),i=await this.inputs(tx,id),readiness=deriveReadiness(i.context,i.basis,i.events),events=await this.events(tx,id),folded=this.folded(events,readiness.materialHash);
  const pendingReviews=(await tx.query<{id:string;created_at:Date;interrupted:boolean}>("SELECT id,created_at,lease_until<now() AS interrupted FROM reviews.staff_requests WHERE application_id=$1 AND state='running' ORDER BY created_at,id",[id])).rows.map(r=>({id:r.id,createdAt:iso(r.created_at),interrupted:r.interrupted}));
  const submitted=(await tx.query<{at:Date|null}>("SELECT min(recorded_at) AS at FROM applications.application_revisions WHERE application_id=$1 AND snapshot->>'status'='submitted'",[id])).rows[0]?.at;
  return PriorityReviewSummary.parse({applicationId:id,memberName:(await tx.query<{full_name:string}>('SELECT full_name FROM members.members WHERE id=$1',[a.member_id])).rows[0]?.full_name??'Member record unavailable',applicationStatus:a.status,applicationVersion:Number(a.version),inputVersion:Number(a.assessment_input_version),version:events.at(-1)?.version??1,assignedOfficerId:a.assigned_officer_id,queueEnteredAt:iso(submitted??a.created_at as Date),queueEntryBasis:submitted?'first_submission':'recorded_received_date',asOf:new Date().toISOString(),readiness,pendingReviews,...folded,canPrepare:tx.actor.roles.includes('officer')&&a.assigned_officer_id===tx.actor.userId,canDisposition:i.basis.eligibleReviewers.some(r=>r.id===tx.actor.userId)&&folded.escalations.some(e=>e.reviewerId===tx.actor.userId&&e.state==='open'&&!e.stale)});
 }
 summary(actor:ActorContext,id:string){return this.uow.run(actor,tx=>this.summaryIn(tx,id));}
 history(actor:ActorContext,id:string){return this.uow.run(actor,async tx=>{await this.access(tx,id);return PriorityReviewHistory.parse({events:(await this.events(tx,id)).map(e=>({id:e.id,version:e.version,type:e.kind,actorId:e.actor_id,at:iso(e.recorded_at),reason:typeof e.body.reason==='string'?e.body.reason:''}))});});}
 reviewers(actor:ActorContext,id:string){return this.uow.run(actor,async tx=>{await this.access(tx,id);return PriorityReviewers.parse({items:(await this.basis.load(tx,id)).eligibleReviewers});});}
 queue(actor:ActorContext,input:unknown){const query=PriorityReviewQueueQuery.parse(input);return this.uow.run(actor,async tx=>{
  if(!actor.roles.some(r=>['officer','reviewer','auditor'].includes(r)))throw new ApiError(403,'review_queue_forbidden','This queue is for authorized lending review staff.');
  const scope=digest({user:actor.userId,organization:actor.organizationId,branches:[...actor.branchIds].sort(),roles:[...actor.roles].sort(),route:query.route});let rows:ReviewQueueRow[],asOf:string,id:string,offset=0;
  if(query.cursor){let c:z.output<typeof cursorSchema>;try{c=cursorSchema.parse(JSON.parse(Buffer.from(query.cursor,'base64url').toString()));}catch{throw new ApiError(422,'review_cursor','Refresh the queue to start a current read.');}
   if(c.scope!==scope)throw new ApiError(422,'review_cursor_scope','Refresh the queue after changing filters or access.');
   const saved=(await tx.query<{body:{rows:ReviewQueueRow[];asOf:string};created_at:Date}>('SELECT body,created_at FROM reviews.queue_snapshots WHERE id=$1 AND scope_hash=$2',[c.id,scope])).rows[0];
   if(!saved||Date.now()-new Date(saved.created_at).getTime()>15*60_000)throw new ApiError(409,'review_cursor_expired','The queue snapshot expired. Refresh the queue.');
   rows=saved.body.rows;asOf=saved.body.asOf;id=c.id;offset=c.offset;if(offset>rows.length)throw new ApiError(422,'review_cursor','Refresh the queue to start a current read.');
  }else{
   const apps=(await tx.query<{id:string}>("SELECT id FROM applications.applications WHERE organization_id=$1 AND status<>'draft' AND status<>'decision_recorded' AND reviews.can_read(id) ORDER BY id LIMIT 501",[actor.organizationId])).rows;
   if(apps.length>500)throw new ApiError(503,'review_queue_limit','This fictional pilot supports at most 500 active applications in one queue snapshot.');
   rows=[];asOf=new Date().toISOString();id=randomUUID();
   for(const app of apps){const s=await this.summaryIn(tx,app.id);const material=s.concerns.some(c=>c.material&&c.state!=='unchecked'&&c.state!=='dismissed'&&!c.stale&&s.readiness.blockers.some(b=>b.code==='material_concern'&&b.concernId===c.id));
    if(query.route!=='all'&&s.readiness.route!==query.route)continue;
    const {pendingReviews:_r,concerns:_c,escalations:_e,canPrepare:_p,canDisposition:_d,...base}=s;void _r;void _c;void _e;void _p;void _d;
    rows.push({...base,asOf,attentionGroup:material?'substantiated_material':'other',positionReason:material?'Current human-confirmed material concern; then original waiting time and application ID.':'No unresolved substantiated material concern; original waiting time and application ID.'});
   }
   rows.sort((a,b)=>(a.attentionGroup==='substantiated_material'?0:1)-(b.attentionGroup==='substantiated_material'?0:1)||a.queueEnteredAt.localeCompare(b.queueEnteredAt)||a.applicationId.localeCompare(b.applicationId));
   await tx.query('INSERT INTO reviews.queue_snapshots(id,organization_id,actor_id,scope_hash,body) VALUES($1,$2,$3,$4,$5)',[id,actor.organizationId,actor.userId,scope,JSON.stringify({rows,asOf})]);
  }
  const page=rows.slice(offset,offset+query.limit);for(const row of page)await this.access(tx,row.applicationId);
  const next=offset+page.length<rows.length?Buffer.from(JSON.stringify({id,offset:offset+page.length,scope})).toString('base64url'):null;
  return PriorityReviewPage.parse({items:page,nextCursor:next,asOf});
 });}
 rule(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){const data=PriorityRuleConcern.parse(input);return this.uow.run(actor,async tx=>{await this.access(tx,id,true);return command(tx,`review.rule:${id}`,key,{data,version},async()=>{
  await this.expected(tx,id,version);const view=await this.workflow.viewIn(tx,id),assessment=view.latestAssessment,check=assessment?.scenarios.find(s=>s.offerId===data.offerId)?.checks.find(c=>c.id===data.checkId);
  if(!assessment||assessment.id!==data.assessmentId||assessment.stale||!check||check.passed)throw new ApiError(409,'rule_concern_unavailable','Choose a failed check from the current saved assessment.');
  const s=await this.summaryIn(tx,id),existing=s.concerns.find(c=>c.assessmentId===data.assessmentId&&c.ruleId===`${data.offerId}:${data.checkId}`);if(existing)return receipt(existing.id,s.version,'saved','This assessed check already has a retained concern.');
  const c:ReviewConcern={id:randomUUID(),requestId:null,assessmentId:assessment.id,ruleId:`${data.offerId}:${data.checkId}`,origin:'checked_rule',issueCode:'FINANCIAL_CHECK',text:check.detail,question:'What supported evidence or separately authorized action addresses this failed check?',evidence:[],state:'unchecked',material:false,basisHash:s.readiness.materialHash,stale:false,checkedBy:null,checkedAt:null,reason:'',createdAt:new Date().toISOString()};
  const next=await this.append(tx,id,'concern',c as unknown as Record<string,unknown>);return receipt(c.id,next,'saved','Failed assessment check recorded for human review. Its calculation has not changed.');
 });});}
 check(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){const data=PriorityConcernCheck.parse(input);return this.uow.run(actor,async tx=>{await this.access(tx,id,true);return command(tx,`review.check:${id}`,key,{data,version},async()=>{
  await this.expected(tx,id,version);const s=await this.summaryIn(tx,id),c=s.concerns.find(c=>c.id===data.concernId);if(!c)throw notFound();
  const view=await this.workflow.viewIn(tx,id);
  const changed=c.evidence.some(e=>!view.sources.some(source=>source.id===e.span.sourceId&&source.version===e.span.sourceVersion&&source.textVersionId===e.span.textVersionId&&source.state==='cleared'&&source.pages.some(page=>page.page===e.span.page&&page.text.slice(e.span.start,e.span.end)===e.quote)));
  const obsoleteDismissal=data.action==='dismiss'&&c.evidence.every(e=>!view.facts.some(f=>f.input.relevance==='included'&&f.sourceId===e.span.sourceId));
  if(changed&&!obsoleteDismissal)throw new ApiError(409,'concern_source_changed','The original source is no longer current. Request a new source review while retaining this history.');
  if(data.action==='dismiss'&&data.material)throw new ApiError(422,'dismissed_material','A dismissed suggestion cannot remain a confirmed material concern.');
  const next=await this.append(tx,id,'check',{concernId:c.id,state:data.action==='confirm'?'confirmed':data.action==='correct'?'corrected':'dismissed',text:data.text,material:data.material,basisHash:s.readiness.materialHash,reason:data.reason});
  return receipt(c.id,next,'saved','Concern check saved. Financial facts and source verification were not changed.');
 });});}
 assign(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){const data=PriorityEscalationAssign.parse(input);return this.uow.run(actor,async tx=>{await this.access(tx,id,true);return command(tx,`review.assign:${id}`,key,{data,version},async()=>{
  await this.expected(tx,id,version);const s=await this.summaryIn(tx,id),roster=(await this.basis.load(tx,id)).eligibleReviewers;
  if(data.reviewerId&&!roster.some(r=>r.id===data.reviewerId))throw new ApiError(403,'reviewer_ineligible','Choose a current eligible reviewer. The preparer cannot review their own escalation.');
  if(new Set(data.concernIds).size!==data.concernIds.length||data.concernIds.some(cid=>!s.concerns.some(c=>c.id===cid&&c.material&&!c.stale&&['confirmed','corrected'].includes(c.state))))throw new ApiError(409,'concern_not_substantiated','Check the current source and confirm materiality before escalation.');
  const escalationId=randomUUID(),at=new Date().toISOString(),next=await this.append(tx,id,'escalation',{id:escalationId,concernIds:data.concernIds,reviewerId:data.reviewerId,assignedBy:actor.userId,assignedAt:at,reason:data.reason,state:'open',basisHash:s.readiness.materialHash,stale:false,dispositionBy:null,dispositionAt:null,dispositionReason:''});
  if(data.reviewerId)await tx.query('INSERT INTO reviews.notices(id,organization_id,application_id,escalation_id,recipient_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[randomUUID(),actor.organizationId,id,escalationId,data.reviewerId]);
  return receipt(escalationId,next,'saved',data.reviewerId?'Escalation and in-app notice saved. This is separate from a lending decision.':'Unassigned escalation saved. An eligible reviewer is still required.');
 });});}
 disposition(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){const data=PriorityEscalationDisposition.parse(input);return this.uow.run(actor,async tx=>{await this.access(tx,id);return command(tx,`review.disposition:${id}`,key,{data,version},async()=>{
  await this.expected(tx,id,version);const s=await this.summaryIn(tx,id),e=s.escalations.find(e=>e.id===data.escalationId),roster=(await this.basis.load(tx,id)).eligibleReviewers;
  if(!e||e.reviewerId!==actor.userId||!roster.some(r=>r.id===actor.userId)||s.assignedOfficerId===actor.userId)throw new ApiError(403,'escalation_reviewer_required','Only the current assigned eligible reviewer may record this disposition.');
  const latest=s.escalations.filter(other=>other.concernIds.some(cid=>e.concernIds.includes(cid))).at(-1);if(latest?.id!==e.id||e.stale||e.state!=='open')throw new ApiError(409,'escalation_stale','This escalation has changed or needs checking against the current evidence.');
  const next=await this.append(tx,id,'disposition',{escalationId:e.id,state:data.action,basisHash:s.readiness.materialHash,reason:data.reason});
  return receipt(e.id,next,'saved','Reviewer disposition saved. Independent financial and authority checks still apply.');
 });});}
 async request(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){
  const data=PrioritySourceReview.parse(input);if(!this.adapter)throw new ApiError(501,'module_not_available','Automatic source review is unavailable. Inspect the source and use manual entry.');
  const adapter=this.adapter;let run:{id:string;token:string;body:{question:string;sources:{source_id:string;quote:string;span:SourceSpan}[]};hash:string}|null=null;
  const initial=await this.uow.run(actor,async tx=>{await this.access(tx,id,true);
   const created=await command(tx,`review.source:${id}`,key,{data,version},async()=>{
    await this.expected(tx,id,version);const view=await this.workflow.viewIn(tx,id),i=await this.inputs(tx,id),sources=data.sources.map((span,index)=>{
     const source=view.sources.find(s=>s.id===span.sourceId&&s.version===span.sourceVersion&&s.textVersionId===span.textVersionId&&s.state==='cleared'),page=source?.pages.find(p=>p.page===span.page);
     if(!source||!page||span.end>page.text.length)throw new ApiError(409,'review_source_changed','Choose a current cleared source excerpt.');
     return {source_id:`source_${index+1}`,quote:page.text.slice(span.start,span.end),span};
    });
    const requestId=randomUUID(),token=randomUUID(),hash=materialHash(i.context,i.basis),body={question:data.question,sources};
    await tx.query("INSERT INTO reviews.requests(id,organization_id,application_id,body,basis_hash,origin,provenance,state,lease_token,lease_until) VALUES($1,$2,$3,$4,$5,$6,$7,'running',$8,now()+interval '2 minutes')",[requestId,actor.organizationId,id,JSON.stringify(body),hash,adapter.origin,JSON.stringify(adapter.provenance),token]);
    const next=await this.append(tx,id,'request',{requestId,reason:'Source-linked qualitative review requested; no financial fact created.'});run={id:requestId,token,body,hash};
    return receipt(requestId,next,'running','Source review requested. Its output still requires a human check.');
   });
   if(!run){const saved=(await tx.query<{state:string;body:{question:string;sources:{source_id:string;quote:string;span:SourceSpan}[]};basis_hash:string;lease_until:Date;receipt:unknown}>('SELECT state,body,basis_hash,lease_until,receipt FROM reviews.staff_requests WHERE id=$1 AND application_id=$2',[created.id,id])).rows[0];
    if(!saved)throw notFound();if(saved.state!=='running'&&saved.receipt)return PriorityReviewReceipt.parse(saved.receipt);if(saved.state!=='running')return receipt(created.id,await this.version(tx,id),saved.state==='completed'?'completed':'failed','The saved source review result is available in the concern history.');
    if(new Date(saved.lease_until).getTime()<Date.now()){const view=await this.workflow.viewIn(tx,id);if(saved.body.sources.some(e=>!view.sources.some(source=>source.id===e.span.sourceId&&source.version===e.span.sourceVersion&&source.textVersionId===e.span.textVersionId&&source.state==='cleared'&&source.pages.some(page=>page.page===e.span.page&&page.text.slice(e.span.start,e.span.end)===e.quote))))return this.recoverIn(tx,id,created.id,'Source changed before retry; the retained text was not sent again.');const token=randomUUID();await tx.query("UPDATE reviews.requests SET lease_token=$2,lease_until=now()+interval '2 minutes' WHERE id=$1 AND state='running'",[created.id,token]);run={id:created.id,token,body:saved.body,hash:saved.basis_hash};}
   }return created;
  });
  if(!run){if(initial.status==='running')throw new ApiError(503,'source_review_running','This source review is still processing. Retry the same submission to reconcile its result.');return initial;}
  const job=run as {id:string;token:string;body:{question:string;sources:{source_id:string;quote:string;span:SourceSpan}[]};hash:string};
  let result:Awaited<ReturnType<ReviewModelAdapter['review']>>;try{result=await adapter.review({question:job.body.question,sources:job.body.sources.map(({source_id,quote})=>({source_id,quote}))},AbortSignal.timeout(90_000));}catch{result={status:'REJECT_AND_ESCALATE',reasons:['Automatic review failed. Check the selected excerpts manually.'],payload:null,financial_semantics_verified:false,loan_decision_permitted:false};}
  return this.uow.run(actor,async tx=>{await this.access(tx,id,true);const saved=(await tx.query<{state:string;lease_token:string;receipt:unknown}>('SELECT state,lease_token,receipt FROM reviews.staff_requests WHERE id=$1 AND application_id=$2',[job.id,id])).rows[0];
   if(saved?.state!=='running'&&saved?.receipt)return PriorityReviewReceipt.parse(saved.receipt);
   if(!saved||saved.state!=='running'||saved.lease_token!==job.token)throw new ApiError(503,'source_review_running','The request is being reconciled. Retry the original submission to read its saved result.');
   const valid=result.status==='REQUIRES_HUMAN_REVIEW'&&result.source_text_match_verified===true&&result.financial_semantics_verified===false&&result.loan_decision_permitted===false&&result.payload?.loan_decision===null;
   const evidence:ReviewConcern['evidence']=[];if(valid&&result.payload)for(const reference of result.payload.evidence){const source=job.body.sources.find(s=>s.source_id===reference.source_id),offset=source?.quote.indexOf(reference.quote)??-1;if(!source||offset<0||!reference.quote||reference.verification_status!=='source_asserted_not_independently_verified')throw new ApiError(503,'source_review_invalid','The model returned an unsupported source. Inspect the original excerpt.');evidence.push({span:{...source.span,start:source.span.start+offset,end:source.span.start+offset+reference.quote.length},quote:reference.quote});}
   const accepted=valid&&evidence.length>0&&!!result.payload;
   const c:ReviewConcern={id:randomUUID(),requestId:job.id,assessmentId:null,ruleId:null,origin:adapter.origin,issueCode:accepted?result.payload!.issue_code:'REVIEW_UNAVAILABLE',text:accepted?result.payload!.finding:'Automatic review could not provide a source-grounded result. Check the selected excerpts manually.',question:accepted?result.payload!.clarification_question:'What does the selected source support, and what still needs clarification?',evidence:accepted?evidence:job.body.sources.map(s=>({span:s.span,quote:s.quote})),state:'unchecked',material:false,basisHash:job.hash,stale:false,checkedBy:null,checkedAt:null,reason:'',createdAt:new Date().toISOString()};
   const next=await this.append(tx,id,'concern',c as unknown as Record<string,unknown>),completed=receipt(job.id,next,accepted?'completed':'failed',accepted?'Source-linked draft saved. The preparing officer must check it before use.':'Automatic review was unavailable. A source-linked manual check remains available.');await tx.query('UPDATE reviews.requests SET state=$2,result=$3,receipt=$5 WHERE id=$1 AND lease_token=$4',[job.id,accepted?'completed':'failed',JSON.stringify(result),job.token,JSON.stringify(completed)]);return completed;
  });
 }

 private async recoverIn(tx:TransactionContext,id:string,requestId:string,reason:string){
  const saved=(await tx.query<{state:string;lease_until:Date;receipt:unknown;body:{sources:{span:SourceSpan;quote:string}[]};basis_hash:string;origin:'model'|'simulated'}>('SELECT state,lease_until,receipt,body,basis_hash,origin FROM reviews.staff_requests WHERE id=$1 AND application_id=$2',[requestId,id])).rows[0];
  if(!saved)throw notFound();if(saved.state!=='running'){if(saved.receipt)return PriorityReviewReceipt.parse(saved.receipt);throw new ApiError(409,'review_already_reconciled','Inspect the saved result in review history.');}
  if(new Date(saved.lease_until).getTime()>=Date.now())throw new ApiError(409,'review_still_running','The generation deadline has not elapsed. Wait, then refresh this review.');
  const c:ReviewConcern={id:randomUUID(),requestId,assessmentId:null,ruleId:null,origin:saved.origin,issueCode:'REVIEW_INTERRUPTED',text:'The source review stopped before its result was saved. Check the retained source selection manually.',question:'What does the available evidence support, and what still needs clarification?',evidence:saved.body.sources.map(e=>({span:e.span,quote:e.quote})),state:'unchecked',material:false,basisHash:saved.basis_hash,stale:false,checkedBy:null,checkedAt:null,reason:'',createdAt:new Date().toISOString()};
  await this.append(tx,id,'concern',c as unknown as Record<string,unknown>);const recovered=await this.append(tx,id,'request_recovery',{requestId,reason});const completed=receipt(requestId,recovered,'failed','Interrupted review reconciled. A source-linked manual check remains required.');
  await tx.query("UPDATE reviews.requests SET state='failed',lease_token=$2,receipt=$3 WHERE id=$1",[requestId,randomUUID(),JSON.stringify(completed)]);return completed;
 }
 recover(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){const data=PriorityReviewRecover.parse(input);return this.uow.run(actor,async tx=>{await this.access(tx,id,true);return command(tx,`review.recover:${id}`,key,{data,version},async()=>{await this.expected(tx,id,version);return this.recoverIn(tx,id,data.requestId,data.reason);});});}
 notices(actor:ActorContext){return this.uow.run(actor,async tx=>{
  const rows=(await tx.query<{id:string;application_id:string;escalation_id:string;created_at:Date;acknowledged_at:Date|null}>('SELECT n.id,n.application_id,n.escalation_id,n.created_at,a.acknowledged_at FROM reviews.notices n LEFT JOIN reviews.acknowledgments a ON a.notice_id=n.id WHERE n.recipient_id=$1 ORDER BY n.created_at DESC,n.id LIMIT 100',[actor.userId])).rows;
  const items=[];for(const n of rows){const s=await this.summaryIn(tx,n.application_id),e=s.escalations.find(e=>e.id===n.escalation_id),latest=e&&s.escalations.filter(other=>other.concernIds.some(cid=>e.concernIds.includes(cid))).at(-1),roster=(await this.basis.load(tx,n.application_id)).eligibleReviewers;
   if(e&&latest?.id===e.id&&e.reviewerId===actor.userId&&roster.some(r=>r.id===actor.userId))items.push({id:n.id,applicationId:n.application_id,escalationId:n.escalation_id,createdAt:iso(n.created_at),acknowledgedAt:n.acknowledged_at?iso(n.acknowledged_at):null,version:n.acknowledged_at?2:1,destination:`/staff/applications/${n.application_id}/review`,current:true});
  }return PriorityReviewNotices.parse({items});
 });}
 acknowledge(actor:ActorContext,id:string,input:unknown,version:number,key:unknown){const data=PriorityNoticeAck.parse(input);return this.uow.run(actor,async tx=>{
  const n=(await tx.query<{application_id:string;escalation_id:string}>('SELECT application_id,escalation_id FROM reviews.notices WHERE id=$1 AND recipient_id=$2',[id,actor.userId])).rows[0];if(!n)throw notFound();await this.access(tx,n.application_id);
  const s=await this.summaryIn(tx,n.application_id),e=s.escalations.find(e=>e.id===n.escalation_id),latest=e&&s.escalations.filter(other=>other.concernIds.some(cid=>e.concernIds.includes(cid))).at(-1),roster=(await this.basis.load(tx,n.application_id)).eligibleReviewers;
  if(!e||latest?.id!==e.id||e.reviewerId!==actor.userId||!roster.some(r=>r.id===actor.userId))throw notFound();
  return command(tx,`review.ack:${id}`,key,{data,version},async()=>{const old=(await tx.query('SELECT notice_id FROM reviews.acknowledgments WHERE notice_id=$1',[id])).rowCount;if((old?2:1)!==version)throw new ApiError(412,'notice_changed','Refresh this notice before acknowledging it.');await tx.query('INSERT INTO reviews.acknowledgments(notice_id,organization_id,recipient_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[id,actor.organizationId,actor.userId]);return receipt(id,2,'saved','Notice acknowledged. The escalation and financial assessment are unchanged.');});
 });}
}
export function configureReviews(dependencies:{uow:UnitOfWork;workflow:WorkflowService;adapter:ReviewModelAdapter|null;basis:ReviewDecisionBasisPort}){return new ReviewService(dependencies.uow,dependencies.workflow,dependencies.adapter,dependencies.basis);}
