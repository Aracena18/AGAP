import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import type {MemberSupportPageViewSchema,MemberSupportSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {dateLabel} from '../../domain/format';
import {Button,Notice} from '../../shared/ui';
import {SupportCheckIn} from '../monitoring/SupportCheckIn';
import {useMember} from './MemberContext';
import styles from './MemberApp.module.css';

type View=z.output<typeof MemberSupportPageViewSchema>;type Item=z.output<typeof MemberSupportSchema>;
export function MemberSupportHistory({blocked,onAccessDenied}:{blocked:boolean;onAccessDenied:()=>void}){
 const [attempt,setAttempt]=useState(0);
 return <HistoryRead key={attempt} blocked={blocked} onAccessDenied={onAccessDenied} onRefresh={()=>setAttempt(value=>value+1)}/>;
}
function HistoryRead({blocked,onAccessDenied,onRefresh}:{blocked:boolean;onAccessDenied:()=>void;onRefresh:()=>void}){
 const {client}=useMember(),[view,setView]=useState<View|null>(null),[items,setItems]=useState<Item[]>([]),[cursor,setCursor]=useState<string|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const request=useRef<AbortController|null>(null),busy=useRef(false),heading=useRef<HTMLHeadingElement>(null);
 function accept(value:View){setView(value);if(value.state==='unavailable'){setItems([]);setCursor(null);}}
 useEffect(()=>{
  const controller=new AbortController();request.current=controller;busy.current=true;
  client.listMemberSupportHistory({signal:controller.signal}).then(value=>{if(controller.signal.aborted)return;setView(value);if(value.state==='available'){setItems(value.data.items);setCursor(value.data.nextCursor);}}).catch(problem=>{
   if(controller.signal.aborted)return;
   if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onAccessDenied();return;}
   setError('Your request history could not be loaded. Try again.');
  }).finally(()=>{if(!controller.signal.aborted){busy.current=false;setLoading(false);}});
  return()=>{controller.abort();request.current?.abort();};
 },[client,onAccessDenied]);
 async function more(){
  if(!cursor||blocked||busy.current)return;busy.current=true;setLoading(true);setError('');const controller=new AbortController();request.current=controller;
  try{const next=await client.listMemberSupportHistory({cursor,limit:25,signal:controller.signal});if(controller.signal.aborted)return;
   accept(next);if(next.state==='available'){setItems(previous=>[...previous,...next.data.items.filter(item=>!previous.some(old=>old.id===item.id))]);setCursor(next.data.nextCursor);if(next.data.nextCursor===null)window.setTimeout(()=>{if(!controller.signal.aborted)heading.current?.focus();},0);}
  }catch(problem){if(controller.signal.aborted)return;if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onAccessDenied();return;}setError('Older requests could not be loaded. Your draft is preserved. Try again or refresh your history.');}
  finally{if(!controller.signal.aborted){busy.current=false;setLoading(false);}}
 }
 return <section className="panel panel-body stack" aria-labelledby="member-support-history"><div className="actions"><h2 id="member-support-history" ref={heading} tabIndex={-1}>My requests</h2><Button variant="quiet" disabled={blocked||loading} onClick={onRefresh}>Refresh requests</Button></div>
 {error&&<Notice role="alert" tone="warning">{error}</Notice>}
 {!view&&!loading&&error&&<div className="actions"><Button variant="secondary" disabled={blocked} onClick={onRefresh}>Retry request history</Button></div>}
 {view?.state==='unavailable'?<Notice tone="warning">{view.message}</Notice>:<>
 {view?.state==='available'&&items.length===0&&!loading&&<p>No support requests are recorded.</p>}
 {items.map(item=><article className={`${styles.section} ${styles.supportRequest}`} key={item.id}><h3>{item.status==='submitted'?'Sent for review':item.status==='assigned'?'Assigned to staff':'Reviewed'}</h3><p>{item.message}</p>{item.checkIn&&<SupportCheckIn value={item.checkIn} onChange={()=>{}} preview/>}{item.loanId&&<p>Linked loan: {item.loanId}</p>}<p className="small subtle">Sent {dateLabel(item.submittedAt)}</p>{item.response&&<Notice>{item.response}</Notice>}</article>)}
 <p role="status" aria-live="polite">{loading?'Loading request history…':view?.state==='available'?`Showing ${items.length} request${items.length===1?'':'s'}.`:''}</p>
 {cursor?<div className="actions"><Button variant="secondary" disabled={blocked||loading} onClick={()=>void more()}>{loading?'Loading older requests…':error?'Retry older requests':'Load older requests'}</Button></div>:view?.state==='available'&&items.length>0&&<p>All requests loaded.</p>}
 </>}
 </section>;
}
