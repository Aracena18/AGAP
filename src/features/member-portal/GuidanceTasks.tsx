import styles from './guidance.module.css';
import { useCallback,useEffect,useId,useRef,useState,type ReactNode,type FormEvent } from 'react';
import type { z } from 'zod';
import type { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { GuidanceResponseCreate,clarifiedFact,validGuidanceAnswer,type GuidanceItemType,type GuidanceQuestionType } from '../../../packages/contracts/src/guidance';
import type { WorkflowView,WorkflowDraftReview } from '../../../packages/contracts/src/workflow';
import { useResource } from './useResource';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Button,Money,Notice } from '../../shared/ui';
import { ResponseCard,ResponseSource } from '../../shared/ui/ResponseCard';
import { parsePesoInput } from '../../domain/evidence';
import { dateLabel } from '../../domain/format';
import { CommandError } from './MemberFeedback';
type View=z.output<typeof WorkflowView>;
type Draft=View['drafts'][number];
type Answer=z.output<typeof GuidanceResponseCreate>['answer'];
type Props={id:string;client:AgapClient;csrf:string;member:boolean;view:View;canEdit:boolean;saved:()=>void;fallback:ReactNode;onAccessDenied:()=>void;staffEditor?:(draft:Draft,cancel:()=>void,guidanceVersion:number)=>ReactNode};

