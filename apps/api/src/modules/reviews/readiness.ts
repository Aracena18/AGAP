import { createHash } from 'node:crypto';
import type { ReviewReadiness } from '../../../../../packages/contracts/src/priority-review.js';
import { canonical } from '../../platform/commands.js';
import type { ReviewDecisionBasis } from './contracts.js';
export interface MaterialContext {
 applicationId:string;status:string;assignedOfficerId:string|null;applicationVersion:number;inputVersion:number;
 sources:{id:string;version:number;textVersionId:string|null;state:string|null;verification:string}[];
 policy:null|{id:string;status:string;effectiveFrom:string;effectiveThrough:string;hash?:string};
 assessment:null|{id:string;inputVersion:number;policyVersionId:string|null;status:string;periodStart:string;periodEnd:string;hash?:string;scenarios:{offerId:string;checks:{id:string;passed:boolean}[]}[]};
 unclearedFacts:boolean;pendingRequests?:number;
}
export interface GuardEvent {kind:string;body:Record<string,unknown>}
export function materialHash(context:MaterialContext,basis:ReviewDecisionBasis) {
 return createHash('sha256').update(canonical({inputVersion:context.inputVersion,sources:context.sources,policy:context.policy,assessment:context.assessment,offerId:basis.recommendation?.offerVersionId??null})).digest('hex');
}
export function deriveReadiness(context:MaterialContext,basis:ReviewDecisionBasis,events:GuardEvent[],options:{requireRecommendation?:boolean}={}):ReviewReadiness {
 const hash=materialHash(context,basis),blockers:ReviewReadiness['blockers']=[];
 const add=(code:string,message:string,concernId:string|null=null)=>blockers.push({code,message,concernId,sourceId:null});
 const concerns=new Map<string,{id:string;state:string;material:boolean;basisHash:string}>(),escalations=new Map<string,{id:string;concernIds:string[];state:string;basisHash:string;reviewerId:string|null}>();
 for(const event of events){const b=event.body;
  if(event.kind==='concern')concerns.set(String(b.id),{id:String(b.id),state:String(b.state),material:b.material===true,basisHash:String(b.basisHash)});
  if(event.kind==='check'){const c=concerns.get(String(b.concernId));if(c)Object.assign(c,{state:String(b.state),material:b.material===true,basisHash:String(b.basisHash)});}
  if(event.kind==='escalation')escalations.set(String(b.id),{id:String(b.id),concernIds:b.concernIds as string[],state:String(b.state),basisHash:String(b.basisHash),reviewerId:b.reviewerId as string|null});
  if(event.kind==='disposition'){const e=escalations.get(String(b.escalationId));if(e)Object.assign(e,{state:String(b.state),basisHash:String(b.basisHash)});}
 }
 const currentReviewer=new Set(basis.eligibleReviewers.map(r=>r.id));
 for(const c of concerns.values()){
  if(c.basisHash!==hash){add('concern_stale','A source-linked concern needs checking against the current evidence and offer.',c.id);continue;}
  if(c.state==='unchecked'){add('concern_unchecked','The preparing officer must check a source-linked suggestion.',c.id);continue;}
  if(c.material&&c.state!=='dismissed'){
   const e=[...escalations.values()].filter(e=>e.concernIds.includes(c.id)).at(-1);
   if(!e||e.basisHash!==hash||e.state!=='resolved'||!e.reviewerId||!currentReviewer.has(e.reviewerId))add('material_concern','A confirmed material concern needs eligible reviewer disposition.',c.id);
  }
 }
 const assessment=context.assessment,policy=context.policy;
 if(context.unclearedFacts)add('source_unavailable','A confirmed financial fact no longer has a cleared source.');
 if(!policy)add('policy_unavailable','The applicable offer and financial rules are unavailable.');
 if(!assessment)add('assessment_missing','Save a dated assessment from confirmed financial facts.');
 else if(assessment.status!=='complete')add('assessment_incomplete','Required financial information is incomplete.');
 else if(assessment.inputVersion!==context.inputVersion||assessment.policyVersionId!==policy?.id)add('assessment_stale','The saved assessment needs renewed review.');
 if(assessment&&policy&&(policy.effectiveFrom>assessment.periodStart||policy.effectiveThrough<assessment.periodEnd))add('policy_expired','The policy does not cover the assessed horizon.');
 const rec=options.requireRecommendation===false?null:basis.recommendation;
 if(options.requireRecommendation!==false){
  if(!rec)add('recommendation_missing','The assigned officer must record a current recommendation.');
  else if(rec.assessmentId!==assessment?.id||rec.inputVersion!==context.inputVersion)add('recommendation_stale','The recommendation does not match the current assessment.');
 }
 const selected=rec?assessment?.scenarios.find(s=>s.offerId===rec.offerVersionId):null;
 if(rec&&!selected)add('offer_unavailable','The recommended offer is not in the current assessment.');
 if(selected?.checks.some(c=>!c.passed))add('financial_check_failed','The recommended offer has an unresolved affordability or policy check.');
 if(options.requireRecommendation===false&&!rec&&assessment?.status==='complete'&&!assessment.scenarios.some(s=>s.checks.every(c=>c.passed)))add('financial_check_failed','No assessed offer currently passes the required financial checks.');
 for(const message of basis.blockers)add('authority_blocker',message);
 if(context.pendingRequests)add('concern_pending','A source review is still being processed.');
 const material=blockers.some(b=>b.code==='material_concern'),clarification=blockers.some(b=>['source_unavailable','assessment_incomplete','assessment_stale','concern_stale','financial_check_failed','policy_expired','recommendation_stale'].includes(b.code)),unchecked=blockers.some(b=>b.code==='concern_unchecked'||b.code==='concern_pending'),unavailable=blockers.some(b=>b.code==='policy_unavailable'||b.code==='authority_blocker');
 const route:ReviewReadiness['route']=material?'escalated_review':clarification?'needs_clarification':unchecked?'awaiting_concern_check':unavailable?'unavailable':blockers.length?'preparation':context.status==='decision_recorded'?'recorded_decision':'ready_for_approval';
 const nextAction=route==='escalated_review'?'Assign an eligible reviewer or record the outstanding disposition.':route==='needs_clarification'?'Clarify the listed evidence or financial checks, then assess again.':route==='awaiting_concern_check'?'Check each source-linked suggestion and record a reason.':route==='unavailable'?'Obtain the missing configuration or responsible authority.':route==='preparation'?'Complete the listed preparation steps.':route==='recorded_decision'?'Inspect the saved decision and accepted terms.':'A separate authorized reviewer may inspect the current basis and decide.';
 return {ready:blockers.length===0,route,blockers,materialHash:hash,offerId:rec?.offerVersionId??null,nextAction};
}
