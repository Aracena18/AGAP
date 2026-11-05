import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import type { PriorityReviewPage as QueueSchema } from '../../../packages/contracts/src/priority-review';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { Badge, Button, Notice } from '../../shared/ui';
import { useStaff } from '../access/StaffContext';
import type { PriorityReviewGateway } from './gateway';
import styles from './reviews.module.css';
export const reviewLabel=(value:string)=>value.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export const reviewTime=(value:string)=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'});
export function PriorityQueuePage({gateway}:{gateway?:PriorityReviewGateway}){
 const {session}=useStaff();
 if(!session||!session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r)))return <Notice tone="warning">Priority review requires authorized lending review access.</Notice>;
 if(!gateway)return <Notice>Priority review is unavailable. Existing evidence and manual assessment remain available.</Notice>;
 return <Queue key={[session.user.id,session.user.organizationId,session.user.branchIds,session.user.roles,session.csrfToken].join(':')} gateway={gateway}/>;
}
function Queue({gateway}:{gateway:PriorityReviewGateway}){
 const [route,setRoute]=useState('all'),[data,setData]=useState<z.output<typeof QueueSchema>|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[denied,setDenied]=useState(false);
 const abort=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null);
 const load=useCallback(async(cursor?:string)=>{abort.current?.abort();const controller=new AbortController();abort.current=controller;setLoading(true);setError('');if(!cursor)setData(null);
  try{const value=await gateway.getPriorityReviewQueue({signal:controller.signal,limit:20,route,...(cursor?{cursor}:{})});if(!controller.signal.aborted){setData(previous=>cursor&&previous?{...value,items:[...previous.items,...value.items]}:value);if(cursor&&!value.nextCursor)heading.current?.focus();}}
  catch(problem){if(!controller.signal.aborted){if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){setData(null);setDenied(true);}setError(problem instanceof Error?problem.message:'The queue is unavailable. Refresh to start a current read.');}}
  finally{if(!controller.signal.aborted)setLoading(false);}
 },[gateway,route]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void load();});return()=>{active=false;abort.current?.abort();};},[load]);
 useEffect(()=>{if(error)errors.current?.focus();},[error]);
 return <div className="stack"><header className={styles.heading}><div><h1 ref={heading} tabIndex={-1}>Review priority</h1><p className="subtle">Find the next justified action and its responsible person.</p></div><Button variant="secondary" disabled={loading||denied} onClick={()=>void load()}>Refresh queue</Button></header>
 <Notice>Current human-confirmed material concerns appear first. Each group then follows original waiting time and application ID. This is an attention queue, not a lending-risk score.</Notice>
 <div className="field"><label htmlFor="review-route">Next action</label><select id="review-route" value={route} disabled={loading||denied} onChange={e=>setRoute(e.target.value)}>{['all','escalated_review','needs_clarification','awaiting_concern_check','ready_for_approval','preparation','unavailable'].map(value=><option key={value} value={value}>{reviewLabel(value)}</option>)}</select></div>
 {error&&<div ref={errors} tabIndex={-1}><Notice tone="warning" role="alert">{error}</Notice>{!denied&&<Button variant="secondary" disabled={loading} onClick={()=>void load()}>Retry queue</Button>}</div>}
 {loading&&!data&&<p role="status">Loading the authorized review queue…</p>}
 {data&&<section className="panel"><div className="panel-header"><p>As of {reviewTime(data.asOf)} (Manila) · {data.items.length} loaded</p></div><div className="table-scroll" role="region" aria-label="Application review priority" tabIndex={0}><table className={styles.table}><caption className="sr-only">Priority applies across your authorized cohort before paging.</caption><thead><tr><th scope="col">Application / member</th><th scope="col">Next action</th><th scope="col">Waiting since</th><th scope="col">Reason and responsibility</th></tr></thead><tbody>{data.items.map(row=><tr key={row.applicationId}><th scope="row"><Link to={`/staff/applications/${row.applicationId}/review`}>{row.memberName}</Link><p className="small subtle">{row.applicationId}</p></th><td><Badge tone={row.attentionGroup==='substantiated_material'?'warning':'neutral'}>{reviewLabel(row.readiness.route)}</Badge></td><td>{reviewTime(row.queueEnteredAt)}<p className="small subtle">{row.queueEntryBasis==='first_submission'?'First submission':'Recorded received date'}</p></td><td className={styles.reason}><p>{row.positionReason}</p><p>{row.readiness.nextAction}</p><p className="small subtle">Preparing officer: {row.assignedOfficerId??'Not assigned'}</p><ul>{row.readiness.blockers.map((b,index)=><li key={`${b.code}:${index}`}>{b.message}</li>)}</ul></td></tr>)}</tbody></table></div>{!data.items.length&&<p className="panel-body">No authorized active applications match this next-action filter.</p>}{data.nextCursor?<div className="panel-body"><Button variant="secondary" disabled={loading} onClick={()=>void load(data.nextCursor!)}>{loading?'Loading older entries…':'Load more applications'}</Button></div>:<p className="panel-body small subtle">All entries in this snapshot are loaded. Refresh for changed priorities.</p>}</section>}
 </div>;
}