export function GuidanceTasks({id,client,csrf,member,view,canEdit,saved,fallback,staffEditor,onAccessDenied}:Props){
 const load=useCallback(async(signal:AbortSignal)=>{
  try{return await(member?client.getMemberGuidance(id,{signal}):client.getStaffGuidance(id,{signal}));}
  catch(e){if(e instanceof ApiClientError&&e.status===501)return null;if(e instanceof ApiClientError&&[401,403,404].includes(e.status))onAccessDenied();throw e;}
 },[client,id,member,onAccessDenied]);
 const materialKey=JSON.stringify([view.version,view.drafts.map(d=>[d.id,d.textVersionId,d.state]),view.sources.map(source=>[source.id,source.version,source.textVersionId,source.state])]);
 const read=useResource(load,materialKey,true);
 const [busy,setBusy]=useState<string|null>(null);
 const onBusy=useCallback((draftId:string,locked:boolean)=>setBusy(previous=>locked?draftId:previous===draftId?null:previous),[setBusy]);
 if(read.data===null)return <>{fallback}</>;
 if(read.error&&!read.data)return <Notice tone="warning">{read.error} <Button variant="secondary" onClick={read.refresh}>Retry questions</Button></Notice>;
 if(!read.data)return <p role="status">Loading questions for this information…</p>;
 const pending=read.data.items.filter(item=>item.reviewState==='suggested'),reviewed=read.data.items.filter(item=>item.reviewState!=='suggested');
 return <div className="stack">{read.error&&<Notice tone="warning" role="alert">{read.error} Your unfinished answer is retained. Refresh questions to try again.</Notice>}<div><Button variant="secondary" disabled={!!busy||read.loading} onClick={read.refreshKeepingData}>{read.loading?'Refreshing questions…':'Refresh questions'}</Button></div><p>{pending.length?`${pending.length} suggestion${pending.length===1?'':'s'} to check. Your answers stay separate from confirmed financial information.`:'No suggestions await review. Manual entry is available.'}</p>
  {pending.map(item=>{const draft=view.drafts.find(d=>d.id===item.draftId);return draft&&<DraftTask key={item.draftId} item={item} draft={draft} version={read.data!.version} applicationVersion={read.data!.applicationVersion} {...{id,client,csrf,member,canEdit}} refresh={read.refreshKeepingData} saved={saved} onAccessDenied={onAccessDenied} refreshing={read.loading} onBusy={onBusy} externalBlocked={busy!==null&&busy!==item.draftId} staffEditor={!member&&staffEditor?(cancel,reviewedVersion)=>staffEditor(draft,cancel,reviewedVersion):undefined}/>;})}
  {reviewed.length>0&&<details><summary>Previously reviewed suggestions ({reviewed.length})</summary>{reviewed.map(item=><p key={item.draftId}>{item.title} · {item.reviewState==='accepted'?'Confirmed':'Not applicable'}</p>)}</details>}
  {read.data.history.length>0&&<details><summary>Saved clarification history</summary><p>Earlier responses are preserved. Responses to an earlier source version do not confirm the current information.</p><ol>{read.data.history.map(event=>{const q=read.data!.items.flatMap(i=>i.questions).find(question=>question.id===event.questionId);return <li key={event.id}>{q?.label??'Earlier source question'} — {answerLabel(event.answer,q)} <span className="small subtle">({event.actorKind==='member'?'Member':'Staff'}, {dateLabel(event.recordedAt)}{!member&&`, source version ${event.sourceVersion}`})</span></li>;})}</ol></details>}
 </div>;
}
const amountInput=(n:number)=>`${Math.trunc(n/100)}.${String(n%100).padStart(2,'0')}`;
function answerLabel(answer:Answer,q?:GuidanceQuestionType){if(answer.status==='unknown')return 'Not known yet';if(answer.status==='declined')return 'Prefer not to answer';if(Array.isArray(answer.value))return answer.value.map(dateLabel).join(', ');if(typeof answer.value==='number')return <Money value={answer.value}/>;if(q?.kind==='date')return dateLabel(answer.value);return q?.choices.find(c=>c.value===answer.value)?.label??answer.value;}
function DraftTask({item,draft,version,applicationVersion,id,client,csrf,member,canEdit,refresh,saved,staffEditor,onAccessDenied,refreshing,onBusy,externalBlocked}:{item:GuidanceItemType;draft:Draft;version:number;applicationVersion:number;id:string;client:AgapClient;csrf:string;member:boolean;canEdit:boolean;refresh:()=>void;saved:()=>void;staffEditor?:(cancel:()=>void,reviewedVersion:number)=>ReactNode;onAccessDenied:()=>void;refreshing:boolean;onBusy:(id:string,locked:boolean)=>void;externalBlocked:boolean}){
 const [open,setOpen]=useState(false),[selected,setSelected]=useState<string|null>(null),[reason,setReason]=useState(''),[checkedVersion,setCheckedVersion]=useState<number|null>(null),[notice,setNotice]=useState(''),[answerBlocked,setAnswerBlocked]=useState(false);
 const wasOpen=useRef(false);
 const trigger=useRef<HTMLDivElement>(null),heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null),uid=useId();
 const command=useCommand<z.input<typeof WorkflowDraftReview>,unknown>();
 const checked=checkedVersion===version;
 const setChecked=(value:boolean)=>setCheckedVersion(value?version:null);
 useUnsavedChanges(Boolean(reason)||command.uncertain,command.uncertain);
 const relevance=item.questions.find(q=>q.field==='relevance')?.answer,notApplicable=relevance?.status==='answered'&&relevance.value==='not_applicable';
 const active=item.questions.find(q=>q.id===selected)??item.questions.find(q=>q.required&&!q.answer);
 const fact=clarifiedFact(draft,item.questions,reason),complete=clarifiedFact(draft,item.questions,'Completeness check only; not submitted.'),canConfirm=item.current&&item.actions.includes('confirm')&&(notApplicable||!!complete);
 const blocked=command.saving||command.uncertain||answerBlocked||refreshing||externalBlocked;
 useEffect(()=>{onBusy(draft.id,command.saving||command.uncertain||answerBlocked);return()=>onBusy(draft.id,false);},[draft.id,command.saving,command.uncertain,answerBlocked,onBusy]);
 useEffect(()=>{if(open)heading.current?.focus();else if(wasOpen.current)trigger.current?.querySelector('button')?.focus();wasOpen.current=open;},[open]);
 useEffect(()=>{if(command.error)errors.current?.focus();},[command.error]);
 async function confirm(e:FormEvent){e.preventDefault();const body={draftId:draft.id,action:notApplicable?'not_applicable' as const:'confirm' as const,fact:notApplicable?null:fact,reason,guidanceVersion:version};const result=await command.submit(body,(data,key)=>(member?client.confirmMemberDraft(id,data,{csrfToken:csrf,idempotencyKey:key,version:applicationVersion}):client.reviewStaffDraft(id,data,{csrfToken:csrf,idempotencyKey:key,version:applicationVersion})).catch(problem=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status))onAccessDenied();throw problem;}));if(result){setReason('');setChecked(false);setNotice(notApplicable?'Saved as not applicable. Earlier answers remain in history.':'Information confirmed for review. Independent verification is separate.');saved();}}
 return <ResponseCard title={item.title} origin={item.origin==='model'?'AI draft':'Simulated suggestion'} status={!item.current?'Source changed · review again':'Needs your check'}>
  <dl className={styles.values}><dt>Proposed amount</dt><dd>{draft.suggestion.value.availability==='recorded'?<Money value={draft.suggestion.value.amountCentavos}/>:<>Unavailable · {draft.suggestion.value.reason}</>}</dd>{draft.suggestion.effectiveDate&&<><dt>Information applies as of</dt><dd>{dateLabel(draft.suggestion.effectiveDate)}</dd></>}</dl>
  <p>{item.summary}</p>{!member&&<details><summary>Model provenance</summary><p className="small subtle">{draft.provenance.baseModel} · {draft.provenance.baseRevision} · {draft.provenance.promptVersion} · {draft.provenance.evaluationReference}</p></details>}<ResponseSource label={item.sourceLabel} page={item.source.page} excerpt={item.source.excerpt} href={`#source-${item.source.sourceId}`}/>
  {!item.current&&<Notice tone="warning">The source changed or is unavailable. These earlier suggestions and answers cannot confirm current information. Ask staff to review the current source.</Notice>}
  {notice&&<Notice role="status">{notice}</Notice>}
  {canEdit&&item.actions.includes('answer')&&<div ref={trigger} hidden={open}><Button variant="secondary" disabled={externalBlocked||refreshing} onClick={()=>setOpen(true)}>Review {item.title}</Button></div>}
  <section hidden={!open} className={`stack ${styles.questions}`} aria-labelledby={`${uid}-title`}><h4 id={`${uid}-title`} ref={heading} tabIndex={-1}>Check {item.title}</h4><p className="small" role="status">{item.questions.filter(q=>q.required&&q.answer).length} of {item.questions.filter(q=>q.required).length} questions have saved responses.</p>
   <div ref={errors} tabIndex={-1}><CommandError error={command.error}/></div>
   {active&&(!notApplicable||selected===item.questions.find(q=>q.field==='relevance')?.id)?<Question key={active.id} question={active} initialAmount={draft.suggestion.value.availability==='recorded'?draft.suggestion.value.amountCentavos:undefined} proposed={proposedValue(draft,active)} disabled={command.saving||command.uncertain||!item.current||refreshing||externalBlocked} {...{id,client,csrf,member,version,applicationVersion,item,onAccessDenied}} onBlocked={setAnswerBlocked} done={()=>{setSelected(null);setChecked(false);setNotice('Your answer was saved for review. It has not changed financial facts.');refresh();}}/>:<>
    <h5>Your saved answers</h5><dl className={styles.answers}>{item.questions.filter(q=>q.answer&&(notApplicable?q.field==='relevance':true)).map(q=><div key={q.id}><dt>{q.label}</dt><dd>{answerLabel(q.answer!,q)} <Button variant="quiet" aria-label={`Change answer: ${q.label}`} disabled={blocked} onClick={()=>setSelected(q.id)}>Change answer</Button></dd></div>)}</dl>
    {!notApplicable&&item.questions.some(q=>!q.required&&!q.answer)&&<details><summary>Check other suggested details</summary><dl className={styles.answers}>{item.questions.filter(q=>!q.required&&!q.answer).map(q=><div key={q.id}><dt>{q.label}</dt><dd>{answerLabel({status:'answered',value:proposedValue(draft,q)!},q)} <Button variant="quiet" aria-label={`Correct suggested detail: ${q.label}`} disabled={blocked} onClick={()=>setSelected(q.id)}>Correct detail</Button></dd></div>)}</dl></details>}{!canConfirm&&<Notice>Some information remains unknown or declined. Your responses are saved for staff follow-up. A complete financial confirmation is unavailable.</Notice>}
    {canConfirm&&<form className="stack" onSubmit={e=>void confirm(e)}><div className="field"><label htmlFor={`${uid}-reason`}>What should staff know about these details?</label><textarea id={`${uid}-reason`} required maxLength={2000} disabled={blocked} value={reason} onChange={e=>{setReason(e.target.value);setChecked(false);}}/></div><label><input type="checkbox" required disabled={blocked} checked={checked} onChange={e=>setChecked(e.target.checked)}/> I checked these details and the source shown.</label><div><Button type="submit" disabled={command.saving||externalBlocked||answerBlocked||refreshing||!checked}>{command.saving?'Saving confirmation…':command.uncertain?'Retry same confirmation':notApplicable?'Confirm not applicable':'Confirm this information'}</Button></div></form>}
   </>}
   {staffEditor&&<StaffDetailSession version={version} render={staffEditor}/>}

   <div><Button variant="quiet" disabled={blocked} onClick={()=>{setOpen(false);}}>Close questions</Button></div>
  </section>
 </ResponseCard>;
}
function StaffDetailSession({version,render}:{version:number;render:(cancel:()=>void,reviewedVersion:number)=>ReactNode}){
 const [basis,setBasis]=useState<number|null>(null);
 function cancel(){const detail=document.activeElement?.closest('details');if(detail)detail.open=false;setBasis(null);detail?.querySelector('summary')?.focus();}
 return <details onToggle={event=>{if(event.currentTarget.open)setBasis(previous=>previous??version);}}><summary>Detailed staff review</summary>{basis!==null&&<div className="stack">{basis!==version&&<Notice tone="warning">Saved clarification answers changed. Your edits are retained. Cancel and reopen this detailed review before a new confirmation; reconcile any uncertain save first.</Notice>}{render(cancel,basis)}</div>}</details>;
}

