import {useCallback,useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import type {z} from 'zod';
import type {schemas} from '../../../packages/contracts/src/schemas';
import {ApiClientError,type RequestOptions} from '../../../packages/api-client/src/transport';
import {useMember} from './MemberContext';
import {useResource} from './useResource';
import {useCommand} from '../access/useCommand';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import {useAssistedDrafts} from '../monitoring/useAssistedDrafts';
import {SupportCheckIn} from '../monitoring/SupportCheckIn';
import {Button,Notice} from '../../shared/ui';
import {MemberGuide} from './MemberGuide';
import styles from './MemberApp.module.css';
type Receipt=z.output<typeof schemas.AssistedCheckInReceipt>;
type Change={kind:'confirm';body:z.input<typeof schemas.AssistedCheckInConfirm>}|{kind:'decline';body:Record<string,never>};
export function MemberAssistedCheckIns(){
 const {session}=useMember(),[denied,setDenied]=useState(false),deny=useCallback(()=>setDenied(true),[setDenied]);
 if(denied)return <Notice tone="warning">Your assisted check-ins are no longer available for this account. Reload or sign in again.</Notice>;
 if(session?.recordMode!=='fictional')return <Notice>Assisted check-ins are not available until the cooperative’s rules are approved.</Notice>;
 return <Workspace key={`${session.principal.memberId}:${session.expiresAt}`} onDenied={deny}/>;
}
function Workspace({onDenied}:{onDenied:()=>void}){
 const {client,session}=useMember(),[share,setShare]=useState(false),[attempt,setAttempt]=useState<'confirm'|'decline'|null>(null),[saved,setSaved]=useState('');
 const load=useCallback((o:RequestOptions)=>client.listMemberAssistedCheckIns(o),[client]),get=useCallback((id:string,o:RequestOptions)=>client.getMemberAssistedCheckIn(id,o),[client]);
 const drafts=useAssistedDrafts(load,get,onDenied),command=useCommand<Change,Receipt>();
 const loadLoans=useCallback((signal:AbortSignal)=>client.listMemberLoans({signal}),[client]),loans=useResource(loadLoans);
 const busy=command.saving||command.uncertain,locked=busy||drafts.loading,current=drafts.detail;
 const heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null),error=command.error||drafts.error;
 useEffect(()=>{heading.current?.focus();},[current?.id,current?.version]);
 useEffect(()=>{if(error)errors.current?.focus();},[error]);
 useUnsavedChanges(share||busy,busy);
 function open(id:string){setShare(false);setSaved('');setAttempt(null);command.reset();void drafts.open(id);}
 async function send(kind:'confirm'|'decline'){
  if(!current)return;setAttempt(kind);
  const id=current.id,version=current.version;
  const change:Change=kind==='confirm'?{kind,body:{sharingConfirmed:true,noticeVersion:current.noticeVersion,payloadSha256:current.payloadSha256}}:{kind,body:{}};
  const receipt=await command.submit(change,(value,key)=>{
   const options={idempotencyKey:key,csrfToken:session!.csrfToken,version};
   return(value.kind==='confirm'?client.confirmMemberAssistedCheckIn(id,value.body,options):client.declineMemberAssistedCheckIn(id,value.body,options)).catch(e=>{
    if(e instanceof ApiClientError&&e.status<500)setShare(false);drafts.failure(e);throw e;
   });
  });
  if(receipt){setShare(false);setAttempt(null);setSaved(receipt.state==='confirmed'?'You confirmed this message. Your new payment-help request is waiting for staff assignment.':'You declined this draft. It was not sent as a payment-help request.');await drafts.refresh();await drafts.open(id);}
 }
 return <div className={`stack ${styles.narrow}`}><div className={styles.intro}><h1>Review a staff-prepared check-in</h1><p>Fictional prototype</p></div><MemberGuide reassuring>Read what staff prepared. You decide whether to share it.</MemberGuide><Notice>Reviewing a draft does not send a request or change your payments, interest, fees or loan terms.</Notice>
 {error&&<div ref={errors} tabIndex={-1}><Notice role="alert" tone="danger">{error}</Notice></div>}{saved&&<Notice tone="success" role="status">{saved}</Notice>}
 <section className="panel panel-body stack" aria-labelledby="assisted-member-list"><h2 id="assisted-member-list">Your drafts</h2><Button variant="secondary" disabled={locked} onClick={()=>{setShare(false);setSaved('');command.reset();void drafts.refresh();}}>Refresh drafts</Button>
 {drafts.loading&&<p role="status">Loading drafts…</p>}{!drafts.loading&&!drafts.error&&!drafts.items.length&&<p>No staff-prepared check-ins are available.</p>}
 {drafts.items.map(d=><div key={d.id} className="stack"><p>Prepared by {d.preparedByName} · Version {d.version} · {d.state}</p><Button variant="secondary" disabled={locked} onClick={()=>open(d.id)}>Review draft from {new Date(d.preparedAt).toLocaleDateString('en-PH',{timeZone:'Asia/Manila'})}</Button></div>)}
 {drafts.hasMore&&<Button variant="secondary" disabled={locked} onClick={()=>{setShare(false);void drafts.more();}}>Load older drafts</Button>}</section>
 {current&&<section className="panel panel-body stack" aria-labelledby="assisted-member-review"><h2 ref={heading} tabIndex={-1} id="assisted-member-review">Review version {current.version}</h2><p>Prepared by {current.preparedByName}. Status: {current.state}.</p><div className={styles.source}><p>{current.content.message}</p></div><SupportCheckIn value={current.content.checkIn} onChange={()=>{}} preview/>
 <p>Related loan: {current.content.loanId?(loans.data?.state==='available'?loans.data.data.find(l=>l.id===current.content.loanId)?.label:null)||'Linked to the original request; loan details are currently unavailable.':'General help request'}</p>
 <p>Cooperative support staff will receive this message, check-in answers and your account reference to review your request. Your preferred response is {current.content.contactPreference==='portal'?'in this account':'by phone'}. Sharing notice: {current.noticeVersion}.</p>
 {current.reviewMessage&&<Notice tone="warning">{current.reviewMessage}</Notice>}
 {current.state==='pending'&&<><p>If anything is wrong, ask staff to revise the draft or decline it. An updated draft needs your review again.</p>
 {current.confirmationAllowed&&<label className={styles.check}><input type="checkbox" checked={share} disabled={locked} onChange={e=>setShare(e.target.checked)}/>I reviewed this exact version and agree to send it for staff review.</label>}
 <div className="actions">{current.confirmationAllowed&&<Button disabled={command.saving||drafts.loading||(!command.uncertain&&!share)||(command.uncertain&&attempt!=='confirm')} onClick={()=>void send('confirm')}>{command.saving&&attempt==='confirm'?'Confirming…':command.uncertain&&attempt==='confirm'?'Retry same confirmation':'Confirm and send request'}</Button>}
 <Button variant="secondary" disabled={command.saving||drafts.loading||(command.uncertain&&attempt!=='decline')} onClick={()=>void send('decline')}>{command.saving&&attempt==='decline'?'Declining…':command.uncertain&&attempt==='decline'?'Retry same decline':'Decline draft'}</Button>
 <Button variant="quiet" disabled={locked} onClick={()=>open(current.id)}>Reload current version</Button></div></>}
 {current.state==='confirmed'&&<Notice>Your confirmed request is in your payment-help history. Staff assignment is a separate step.</Notice>}</section>}
 <Link to="/member/help">Return to payment help and request history</Link></div>;
}
