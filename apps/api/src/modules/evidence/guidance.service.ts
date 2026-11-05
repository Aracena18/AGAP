import { randomUUID } from 'node:crypto';
import { GuidanceResponse, GuidanceResponseCreate, GuidanceEvent, questionsFor, validGuidanceAnswer } from '../../../../../packages/contracts/src/guidance.js';
import type { z } from 'zod';
import type { TransactionContext,MemberTransactionContext } from '../../../../../packages/contracts/src/ports.js';
import type { WorkflowActor } from './workflow.service.js';
import { WorkflowService } from './workflow.service.js';
import { command,recordEvent } from '../../platform/commands.js';
import { memberCommand,memberEvent } from '../../platform/member-commands.js';
import { ApiError,notFound } from '../../platform/errors.js';
type Tx=TransactionContext|MemberTransactionContext;
export class GuidanceService {
 constructor(private readonly workflow:WorkflowService){}
 async readIn(tx:Tx,id:string){
  const view=await this.workflow.viewIn(tx,id);
  const records=(await tx.query<{body:unknown;revision:string}>('SELECT body,revision FROM evidence.clarifications WHERE application_id=$1 ORDER BY revision',[id])).rows;
  const history=records.map(r=>GuidanceEvent.parse(r.body));
  const a=await this.workflow.access(tx,id),editable=a.status!=='decision_recorded'&&('kind' in tx.actor||tx.actor.roles.includes('officer')&&a.assigned_officer_id===tx.actor.userId);
  return GuidanceResponse.parse({schemaVersion:1,applicationId:id,applicationVersion:view.version,version:records.length?Number(records.at(-1)!.revision):1,history,
   items:view.drafts.map(d=>{
    const source=view.sources.find(s=>s.id===d.source.sourceId),current=!!source&&source.state==='cleared'&&source.version===d.source.sourceVersion&&source.textVersionId===d.textVersionId&&source.pages.some(p=>p.page===d.source.page&&p.text.includes(d.source.excerpt));
    const questions=questionsFor(d).map(q=>({...q,answer:history.filter(e=>e.draftId===d.id&&e.questionId===q.id&&e.sourceVersion===d.source.sourceVersion&&e.textVersionId===d.textVersionId).at(-1)?.answer??null}));
    return {draftId:d.id,source:d.source,textVersionId:d.textVersionId,sourceLabel:source?.label??'Source unavailable',origin:d.origin,title:d.suggestion.label,summary:'Check the proposed information against your circumstances and the source.',current,reviewState:d.state,questions,actions:editable&&current&&d.state==='suggested'?['answer','confirm','not_applicable','inspect_source']:['inspect_source']};
   })});
 }
 read(actor:WorkflowActor,id:string){return this.workflow.run(actor,tx=>this.readIn(tx,id));}
 respond(actor:WorkflowActor,id:string,input:unknown,version:number,key:unknown){
  const data=GuidanceResponseCreate.parse(input);
  return this.workflow.run(actor,async tx=>{
   await this.workflow.access(tx,id);
   const execute=async()=>{
    // Serializes guidance revisions without touching financial or application versions.
    await tx.query('SELECT id FROM applications.applications WHERE id=$1 FOR UPDATE',[id]);
    const view=await this.readIn(tx,id),item=view.items.find(i=>i.draftId===data.draftId);
    if(!item)throw notFound();
    if(!item.actions.includes('answer'))throw new ApiError(409,'guidance_unavailable','This suggestion cannot be answered. Refresh the current source or ask staff for help.');
    if(view.version!==version||view.applicationVersion!==data.applicationVersion||item.source.sourceVersion!==data.sourceVersion||item.textVersionId!==data.textVersionId)throw new ApiError(412,'guidance_changed','The information changed. Refresh before answering. Your entered answer is preserved.');
    const question=item.questions.find(q=>q.id===data.questionId);
    if(!question||!validGuidanceAnswer(question,data.answer))throw new ApiError(422,'invalid_guidance_answer','Choose a valid answer for this question.');
    const next=version+1;
    const event:z.output<typeof GuidanceEvent>={id:randomUUID(),draftId:item.draftId,questionId:question.id,sourceVersion:item.source.sourceVersion,textVersionId:item.textVersionId,answer:data.answer,recordedAt:new Date().toISOString(),actorKind:'kind' in actor?'member':'staff'};
    await tx.query('INSERT INTO evidence.clarifications(id,organization_id,application_id,draft_id,revision,body) VALUES($1,$2,$3,$4,$5,$6)',[event.id,actor.organizationId,id,item.draftId,next,JSON.stringify(event)]);
    if('kind' in tx.actor)await memberEvent(tx as MemberTransactionContext,'member.evidence.clarification',id,next);
    else await recordEvent(tx as TransactionContext,'evidence.clarification',id,next);
    return {id:event.id,version:next};
   };
   return 'kind' in tx.actor?memberCommand(tx as MemberTransactionContext,`guidance.response:${id}`,key,{data,version},execute):command(tx as TransactionContext,`guidance.response:${id}`,key,{data,version},execute);
  });
 }
}
