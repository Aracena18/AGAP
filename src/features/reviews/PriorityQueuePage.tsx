import { useCallback, useEffect, useRef, useState } from 'react';
import type { z } from 'zod';
import type { PriorityReviewPage as QueueSchema } from '../../../packages/contracts/src/priority-review';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { Button, Notice } from '../../shared/ui';
import { useStaff } from '../access/StaffContext';
import type { PriorityReviewGateway } from './gateway';
import { QueueHeading,QueueGuide,QueueStatus,QueueLink,QueueDate,queueReference } from './QueuePresentation';
import styles from './queue.module.css';
export const reviewLabel=(value:string)=>value.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
export const reviewTime=(value:string)=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'});
export function PriorityQueuePage({gateway}:{gateway?:PriorityReviewGateway}){
 const {session}=useStaff();
 if(!session||!session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r)))return <Notice tone="warning">Priority review requires authorized lending review access.</Notice>;
 if(!gateway)return <Notice>Priority review is unavailable. Existing evidence and manual assessment remain available.</Notice>;
 return <Queue key={[session.user.id,session.user.organizationId,session.user.branchIds,session.user.roles,session.csrfToken].join(':')} gateway={gateway}/>;
}
function Queue({gateway}:{gateway:PriorityReviewGateway}){
 const {session}=useStaff();
 const [route,setRoute]=useState('all'),[data,setData]=useState<z.output<typeof QueueSchema>|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(''),[denied,setDenied]=useState(false);
 const abort=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null);
 const load=useCallback(async(cursor?:string)=>{abort.current?.abort();const controller=new AbortController();abort.current=controller;setLoading(true);setError('');if(!cursor)setData(null);
  try{const value=await gateway.getPriorityReviewQueue({signal:controller.signal,limit:20,route,...(cursor?{cursor}:{})});if(!controller.signal.aborted){setData(previous=>cursor&&previous?{...value,items:[...previous.items,...value.items]}:value);if(cursor&&!value.nextCursor)heading.current?.focus();}}
  catch(problem){if(!controller.signal.aborted){if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){setData(null);setDenied(true);}setError(problem instanceof Error?problem.message:'The queue is unavailable. Refresh to start a current read.');}}
  finally{if(!controller.signal.aborted)setLoading(false);}
 },[gateway,route]);
 useEffect(()=>{let active=true;queueMicrotask(()=>{if(active)void load();});return()=>{active=false;abort.current?.abort();};},[load]);
 useEffect(()=>{if(error)errors.current?.focus();},[error]);
 return <div className={styles.page}>
 <QueueHeading titleRef={heading} title="Review priority" description="Your next cases, with a clear action for each."><Button variant="secondary" disabled={loading||denied} onClick={()=>void load()}>Refresh queue</Button></QueueHeading>
 <div className={styles.tools}><div className="field"><label htmlFor="review-route">Next action</label><select id="review-route" value={route} disabled={loading||denied} onChange={e=>setRoute(e.target.value)}>{['all','escalated_review','needs_clarification','awaiting_concern_check','ready_for_approval','preparation','unavailable'].map(value=><option key={value} value={value}>{reviewLabel(value)}</option>)}</select></div></div>
 <QueueGuide><p>Human-confirmed material concerns come first, followed by original waiting time and application ID within each group. This order directs staff attention; it is not a lending-risk score.</p><p>Filtering starts a new authorized snapshot. Final approval remains a separate human decision.</p></QueueGuide>
 {error&&<div ref={errors} tabIndex={-1}><Notice tone="warning" role="alert">{error}</Notice>{!denied&&<Button variant="secondary" disabled={loading} onClick={()=>void load()}>Retry queue</Button>}</div>}
 {loading&&!data&&<p role="status">Loading the authorized review queue…</p>}
 {data&&<section className={styles.panel} aria-label="Review queue results"><div className={styles.caption}><h2>{data.items.length} {data.nextCursor?'loaded ':''}{data.items.length===1?'application':'applications'}</h2><p>Updated {reviewTime(data.asOf)} · Manila</p></div>
 <div className={styles.scroll} role="region" aria-label="Application review priority" tabIndex={0}><table role="table" className={styles.table}><caption className="sr-only">Priority applies across your authorized cohort before paging.</caption><thead><tr><th scope="col">Member / application</th><th scope="col">Next action</th><th scope="col">Received</th><th scope="col"><span className="sr-only">Open case</span></th></tr></thead>
 <tbody>{data.items.map((row,index)=><tr key={row.applicationId}>
 <th scope="row"><div className={styles.member}><span className={styles.position}>#{index+1}</span><strong>{row.memberName}</strong></div><p className={styles.secondary}>Application · {queueReference(row.applicationId,data.items.map(item=>item.applicationId))}</p></th>
 <td data-label="Next action"><QueueStatus tone={row.attentionGroup==='substantiated_material'?'urgent':row.readiness.ready?'ready':row.readiness.route==='unavailable'?'neutral':'attention'}>{reviewLabel(row.readiness.route)}</QueueStatus><p className={styles.next}>{row.readiness.nextAction}</p>
 <details className={styles.details}><summary>{row.readiness.blockers.length?`${row.readiness.blockers.length} ${row.readiness.blockers.length===1?'check':'checks'} to complete`:'Review details'}</summary>
 <p>{row.positionReason}</p><p>Preparing officer: {row.assignedOfficerId===session?.user.id?'Assigned to you':row.assignedOfficerId?'Assigned officer':'Not assigned'}</p>
 <ul>{row.readiness.blockers.map((blocker,i)=><li key={`${blocker.code}:${i}`}>{blocker.message}</li>)}</ul>
 <dl><dt>Application ID</dt><dd>{row.applicationId}</dd>{row.assignedOfficerId&&<><dt>Preparing officer ID</dt><dd>{row.assignedOfficerId}</dd></>}<dt>Received basis</dt><dd>{row.queueEntryBasis==='first_submission'?'First submission':'Recorded received date'}</dd><dt>Received at (Manila)</dt><dd>{reviewTime(row.queueEnteredAt)}</dd></dl></details></td>
 <td data-label="Received"><QueueDate value={row.queueEnteredAt}/></td><td><QueueLink to={`/staff/applications/${row.applicationId}/review`}>Open review</QueueLink></td>
 </tr>)}</tbody></table></div>
 {!data.items.length&&<p className={styles.empty}>No authorized active applications match this next-action filter.</p>}
 <div className={styles.footer}>{data.nextCursor?<Button variant="secondary" disabled={loading} onClick={()=>void load(data.nextCursor!)}>{loading?'Loading older entries…':'Load more applications'}</Button>:<p>All entries in this snapshot are loaded.</p>}</div></section>}
 </div>;
}
