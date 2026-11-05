import {useCallback,useEffect,useLayoutEffect,useRef,useState,type FormEvent} from 'react';
import type {z} from 'zod';
import {SupportAssignmentSchema,SupportResponseSchema,SupportHistorySchema,SupportSummarySchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError,type RequestOptions} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {usePage} from '../access/usePage';
import {useCommand} from '../access/useCommand';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import {Badge,Button,Money,Notice} from '../../shared/ui';
import {StaffResponseHistory} from './StaffResponseHistory';
import {StaffFollowUps} from './StaffFollowUps';
import {CurrentSupportPosition} from './CurrentSupportPosition';
import styles from './support.module.css';
type Detail=z.output<typeof SupportHistorySchema>;type Summary=z.output<typeof SupportSummarySchema>;
type Assignment=z.input<typeof SupportAssignmentSchema>;type Response=z.input<typeof SupportResponseSchema>;
const label=(s:string)=>s.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export default function SupportQueuePage(){
 const {session}=useStaff(),[denied,setDenied]=useState(false);
 const deny=useCallback(()=>setDenied(true),[]);
 if(denied||!session?.user.roles.some(role=>role==='administrator'||role==='officer'))return <Notice tone="warning">Support requires an assigned officer or branch administrator. Reload after your access is reviewed.</Notice>;
 const scope=[session.user.id,session.user.organizationId,session.user.roles.join(','),session.user.branchIds.join(','),session.expiresAt].join(':');
 return <SupportWorkspace key={scope} onDenied={deny}/>;
}
function SupportWorkspace({onDenied}:{onDenied:()=>void}){
 const {session}=useStaff(),[view,setView]=useState<'requests'|'follow-ups'>('requests'),[locked,setLocked]=useState(false);
 return <div className="stack"><header><h1>Payment-help requests</h1><p className="subtle">Review confirmed concerns, record a response and agree a follow-up.</p></header>
 {session?.user.roles.includes('officer')&&<nav className="actions" aria-label="Support workspace"><Button variant={view==='requests'?'primary':'secondary'} aria-pressed={view==='requests'} disabled={locked} onClick={()=>setView('requests')}>Support requests</Button><Button variant={view==='follow-ups'?'primary':'secondary'} aria-pressed={view==='follow-ups'} disabled={locked} onClick={()=>setView('follow-ups')}>Follow-ups</Button></nav>}
 {view==='requests'?<SupportQueue onDenied={onDenied} onBlockedChange={setLocked}/>:<StaffFollowUps onAccessDenied={onDenied} onBlockedChange={setLocked}/>}
 </div>;
}
function SupportQueue({onDenied,onBlockedChange}:{onDenied:()=>void;onBlockedChange:(value:boolean)=>void}){
 const {session,client}=useStaff(),administrator=Boolean(session?.user.roles.includes('administrator')),officer=Boolean(session?.user.roles.includes('officer'));
 const [selected,setSelected]=useState<Summary|null>(null),[detail,setDetail]=useState<Detail|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const [officerId,setOfficer]=useState(''),[reason,setReason]=useState(''),[response,setResponse]=useState(''),[internalNote,setNote]=useState(''),[followUp,setFollowUp]=useState(''),[filter,setFilter]=useState('all');
 const assignment=useCommand<Assignment,Summary>(),reply=useCommand<Response,Detail>();
 const request=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null);
 const dirty=Boolean(reason||response||internalNote||followUp),blocked=assignment.saving||assignment.uncertain||reply.saving||reply.uncertain;
 useLayoutEffect(()=>{onBlockedChange(dirty||blocked);return()=>onBlockedChange(false);},[dirty,blocked,onBlockedChange]);
 useUnsavedChanges(dirty||blocked,assignment.uncertain||reply.uncertain);
 useEffect(()=>()=>request.current?.abort(),[]);
 const failure=useCallback((problem:unknown)=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onDenied();return;}setError(problem instanceof Error?problem.message:'Support is unavailable.');},[onDenied]);
 const loader=useCallback((options:RequestOptions)=>client.listSupportRequests(options).catch((e:unknown)=>{if(!options.signal?.aborted)failure(e);throw e;}),[client,failure]);
 const page=usePage(loader);
 const staffLoader=useCallback((options:RequestOptions)=>administrator?client.listStaff(options):Promise.resolve({items:[],nextCursor:null}),[administrator,client]);
 const staff=usePage(staffLoader);
 const commandError=assignment.error||reply.error;
 useEffect(()=>{if(error||commandError)errors.current?.focus();},[error,commandError]);
 async function open(row:Summary){
  request.current?.abort();const controller=new AbortController();request.current=controller;setSelected(row);setDetail(null);setError('');setOfficer('');
  if(!officer||row.assignedOfficerId!==session!.user.id){window.setTimeout(()=>heading.current?.focus(),0);return;}
  setLoading(true);
  try{const value=await client.getSupportHistory(row.id,{signal:controller.signal});if(!controller.signal.aborted){setDetail(value);setSelected(value);window.setTimeout(()=>heading.current?.focus(),0);}}
  catch(e){if(!controller.signal.aborted)failure(e);}finally{if(!controller.signal.aborted)setLoading(false);}
 }
 async function assign(event:FormEvent){event.preventDefault();setError('');const parsed=SupportAssignmentSchema.safeParse({officerId,reason});if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const row=selected!;const result=await assignment.submit(parsed.data,(body,key)=>client.assignSupportRequest(row.id,body,{version:row.version,csrfToken:session!.csrfToken,idempotencyKey:key}).catch(e=>{failure(e);throw e;}));
  if(result){setReason('');setSelected(result);setDetail(null);page.refresh();}
 }
 async function respond(event:FormEvent){event.preventDefault();setError('');const parsed=SupportResponseSchema.safeParse({response,internalNote,followUpDate:followUp||null});if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const row=detail!;const result=await reply.submit(parsed.data,(body,key)=>client.createSupportAction(row.id,body,{version:row.version,csrfToken:session!.csrfToken,idempotencyKey:key}).catch(e=>{failure(e);throw e;}));
  if(result){
   setDetail(result);setSelected(result);setResponse('');setNote('');setFollowUp('');page.refresh();
   request.current?.abort();const controller=new AbortController();request.current=controller;setLoading(true);
   // A successful replay confirms the original write; this separate read retrieves the latest view.
   try{const current=await client.getSupportHistory(row.id,{signal:controller.signal});if(!controller.signal.aborted){setDetail(current);setSelected(current);window.setTimeout(()=>heading.current?.focus(),0);}}
   catch(problem){if(!controller.signal.aborted)failure(problem);}finally{if(!controller.signal.aborted)setLoading(false);}
  }
 }
 const rows=page.items.filter(row=>filter==='all'||row.status===filter);
 return <div className="stack">
 <Notice>Requests and responses do not change payments, interest, fees or loan terms. A current repayment record can coexist with reported difficulty.</Notice>
 {(error||commandError)&&<div ref={errors} tabIndex={-1}><Notice role="alert" tone="danger">{commandError||error}</Notice>{(error.includes('multi-factor')||commandError.includes('multi-factor'))&&<a href="/api/v1/auth/login?assurance=mfa&amp;returnTo=%2Fstaff%2Fsupport-requests">Sign in with MFA</a>}</div>}
 <section className="panel" aria-labelledby="support-list"><div className={`panel-header ${styles.heading}`}><h2 id="support-list">Support queue</h2><Button variant="quiet" disabled={blocked||dirty||loading||page.loading} onClick={()=>{setSelected(null);setDetail(null);page.refresh();}}>Refresh queue</Button></div>
 <div className="panel-body field"><label htmlFor="support-filter">Filter loaded requests</label><select id="support-filter" value={filter} onChange={e=>setFilter(e.target.value)}>{['all','submitted','assigned','reviewed'].map(value=><option key={value} value={value}>{label(value)}</option>)}</select></div>
 <div className="table-scroll" role="region" aria-label="Support request queue" tabIndex={0}><table className={styles.table}><caption className="sr-only">Requests within your current branch and assignment access</caption><thead><tr><th scope="col">Request / member</th><th scope="col">Submitted</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{rows.map(row=><tr key={row.id}><th scope="row"><span className={styles.id}>{row.id}</span><span className={styles.id}>Member: {row.memberId}</span></th><td>{new Date(row.submittedAt).toLocaleString('en-PH',{timeZone:'Asia/Manila'})}</td><td><Badge>{label(row.status)}</Badge></td><td><Button variant="quiet" disabled={blocked||dirty||loading} onClick={()=>void open(row)} aria-label={`Open support request ${row.id}`}>Open support request</Button></td></tr>)}</tbody></table></div>
 {page.loading?<p className="panel-body" role="status">Loading queue…</p>:page.error?<div className="panel-body"><Notice tone="warning">{page.error}</Notice><Button disabled={blocked||dirty} onClick={page.refresh}>Retry queue</Button></div>:!rows.length?<p className="panel-body">No loaded requests match this view.</p>:null}
 {page.hasMore&&<div className="panel-body"><Button disabled={blocked||dirty||page.loading} onClick={()=>void page.more()}>Load more requests</Button></div>}</section>
 {selected&&<section className="panel panel-body stack" aria-labelledby="support-detail"><h2 ref={heading} tabIndex={-1} id="support-detail">Selected support request</h2><p className={styles.id}>{selected.id} · Version {selected.version}</p>
 {!blocked&&dirty&&<Button variant="secondary" onClick={()=>{setReason('');setResponse('');setNote('');setFollowUp('');assignment.reset();reply.reset();setSelected(null);setDetail(null);setError('');page.refresh();}}>Discard draft and reload queue</Button>}
 {administrator&&<form className="stack" onSubmit={e=>void assign(e)}><h3>Assign responsible officer</h3><p>Assignment access does not reveal the member’s shared message or private staff notes.</p>
 <fieldset disabled={blocked} className="stack"><div className="field"><label htmlFor="support-officer">Responsible officer</label><select required id="support-officer" value={officerId} onChange={e=>setOfficer(e.target.value)}><option value="">Choose an active branch officer</option>{staff.items.filter(s=>s.active&&s.roles.includes('officer')&&s.branchIds.includes(selected.branchId)).map(s=><option key={s.id} value={s.id}>{s.displayName}</option>)}</select></div>
 {staff.error&&<Notice tone="warning">{staff.error}</Notice>}{staff.hasMore&&<Button type="button" variant="secondary" disabled={staff.loading} onClick={()=>void staff.more()}>Load more officers</Button>}
 <div className="field"><label htmlFor="support-reason">Assignment reason</label><textarea id="support-reason" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></div></fieldset><div className="actions"><Button type="submit" disabled={assignment.saving}>{assignment.saving?'Assigning…':assignment.uncertain?'Retry same assignment':'Assign officer'}</Button></div></form>}
 {loading&&<p role="status">Opening disclosure…</p>}
 {detail&&<><section className="stack"><h3>Confirmed member concern</h3><p className={styles.message}>{detail.message}</p><p>Preferred response: {detail.contactPreference}. Sharing notice: {detail.noticeVersion}.</p><dl className={styles.metadata}><dt>Can meet essentials</dt><dd>{label(detail.checkIn.canMeetEssentials)}</dd><dt>Borrowed to repay</dt><dd>{label(detail.checkIn.borrowedToRepay)}</dd><dt>Financial strain</dt><dd>{label(detail.checkIn.financialStrain)}</dd></dl></section>
 <section className="stack"><h3>Dated loan position</h3><Notice>{detail.positionMessage}</Notice>{detail.position&&<dl className={styles.metadata}><dt>As of</dt><dd>{detail.position.asOfDate}</dd><dt>Posted through</dt><dd>{detail.position.postedThrough}</dd><dt>Principal</dt><dd><Money value={detail.position.principalCentavos}/></dd><dt>Overdue</dt><dd><Money value={detail.position.overdueCentavos}/></dd><dt>Pending movements</dt><dd>{detail.position.pendingMovementCount}</dd></dl>}</section>

 <CurrentSupportPosition key={`position:${detail.id}:${detail.version}`} requestId={detail.id} blocked={blocked} onAccessDenied={failure}/>
 <form className="stack" onSubmit={e=>void respond(e)}><h3>Record a response</h3><fieldset disabled={blocked} className="stack"><div className="field"><label htmlFor="support-response">Response shared with member</label><textarea id="support-response" required maxLength={2000} value={response} onChange={e=>setResponse(e.target.value)}/></div><div className="field"><label htmlFor="support-note">Internal staff action / note</label><textarea id="support-note" required maxLength={2000} value={internalNote} onChange={e=>setNote(e.target.value)}/><p className="small subtle">This note is not included in member history.</p></div><div className="field"><label htmlFor="support-follow-up">Follow-up date (optional)</label><input type="date" id="support-follow-up" value={followUp} onChange={e=>setFollowUp(e.target.value)}/><p className="small subtle">Each dated response creates a separate staff follow-up. Use Follow-ups to complete or reschedule an existing task.</p></div></fieldset><div className="actions"><Button type="submit" disabled={reply.saving}>{reply.saving?'Recording…':reply.uncertain?'Retry same response':'Publish response'}</Button></div></form>

 <StaffResponseHistory key={`${detail.id}:${detail.version}`} detail={detail} blocked={blocked} onAccessDenied={failure}/></>}
 </section>}</div>;
}
