import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {Link,useParams} from 'react-router-dom';
import type {z} from 'zod';
import {schemas} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {useMember} from './MemberContext';
import {useResource} from './useResource';
import {useCommand} from '../access/useCommand';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import {SupportCheckIn} from '../monitoring/SupportCheckIn';
import {Button,Notice} from '../../shared/ui';
import {dateLabel} from '../../domain/format';
import styles from './MemberApp.module.css';
type Source=z.output<typeof schemas.SupportCorrectionSource>;
type Input=z.output<typeof schemas.SupportCorrectionCreate>;
type Draft=Omit<Input,'noticeVersion'|'sharingConfirmed'>;
type Saved=z.output<typeof schemas.MemberSupport>;
const values=(source:Source):Draft=>({message:source.request.message,contactPreference:source.contactPreference,loanId:source.request.loanId,checkIn:source.request.checkIn,reason:''});
export function MemberSupportCorrection(){
 const {session}=useMember(),{id}=useParams(),[denied,setDenied]=useState(false),deny=useCallback(()=>setDenied(true),[setDenied]);
 if(denied)return <Notice tone="warning">This request is no longer available for your account. Reload or sign in again.</Notice>;
 if(!session||session.recordMode!=='fictional')return <Notice>Request corrections are not available here pending the cooperative’s release approval.</Notice>;
 return <CorrectionRead key={`${session.principal.memberId}:${session.expiresAt}:${session.privacyNoticeVersion}:${id}`} id={id!} onDenied={deny}/>;
}
function CorrectionRead({id,onDenied}:{id:string;onDenied:()=>void}){
 const {client}=useMember();
 const fail=useCallback((problem:unknown)=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status))onDenied();},[onDenied]);
 const load=useCallback(async(signal:AbortSignal)=>{try{const value=await client.getMemberSupportCorrectionSource(id,{signal});if(value.request.id!==id||value.links.requestId!==id)throw new Error('This request could not be loaded safely.');return value;}catch(e){if(!signal.aborted)fail(e);throw e;}},[client,id,fail]);
 const source=useResource(load,id,true);
 if(!source.data)return <div className={`stack ${styles.narrow}`}><h1>Review your payment-help request</h1>{source.loading?<p role="status">Loading your request…</p>:<><Notice role="alert" tone="warning">{source.error||'This request is unavailable.'}</Notice><Button onClick={source.refresh}>Retry request details</Button></>}<Link to="/member/help">Return to payment help</Link></div>;
 return <CorrectionWorkspace source={source.data} refreshing={source.loading} readError={source.error} refresh={source.refreshKeepingData} onFailure={fail}/>;
}
function CorrectionWorkspace({source,refreshing,readError,refresh,onFailure}:{source:Source;refreshing:boolean;readError:string;refresh:()=>void;onFailure:(e:unknown)=>void}){
 const {client,session}=useMember(),[draft,setDraft]=useState<Draft>(()=>values(source)),[editing,setEditing]=useState(false),[preview,setPreview]=useState(false),[consent,setConsent]=useState<string|null>(null),[saved,setSaved]=useState<Saved|null>(null),[validation,setValidation]=useState('');
 const command=useCommand<Input,Saved>(),busy=command.saving||command.uncertain,blocked=busy||refreshing;
 const loadLoans=useCallback(async(signal:AbortSignal)=>{try{return await client.listMemberLoans({signal});}catch(e){if(!signal.aborted)onFailure(e);throw e;}},[client,onFailure]),loans=useResource(loadLoans);
 const heading=useRef<HTMLHeadingElement>(null),formHeading=useRef<HTMLHeadingElement>(null),previewHeading=useRef<HTMLHeadingElement>(null),savedHeading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null);
 const problem=command.error||validation||readError,share=consent===source.sharingNoticeVersion,newer=source.links.replacedById;
 useUnsavedChanges(editing||busy,busy);
 useEffect(()=>{heading.current?.focus();},[source.request.id]);
 useEffect(()=>{if(editing)(preview?previewHeading:formHeading).current?.focus();},[editing,preview]);
 useEffect(()=>{if(saved)savedHeading.current?.focus();},[saved]);
 useEffect(()=>{if(problem)errors.current?.focus();},[problem]);
 function reload(){setConsent(null);setValidation('');command.reset();refresh();}
 function change(patch:Partial<Draft>){setDraft(current=>({...current,...patch}));setConsent(null);setPreview(false);setValidation('');}
 function start(){setDraft(values(source));setSaved(null);setEditing(true);setPreview(false);setConsent(null);setValidation('');command.reset();}
 async function submit(e:FormEvent){
  e.preventDefault();setValidation('');if(command.saving||refreshing||newer&&!command.uncertain)return;
  const parsed=schemas.SupportCorrectionCreate.safeParse({...draft,noticeVersion:source.sharingNoticeVersion,sharingConfirmed:true});
  if(!parsed.success){setValidation(parsed.error.issues[0].message);return;}
  if(!preview){setPreview(true);setConsent(null);return;}
  if(!command.uncertain&&!share){setValidation('Review this correction and confirm sharing before sending.');return;}
  const result=await command.submit(parsed.data,(body,key)=>client.correctMemberSupport(source.request.id,body,{idempotencyKey:key,csrfToken:session!.csrfToken}).catch(e=>{if(e instanceof ApiClientError&&e.status<500)setConsent(null);onFailure(e);throw e;}));
  if(result){setSaved(result);setEditing(false);setPreview(false);setConsent(null);refresh();}
 }
 const inventory=loans.data?.state==='available'?loans.data.data:[],loanLabel=(id:string|null)=>id?inventory.find(loan=>loan.id===id)?.label||'Original linked loan; details are currently unavailable.':'General help request';
 return <div className={`stack ${styles.narrow} ${styles.supportRequest}`}><h1 ref={heading} tabIndex={-1}>Review your payment-help request</h1>
 <Notice>A correction sends a new request for staff review. Your original request and its responses remain recorded. Payments, interest, fees and loan terms stay unchanged.</Notice>
 {problem&&<div ref={errors} tabIndex={-1}><Notice tone="warning" role="alert">{problem}</Notice></div>}{refreshing&&<p role="status">Refreshing request details. Your unsent correction is preserved.</p>}
 {saved&&<section className="panel panel-body stack" aria-label="Correction sent"><h2 ref={savedHeading} tabIndex={-1}>Correction sent</h2><Notice tone="success" role="status">Your corrected request is waiting for staff assignment. The earlier request and follow-ups remain unchanged.</Notice><p>{saved.message}</p><Link to={`/member/help/requests/${saved.id}`}>Review your new request</Link></section>}
 <section className="panel panel-body stack" aria-labelledby="correction-original"><h2 id="correction-original">Recorded request</h2><p>Sent {dateLabel(source.request.submittedAt)} · {source.request.status==='submitted'?'Sent for review':source.request.status==='assigned'?'Assigned to staff':'Reviewed'}</p><div className={styles.source}><p>{source.request.message}</p></div><SupportCheckIn value={source.request.checkIn} onChange={()=>{}} preview/><p>Related loan: {loanLabel(source.request.loanId)}</p><p>Preferred response: {source.contactPreference==='portal'?'In your account':'Phone call'}.</p>{source.request.response&&<Notice>{source.request.response}</Notice>}
 {source.reason&&<p>Your recorded correction reason: {source.reason}</p>}{source.links.replacesId&&<Link aria-disabled={busy} onClick={e=>{if(busy)e.preventDefault();}} to={`/member/help/requests/${source.links.replacesId}`}>View the previous request</Link>}
 {newer&&<><Notice tone="warning">A newer request replaces this one. {editing?'Your unsent correction is preserved. Review the newer request before sending.':'Open it to review the latest submitted information.'}</Notice><Link aria-disabled={busy} onClick={e=>{if(busy)e.preventDefault();}} to={`/member/help/requests/${newer}`}>Open newer request</Link></>}
 <div className="actions"><Button variant="secondary" disabled={blocked} onClick={reload}>Refresh request details</Button>{!editing&&!saved&&!newer&&<Button disabled={blocked} onClick={start}>Correct this request</Button>}</div></section>
 {editing&&<section className="panel panel-body"><form className={styles.form} onSubmit={e=>void submit(e)}>{preview?<><h2 ref={previewHeading} tabIndex={-1}>Review your correction</h2><div className={styles.source}><p>{draft.message}</p></div><SupportCheckIn value={draft.checkIn!} onChange={()=>{}} preview/><p>Related loan: {loanLabel(draft.loanId)}</p><p>Correction reason: {draft.reason}</p><p>Cooperative support staff will receive the replacement message, check-in answers, selected loan reference and your account reference for review. Your preferred response is {draft.contactPreference==='portal'?'in your account':'by phone'}. Sharing notice: {source.sharingNoticeVersion}.</p><label className={styles.check}><input type="checkbox" required checked={share} disabled={blocked} onChange={e=>setConsent(e.target.checked?source.sharingNoticeVersion:null)}/>I reviewed this correction and agree to send it for staff review.</label></>:<><h2 ref={formHeading} tabIndex={-1}>Correct your request</h2><fieldset disabled={blocked} className="stack"><div className="field"><label htmlFor="correction-message">Updated message</label><textarea id="correction-message" required maxLength={2000} value={draft.message} onChange={e=>change({message:e.target.value})}/></div><div className="field"><label htmlFor="correction-reason">Why are you correcting this request?</label><textarea id="correction-reason" required maxLength={2000} value={draft.reason} onChange={e=>change({reason:e.target.value})}/></div><div className="field"><label htmlFor="correction-contact">Preferred response</label><select id="correction-contact" value={draft.contactPreference} onChange={e=>change({contactPreference:e.target.value as Draft['contactPreference']})}><option value="portal">In my account</option><option value="phone">Phone call</option></select></div><div className="field"><label htmlFor="correction-loan">Related loan</label><select id="correction-loan" value={draft.loanId??''} onChange={e=>change({loanId:e.target.value||null})}><option value="">General help request</option>{draft.loanId&&!inventory.some(loan=>loan.id===draft.loanId)&&<option value={draft.loanId}>Original linked loan — details unavailable</option>}{inventory.map(loan=><option key={loan.id} value={loan.id}>{loan.label}</option>)}</select>{(loans.error||loans.data?.state==='unavailable')&&<p>Loan details are unavailable. The existing reference is preserved unless you change it. You can choose a general help request if appropriate.</p>}</div><SupportCheckIn value={draft.checkIn!} onChange={checkIn=>change({checkIn})}/></fieldset></>}
 <div className="actions"><Button type="submit" disabled={command.saving||refreshing||Boolean(newer)&&!command.uncertain}>{command.saving?'Sending…':command.uncertain?'Retry same correction':preview?'Send correction':'Review correction'}</Button>{preview&&!busy&&<Button variant="secondary" disabled={refreshing} onClick={()=>{setPreview(false);setConsent(null);}}>Edit correction</Button>}{!busy&&<Button variant="quiet" disabled={refreshing} onClick={()=>{setEditing(false);setPreview(false);setConsent(null);setValidation('');command.reset();}}>Discard correction</Button>}</div></form></section>}
 <Link to="/member/help">Return to payment help and request history</Link></div>;
}
