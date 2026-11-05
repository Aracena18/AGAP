import { useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import type { PriorityReviewReceipt } from '../../../packages/contracts/src/priority-review';
import { Button, Notice } from '../../shared/ui';
import { useStaff } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { useResource } from '../member-portal/useResource';
import { reviewTime } from './PriorityQueuePage';
import type { PriorityReviewGateway } from './gateway';
import styles from './reviews.module.css';
export function ReviewNotices({gateway}:{gateway?:PriorityReviewGateway}){
 const {session}=useStaff();if(!session||!gateway)return null;return <Notices key={[session.user.id,session.user.organizationId,session.user.roles,session.user.branchIds,session.csrfToken].join(':')} gateway={gateway}/>;
}
function Notices({gateway}:{gateway:PriorityReviewGateway}){
 const {session}=useStaff(),load=useCallback((signal:AbortSignal)=>gateway.getPriorityReviewNotices({signal}),[gateway]),read=useResource(load),command=useCommand<{id:string;version:number},z.output<typeof PriorityReviewReceipt>>(),error=useRef<HTMLDivElement>(null);
 useUnsavedChanges(command.saving||command.uncertain,command.uncertain);
 useEffect(()=>{if(command.error)error.current?.focus();},[command.error]);
 async function acknowledge(id:string,version:number){const result=await command.submit({id,version},(body,key)=>gateway.acknowledgePriorityReviewNotice(body.id,{acknowledgment:true},{version:body.version,idempotencyKey:key,csrfToken:session!.csrfToken}));if(result)read.refresh();}
 return <section className="panel panel-body stack"><div className={styles.heading}><h2>Review notices</h2><Button variant="quiet" disabled={read.loading||command.saving||command.uncertain} onClick={read.refresh}>Refresh notices</Button></div><p>Notices identify your current assigned escalation. Acknowledgment leaves the concern and loan terms unchanged.</p>{command.error&&<div ref={error} tabIndex={-1}><Notice tone="warning" role="alert">{command.error}</Notice></div>}{read.loading&&<p role="status">Loading notices…</p>}{read.error&&<Notice tone="warning">{read.error}</Notice>}{read.data&&!read.data.items.length&&<p>No current escalation notices are assigned to you.</p>}{read.data?.items.map(n=><article key={n.id} className={styles.item}><Link to={n.destination}>Open assigned review</Link><p className="small subtle">Assigned {reviewTime(n.createdAt)} · {n.acknowledgedAt?'Acknowledged':'Not yet acknowledged'}</p>{!n.acknowledgedAt&&<Button variant="secondary" disabled={command.saving} onClick={()=>void acknowledge(n.id,n.version)}>{command.uncertain?'Retry same acknowledgment':'Acknowledge notice'}</Button>}</article>)}</section>;
}
