import {useCallback,useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import type {z} from 'zod';
import {SupportFollowUpCompletionSchema,SupportFollowUpRescheduleSchema,type SupportFollowUpSchema,type SupportFollowUpDetailSchema,type SupportFollowUpPageSchema,type SupportFollowUpFilterSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {useCommand} from '../access/useCommand';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import {Badge,Button,Notice} from '../../shared/ui';
import styles from './support.module.css';
import {FollowUpHistory} from './FollowUpHistory';

type Task=z.output<typeof SupportFollowUpSchema>;type Detail=z.output<typeof SupportFollowUpDetailSchema>;type Page=z.output<typeof SupportFollowUpPageSchema>;type Filter=z.output<typeof SupportFollowUpFilterSchema>;
type Change=z.input<typeof SupportFollowUpCompletionSchema>|z.input<typeof SupportFollowUpRescheduleSchema>;
const filters:{value:Filter;label:string}[]=[{value:'open',label:'All open'},{value:'scheduled',label:'Scheduled'},{value:'due',label:'Due today'},{value:'overdue',label:'Overdue'},{value:'completed',label:'Completed'}];
export function followUpLabel(task:Task,today:string){return task.status==='completed'?'Completed':task.dueDate<today?'Overdue':task.dueDate===today?'Due today':'Scheduled';}

export function StaffFollowUps({onAccessDenied,onBlockedChange}:{onAccessDenied:()=>void;onBlockedChange:(value:boolean)=>void}){
 const {client}=useStaff(),[filter,setFilter]=useState<Filter>('open'),[revision,setRevision]=useState(0),[page,setPage]=useState<Page|null>(null),[detail,setDetail]=useState<Detail|null>(null);
 const [loading,setLoading]=useState(true),[opening,setOpening]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[editing,setEditing]=useState(false);
 const listRequest=useRef<AbortController|null>(null),detailRequest=useRef<AbortController|null>(null),listBusy=useRef(false);
 const failure=useCallback((problem:unknown)=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onAccessDenied();return;}setError(problem instanceof Error?problem.message:'Follow-ups could not be loaded.');},[onAccessDenied]);
 useLayoutEffect(()=>{onBlockedChange(editing);return()=>onBlockedChange(false);},[editing,onBlockedChange]);
 useEffect(()=>{
  const controller=new AbortController();listRequest.current=controller;listBusy.current=true;
  client.listSupportFollowUps(filter,{signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setPage(value);}).catch(problem=>{if(!controller.signal.aborted)failure(problem);}).finally(()=>{if(!controller.signal.aborted){listBusy.current=false;setLoading(false);}});
  return()=>controller.abort();
 },[client,filter,revision,failure]);
 useEffect(()=>()=>detailRequest.current?.abort(),[]);
 async function more(){
  if(!page?.nextCursor||listBusy.current||editing)return;listBusy.current=true;setLoading(true);setError('');const controller=new AbortController();listRequest.current=controller;
  try{const next=await client.listSupportFollowUps(filter,{cursor:page.nextCursor,signal:controller.signal});if(!controller.signal.aborted)setPage(previous=>previous?{...next,items:[...previous.items,...next.items.filter(row=>!previous.items.some(old=>old.id===row.id))]}:next);}
  catch(problem){if(!controller.signal.aborted)failure(problem);}finally{if(!controller.signal.aborted){listBusy.current=false;setLoading(false);}}
 }
 // Cancel both initial and older-page reads when this private view is disposed.
 useEffect(()=>()=>listRequest.current?.abort(),[]);
 async function open(row:Task){
  if(editing)return;detailRequest.current?.abort();const controller=new AbortController();detailRequest.current=controller;setDetail(null);setOpening(true);setError('');setNotice('');
  try{const value=await client.getSupportFollowUp(row.id,{signal:controller.signal});if(!controller.signal.aborted)setDetail(value);}
  catch(problem){if(!controller.signal.aborted)failure(problem);}finally{if(!controller.signal.aborted)setOpening(false);}
 }
 function resetQueue(){listRequest.current?.abort();detailRequest.current?.abort();setLoading(true);setError('');setPage(null);setDetail(null);setOpening(false);}
 function refresh(){resetQueue();setRevision(value=>value+1);}
 return <div className="stack"><Notice>Follow-ups record staff actions. Completing a task does not resolve the member’s concern or change a loan. Historical dates may have no recorded completion.</Notice>
 {notice&&<Notice role="status" tone="success">{notice}</Notice>}
 <section className="panel" aria-labelledby="follow-up-queue"><div className={`panel-header ${styles.heading}`}><h2 id="follow-up-queue">Officer follow-ups</h2><Button variant="quiet" disabled={editing||loading||opening} onClick={refresh}>Refresh follow-ups</Button></div>
 <div className="panel-body field"><label htmlFor="follow-up-filter">Follow-up status</label><select id="follow-up-filter" value={filter} disabled={editing||loading||opening} onChange={event=>{resetQueue();setFilter(event.target.value as Filter);setNotice('');}}>{filters.map(item=><option key={item.value} value={item.value}>{item.label}</option>)}</select>
 <p className="small subtle">Filters apply to all your assigned tasks. Refresh to see changes.{page&&` Dates are evaluated as of ${page.asOfDate} in Manila.`}</p></div>
 {error&&<div className="panel-body"><Notice role="alert" tone="warning">{error}</Notice><Button disabled={editing||loading} onClick={refresh}>Reload follow-ups</Button></div>}
 <div className="table-scroll" role="region" aria-label="Officer follow-up queue" tabIndex={0}><table className={styles.table}><caption className="sr-only">Follow-ups for support requests currently assigned to you</caption><thead><tr><th scope="col">Request / member</th><th scope="col">Follow-up date</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{page?.items.map(row=><tr key={row.id}><th scope="row"><span className={styles.id}>{row.requestId}</span><span className={styles.id}>Member: {row.memberId}</span></th><td><time dateTime={row.dueDate}>{row.dueDate}</time></td><td><Badge>{followUpLabel(row,page.asOfDate)}</Badge></td><td><Button variant="quiet" aria-label={`Open follow-up ${row.id}`} disabled={editing||opening} onClick={()=>void open(row)}>Open follow-up</Button></td></tr>)}</tbody></table></div>
 {loading?<p className="panel-body" role="status">Loading follow-ups…</p>:page?.items.length===0&&<p className="panel-body">No follow-ups match this status.</p>}
 {page?.nextCursor&&<div className="panel-body"><Button variant="secondary" disabled={editing||loading||opening} onClick={()=>void more()}>Load more follow-ups</Button></div>}</section>
 {opening&&<p role="status">Opening follow-up…</p>}
 {detail&&<FollowUpEditor key={`${detail.task.id}:${detail.task.version}`} detail={detail} today={page?.asOfDate??detail.task.dueDate} onBlockedChange={setEditing} onAccessDenied={onAccessDenied} onSaved={()=>{setNotice('Follow-up action saved. The queue has been refreshed.');refresh();}}/>}
 </div>;
}