function proposedValue(draft:Draft,q:GuidanceQuestionType):string|string[]|number|null{if(q.field==='amount')return draft.suggestion.value.availability==='recorded'?draft.suggestion.value.amountCentavos:null;return draft.suggestion[q.field];}
function draftDateLabel(item:GuidanceItemType){const label=item.questions.find(q=>q.field==='cashDates')?.label;return label?.includes('receive')?'Income date':label?.includes('cash available')?'Cash available date':'Payment date';}
function Question({question,initialAmount,proposed,disabled,id,client,csrf,member,version,applicationVersion,item,done,onBlocked,onAccessDenied}:{question:GuidanceQuestionType;initialAmount?:number;proposed:string|string[]|number|null;disabled:boolean;id:string;client:AgapClient;csrf:string;member:boolean;version:number;applicationVersion:number;item:GuidanceItemType;done:()=>void;onBlocked:(value:boolean)=>void;onAccessDenied:()=>void}){
 const previous=question.answer,existing=previous?.status==='answered'?previous.value:proposed;
 const [status,setStatus]=useState<Answer['status']>(previous?.status??'answered');
 const [value,setValue]=useState(typeof existing==='string'?existing:typeof existing==='number'?amountInput(existing):question.kind==='amount'&&initialAmount!==undefined?amountInput(initialAmount):'');
 const [dates,setDates]=useState<string[]>(Array.isArray(existing)&&existing.length?existing:['']);
 const [error,setError]=useState(''),[dirty,setDirty]=useState(false),uid=useId(),errors=useRef<HTMLDivElement>(null);
 const command=useCommand<z.input<typeof GuidanceResponseCreate>,unknown>();
 const blocked=disabled||command.saving||command.uncertain;
 useEffect(()=>{onBlocked(command.saving||command.uncertain);return()=>onBlocked(false);},[command.saving,command.uncertain,onBlocked]);
 const legend=useRef<HTMLLegendElement>(null);useEffect(()=>{legend.current?.focus();},[question.id]);
 useUnsavedChanges(dirty||command.uncertain,command.uncertain);
 useEffect(()=>{if(error||command.error)errors.current?.focus();},[error,command.error]);
 async function submit(e:FormEvent){e.preventDefault();setError('');let answer:Answer;try{answer=status==='answered'?{status,value:question.kind==='amount'?parsePesoInput(value):question.kind==='dates'?dates:value}:{status,value:null};if(!validGuidanceAnswer(question,answer))throw new Error();}catch{setError(question.kind==='amount'?'Enter a nonnegative PHP amount with up to two decimal places.':question.kind==='dates'?'Enter distinct, valid payment dates.':'Choose a valid answer, or record that it is not known yet.');return;}
  const result=await command.submit({draftId:item.draftId,questionId:question.id,sourceVersion:item.source.sourceVersion,textVersionId:item.textVersionId,applicationVersion,answer},(body,key)=>(member?client.respondMemberGuidance(id,body,{version,csrfToken:csrf,idempotencyKey:key}):client.respondStaffGuidance(id,body,{version,csrfToken:csrf,idempotencyKey:key})).catch(problem=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status))onAccessDenied();throw problem;}));if(result){setDirty(false);done();}}
 return <form className="stack" onSubmit={e=>void submit(e)} onChange={()=>setDirty(true)}><div ref={errors} tabIndex={-1}><CommandError error={error||command.error}/></div><fieldset disabled={blocked} className="stack"><legend ref={legend} tabIndex={-1}>{question.label}</legend><p id={`${uid}-why`}>{question.why}</p><div className="field"><label htmlFor={`${uid}-status`}>Can you answer this?</label><select id={`${uid}-status`} value={status} onChange={e=>setStatus(e.target.value as Answer['status'])}><option value="answered">I can answer</option><option value="unknown">I don’t know yet</option><option value="declined">Prefer not to answer</option></select></div>
  {status==='answered'&&(question.kind==='choice'?<div className="field"><label htmlFor={`${uid}-value`}>{question.label}</label><select id={`${uid}-value`} required aria-describedby={`${uid}-why`} value={value} onChange={e=>setValue(e.target.value)}><option value="">Choose an answer</option>{question.choices.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></div>:question.kind==='dates'?<div className="stack">{dates.map((date,index)=><div className="field" key={index}><label htmlFor={`${uid}-date-${index}`}>{draftDateLabel(item)} {index+1}</label><input id={`${uid}-date-${index}`} required type="date" value={date} aria-describedby={`${uid}-why`} onChange={e=>setDates(values=>values.map((v,i)=>i===index?e.target.value:v))}/>{dates.length>1&&<Button variant="quiet" onClick={()=>setDates(values=>values.filter((_,i)=>i!==index))}>Remove payment date {index+1}</Button>}</div>)}<div><Button variant="secondary" disabled={dates.length>=366} onClick={()=>setDates(values=>[...values,''])}>Add another date</Button></div></div>:<div className="field"><label htmlFor={`${uid}-value`}>{question.kind==='amount'?'Amount (PHP)':question.label}</label><input id={`${uid}-value`} required type={question.kind==='date'?'date':'text'} inputMode={question.kind==='amount'?'decimal':undefined} aria-describedby={`${uid}-why`} value={value} onChange={e=>setValue(e.target.value)}/></div>)}
 </fieldset><div><Button type="submit" disabled={command.saving||disabled}>{command.saving?'Saving answer…':command.uncertain?'Retry same answer':'Save answer'}</Button></div></form>;
}
