import {useCallback,useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import type {z} from 'zod';
import {schemas} from '../../../packages/contracts/src/schemas';
import type {RequestOptions} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {useCommand} from '../access/useCommand';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import {Button,Notice} from '../../shared/ui';
import {SupportCheckIn,emptyCheckIn,type CheckIn} from './SupportCheckIn';
import {useAssistedDrafts} from './useAssistedDrafts';
type Content=z.output<typeof schemas.AssistedCheckInContent>;type Receipt=z.output<typeof schemas.AssistedCheckInReceipt>;
type Change={kind:'prepare';body:Content}|{kind:'revise';body:Content}|{kind:'withdraw';body:{reason:string}};
export function AssistedCheckInStaff({requestId,sourceVersion,blocked,onDenied,onBlockedChange}:{requestId:string;sourceVersion:number;blocked:boolean;onDenied:()=>void;onBlockedChange:(value:boolean)=>void}){
 const {client,session}=useStaff();
 const load=useCallback((o:RequestOptions)=>client.listAssistedCheckIns(requestId,o),[client,requestId]),get=useCallback((id:string,o:RequestOptions)=>client.getAssistedCheckIn(id,o),[client]);
 const drafts=useAssistedDrafts(load,get,onDenied),command=useCommand<Change,Receipt>();
 const [mode,setMode]=useState<'prepare'|'revise'|'withdraw'|null>(null),[message,setMessage]=useState(''),[contact,setContact]=useState<'portal'|'phone'>('portal'),[checkIn,setCheckIn]=useState<CheckIn>(emptyCheckIn),[reason,setReason]=useState(''),[error,setError]=useState(''),[saved,setSaved]=useState('');
 const writing=command.saving||command.uncertain,locked=blocked||writing||drafts.loading;
 useLayoutEffect(()=>{onBlockedChange(mode!==null||writing);return()=>onBlockedChange(false);},[mode,writing,onBlockedChange]);
 useUnsavedChanges(mode!==null||writing,writing);
 const current=drafts.detail;
 const heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null),problem=command.error||error||drafts.error;
 useEffect(()=>{heading.current?.focus();},[mode,current?.id,current?.version]);
 useEffect(()=>{if(problem)errors.current?.focus();},[problem]);
 function edit(kind:'prepare'|'revise'|'withdraw'){
  command.reset();setError('');setSaved('');setMode(kind);setReason('');
  const body=kind==='revise'?current?.content:undefined;setMessage(body?.message??'');setContact(body?.contactPreference??'portal');setCheckIn(body?.checkIn??emptyCheckIn());
 }
 async function send(e:FormEvent){
  e.preventDefault();if(!mode)return;
  const parsed=mode==='withdraw'?schemas.AssistedCheckInWithdraw.safeParse({reason}):schemas.AssistedCheckInContent.safeParse({message,contactPreference:contact,checkIn});
  if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const change:Change=mode==='withdraw'?{kind:'withdraw',body:{reason}}:{kind:mode,body:{message,contactPreference:contact,checkIn}};
  const id=current?.id,version=current?.version;
  const receipt=await command.submit(change,(value,key)=>{
   const options={idempotencyKey:key,csrfToken:session!.csrfToken,version:value.kind==='prepare'?sourceVersion:version};
   return(value.kind==='prepare'?client.createAssistedCheckIn(requestId,value.body,options):value.kind==='revise'?client.reviseAssistedCheckIn(id!,value.body,options):client.withdrawAssistedCheckIn(id!,value.body,options)).catch(e=>{drafts.failure(e);throw e;});
  });
  if(receipt){setMode(null);setMessage('');setReason('');setSaved(receipt.state==='withdrawn'?'Draft withdrawn. It was not submitted as a member concern.':'Draft saved for the member to review in their own account. It is not a confirmed concern.');await drafts.refresh();await drafts.open(receipt.id);}
 }
 return <section className="stack" aria-labelledby="assisted-staff-title"><h3 id="assisted-staff-title">Staff-assisted check-in</h3><p>Fictional prototype. Prepare the member’s words for them to review. Only their own account can confirm sharing; payments and loan terms stay unchanged.</p>
 {problem&&<div ref={errors} tabIndex={-1}><Notice role="alert" tone="danger">{problem}</Notice></div>}{saved&&<Notice tone="success" role="status">{saved}</Notice>}
 {!mode&&<div className="actions"><Button variant="secondary" disabled={locked||drafts.items.some(d=>d.state==='pending')} onClick={()=>edit('prepare')}>Prepare check-in</Button><Button variant="quiet" disabled={locked} onClick={()=>void drafts.refresh()}>Refresh drafts</Button></div>}
 {drafts.loading&&<p role="status">Loading drafts…</p>}
 {!mode&&drafts.items.map(d=><div key={d.id} className="actions"><span>Version {d.version} · {d.state} · {new Date(d.updatedAt).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</span><Button variant="quiet" disabled={locked} onClick={()=>{setSaved('');void drafts.open(d.id);}}>Open draft {d.id}</Button></div>)}
 {!mode&&drafts.hasMore&&<Button variant="secondary" disabled={locked} onClick={()=>void drafts.more()}>Load older drafts</Button>}
 {current&&!mode&&<section className="stack" aria-label="Selected assisted draft"><h4 ref={heading} tabIndex={-1}>Draft version {current.version} · {current.state}</h4><p>{current.content.message}</p><SupportCheckIn value={current.content.checkIn} onChange={()=>{}} preview/><p>Preferred response: {current.content.contactPreference}. Notice: {current.noticeVersion}.</p>{current.reviewMessage&&<Notice tone="warning">{current.reviewMessage}</Notice>}{current.state==='pending'&&<div className="actions"><Button variant="secondary" disabled={locked} onClick={()=>edit('revise')}>Revise draft</Button><Button variant="quiet" disabled={locked} onClick={()=>edit('withdraw')}>Withdraw draft</Button></div>}{current.state==='confirmed'&&<Notice>The member confirmed this draft. A new unassigned request awaits normal staff assignment.</Notice>}</section>}
 {mode&&<form className="stack" onSubmit={e=>void send(e)}><h4 ref={heading} tabIndex={-1}>{mode==='withdraw'?'Withdraw draft':mode==='revise'?'Revise draft':'Prepare draft'}</h4><fieldset className="stack" disabled={blocked||writing}>
 {mode==='withdraw'?<div className="field"><label htmlFor="assisted-withdraw-reason">Withdrawal reason (staff record)</label><textarea id="assisted-withdraw-reason" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></div>:<><div className="field"><label htmlFor="assisted-message">Message for the member to review</label><textarea id="assisted-message" required maxLength={2000} value={message} onChange={e=>setMessage(e.target.value)}/></div><div className="field"><label htmlFor="assisted-contact">Preferred response</label><select id="assisted-contact" value={contact} onChange={e=>setContact(e.target.value as 'portal'|'phone')}><option value="portal">In member account</option><option value="phone">Phone call</option></select></div><SupportCheckIn value={checkIn} onChange={setCheckIn}/><p>Leave unknown answers as “Not provided”. The linked loan, if any, comes from the original request.</p></>}
 </fieldset><div className="actions"><Button type="submit" disabled={blocked||command.saving}>{command.saving?'Saving…':command.uncertain?'Retry same draft submission':mode==='withdraw'?'Confirm withdrawal':'Save for member review'}</Button>{!writing&&<Button variant="secondary" disabled={blocked} onClick={()=>{setMode(null);setMessage('');setReason('');setError('');command.reset();}}>Discard changes</Button>}</div></form>}
 </section>;
}