function FollowUpEditor({detail,today,onBlockedChange,onAccessDenied,onSaved}:{detail:Detail;today:string;onBlockedChange:(value:boolean)=>void;onAccessDenied:()=>void;onSaved:()=>void}){
 const {client,session}=useStaff(),[kind,setKind]=useState<'complete'|'reschedule'>('complete'),[note,setNote]=useState(''),[date,setDate]=useState(detail.task.dueDate),[error,setError]=useState('');
 const change=useCommand<Change,Task>(),heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null),alive=useRef(true);
 const dirty=Boolean(note||date!==detail.task.dueDate),blocked=change.saving||change.uncertain;
 useUnsavedChanges(dirty||blocked,change.uncertain);
 useLayoutEffect(()=>{onBlockedChange(dirty||blocked);return()=>onBlockedChange(false);},[dirty,blocked,onBlockedChange]);
 useEffect(()=>{alive.current=true;heading.current?.focus();return()=>{alive.current=false;};},[]);
 useEffect(()=>{if(error||change.error)errors.current?.focus();},[error,change.error]);
 async function save(event:FormEvent){
  event.preventDefault();setError('');const parsed=kind==='complete'?SupportFollowUpCompletionSchema.safeParse({note}):SupportFollowUpRescheduleSchema.safeParse({date,reason:note});
  if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const result=await change.submit(parsed.data,(body,key)=>('date' in body?client.rescheduleSupportFollowUp(detail.task.id,body,{version:detail.task.version,csrfToken:session!.csrfToken,idempotencyKey:key}):client.completeSupportFollowUp(detail.task.id,body,{version:detail.task.version,csrfToken:session!.csrfToken,idempotencyKey:key})).catch(problem=>{if(alive.current&&problem instanceof ApiClientError&&[401,403,404].includes(problem.status))onAccessDenied();throw problem;}));
  if(result&&alive.current)onSaved();
 }
 return <section className="panel panel-body stack" aria-labelledby="follow-up-detail"><h2 ref={heading} tabIndex={-1} id="follow-up-detail">Selected follow-up</h2>
 <p className={styles.id}>{detail.task.id} · Version {detail.task.version}</p><p><Badge>{followUpLabel(detail.task,today)}</Badge> · Follow-up: {detail.task.dueDate}</p>
 <section className="stack"><h3>Source staff response</h3><p className={styles.message}>{detail.source.response}</p><p className={styles.message}>Internal action: {detail.source.internalNote}</p><p className="small subtle">Recorded {detail.source.recordedAt} · Original follow-up date: {detail.task.originalDate} · Request: {detail.task.requestId}</p></section>
 {(error||change.error)&&<div ref={errors} tabIndex={-1}><Notice role="alert" tone="danger">{change.error||error}</Notice></div>}
 {detail.task.status==='open'?<form className="stack" onSubmit={event=>void save(event)}><h3>Record follow-up action</h3><fieldset className="stack" disabled={blocked}><div className="field"><label htmlFor="follow-up-action">Action</label><select id="follow-up-action" value={kind} onChange={event=>setKind(event.target.value as typeof kind)}><option value="complete">Complete follow-up</option><option value="reschedule">Reschedule follow-up</option></select></div>
 {kind==='reschedule'&&<div className="field"><label htmlFor="follow-up-new-date">New follow-up date</label><input required id="follow-up-new-date" type="date" min={today} value={date} onChange={event=>setDate(event.target.value)}/></div>}
 <div className="field"><label htmlFor="follow-up-note">{kind==='complete'?'Action taken':'Reason for rescheduling'}</label><textarea required id="follow-up-note" maxLength={2000} value={note} onChange={event=>setNote(event.target.value)}/><p className="small subtle">This record is private to authorized staff. Completing a follow-up does not resolve the member’s concern.</p></div></fieldset>
 <div className="actions"><Button type="submit" disabled={change.saving}>{change.saving?'Saving follow-up…':change.uncertain?'Retry same follow-up action':kind==='complete'?'Complete follow-up':'Reschedule follow-up'}</Button>{dirty&&!blocked&&<Button variant="secondary" onClick={()=>{setNote('');setDate(detail.task.dueDate);setError('');change.reset();}}>Discard changes</Button>}</div></form>:<Notice>This follow-up was completed at {detail.task.completedAt}. Further work needs a new dated staff response.</Notice>}
 <FollowUpHistory detail={detail} blocked={blocked} onAccessDenied={onAccessDenied}/>
 </section>;
}
