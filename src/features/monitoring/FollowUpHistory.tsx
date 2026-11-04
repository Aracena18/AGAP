import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import type {SupportFollowUpDetailSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {Button,Notice} from '../../shared/ui';
import styles from './support.module.css';

export function FollowUpHistory({detail,blocked,onAccessDenied}:{detail:z.output<typeof SupportFollowUpDetailSchema>;blocked:boolean;onAccessDenied:()=>void}){
 const {client}=useStaff(),[events,setEvents]=useState(detail.events),[cursor,setCursor]=useState(detail.eventsNextCursor),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null),busy=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function more(){
  if(!cursor||blocked||busy.current)return;busy.current=true;setLoading(true);setError('');const controller=new AbortController();request.current=controller;
  try{const page=await client.listSupportFollowUpEvents(detail.task.id,{cursor,signal:controller.signal});if(controller.signal.aborted)return;
   setEvents(previous=>[...previous,...page.items.filter(item=>!previous.some(old=>old.id===item.id))]);setCursor(page.nextCursor);
   if(!page.nextCursor)window.setTimeout(()=>{if(!controller.signal.aborted)heading.current?.focus();},0);
  }catch(problem){if(controller.signal.aborted)return;if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onAccessDenied();return;}setError('History could not be loaded. Your draft is preserved.');}
  finally{if(!controller.signal.aborted){busy.current=false;setLoading(false);}}
 }
 return <section className="stack" aria-labelledby="follow-up-history"><h3 id="follow-up-history" tabIndex={-1} ref={heading}>Follow-up history</h3>
 {events.map(item=><article key={item.id} className={styles.action}><p>{item.kind==='scheduled'?'Scheduled':item.kind==='rescheduled'?'Rescheduled':'Completed'} · Follow-up date: {item.dueDate}</p>{item.note&&<p className={styles.message}>{item.note}</p>}<p className="small subtle">{item.recordedAt} · {item.recordedBy} · Version {item.version}</p></article>)}
 <p role="status">{loading?'Loading follow-up history…':`Showing ${events.length} history record${events.length===1?'':'s'}.`}</p>
 {error&&<Notice role="alert" tone="warning">{error}</Notice>}{cursor?<div className="actions"><Button variant="secondary" disabled={blocked||loading} onClick={()=>void more()}>{loading?'Loading history…':error?'Retry follow-up history':'Load older follow-up history'}</Button></div>:<p>All follow-up history loaded.</p>}
 </section>;
}
