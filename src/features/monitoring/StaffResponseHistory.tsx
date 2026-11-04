import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import type {SupportHistorySchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {Button,Notice} from '../../shared/ui';
import styles from './support.module.css';

type History=z.output<typeof SupportHistorySchema>;
/** The parent keys this private view by request/version and session scope. */
export function StaffResponseHistory({detail,blocked,onAccessDenied}:{detail:History;blocked:boolean;onAccessDenied:(error:unknown)=>void}){
 const {client}=useStaff();
 const [actions,setActions]=useState(detail.actions),[cursor,setCursor]=useState(detail.actionsNextCursor);
 const [loading,setLoading]=useState(false),[error,setError]=useState(''),[announcement,setAnnouncement]=useState('');
 const request=useRef<AbortController|null>(null),busy=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>()=>request.current?.abort(),[]);
 async function more(){
  if(!cursor||busy.current||blocked)return;
  busy.current=true;setLoading(true);setError('');
  const controller=new AbortController();request.current=controller;
  try{
   const page=await client.listSupportActions(detail.id,{cursor,limit:25,signal:controller.signal});
   if(controller.signal.aborted)return;
   setActions(previous=>{const known=new Set(previous.map(item=>item.id));return [...previous,...page.items.filter(item=>!known.has(item.id))];});
   setCursor(page.nextCursor);setAnnouncement(`${page.items.length} older responses loaded.`);
   if(page.nextCursor===null)window.setTimeout(()=>{if(!controller.signal.aborted)heading.current?.focus();},0);
  }catch(problem){
   if(controller.signal.aborted)return;
   if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onAccessDenied(problem);return;}
   setError('Older responses could not be loaded. Your draft is preserved. Try again.');
  }finally{if(!controller.signal.aborted){busy.current=false;setLoading(false);}}
 }
 return <section className="stack" aria-labelledby="staff-response-history">
  <h3 id="staff-response-history" ref={heading} tabIndex={-1}>Response history</h3>
  {!actions.length?<p>No staff responses recorded.</p>:actions.map(action=><article className={styles.action} key={action.id}>
   <p className={styles.message}>{action.response}</p><p className={styles.message}>Internal action: {action.internalNote}</p>
   <p>Follow-up: {action.followUpDate??'Not scheduled'}</p><p className="small subtle">{action.recordedAt} · {action.recordedBy} · Version {action.version}</p>
  </article>)}
  <p role="status" aria-live="polite">{loading?'Loading older responses…':`${announcement}${announcement?' ':''}Showing ${actions.length} response${actions.length===1?'':'s'}.`}</p>
  {error&&<Notice role="alert" tone="warning">{error}</Notice>}
  {cursor?<div className="actions"><Button variant="secondary" disabled={loading||blocked} onClick={()=>void more()}>{loading?'Loading older responses…':error?'Retry older responses':'Load older responses'}</Button></div>:actions.length>0&&<p>All responses loaded.</p>}
 </section>;
}
