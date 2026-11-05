import {useCallback,useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import type {SupportFreshPositionViewSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {Button,Money,Notice} from '../../shared/ui';
import styles from './support.module.css';
type Position=z.output<typeof SupportFreshPositionViewSchema>;
/** This is a separate read, never a replacement for the submission-time snapshot. */
export function SupportFreshPosition({requestId,blocked,onAccessDenied}:{requestId:string;blocked:boolean;onAccessDenied:(error:unknown)=>void}){
 const {client}=useStaff();const [value,setValue]=useState<Position|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false);
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 const load=useCallback(async()=>{
  if(active.current)return;
  const controller=new AbortController();active.current=controller;setLoading(true);setError('');
  try{const result=await client.getSupportLoanPosition(requestId,{signal:controller.signal});if(!controller.signal.aborted)setValue(result);}
  catch(problem){if(!controller.signal.aborted){
   // A denial disposes the entire private workspace through its parent.
   if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){setValue(null);onAccessDenied(problem);}
   else setError('The fresh position could not be loaded. Any previous fresh view below may be stale. Your response draft and captured snapshot are preserved.');
  }}finally{if(!controller.signal.aborted){active.current=null;setLoading(false);}}
 },[client,requestId,onAccessDenied]);
 return <section className="stack" aria-label="Fresh posted loan position"><h3>Fresh posted loan position</h3>
 <p className="subtle">Load the linked loan’s posted position for today. This does not change the captured snapshot, reported concern, eligibility or loan terms. Pending movements do not reduce debt.</p>
 <div className="actions"><Button variant="secondary" disabled={blocked||loading} onClick={()=>void load()}>{loading?'Loading fresh position…':error?'Retry fresh position':value?'Refresh fresh position':'Load fresh position'}</Button></div>
 {error&&<Notice role="alert" tone="warning">{error}</Notice>}
 {value?.state==='unavailable'&&<Notice>{value.message}</Notice>}
 {value?.state==='available'&&<dl className={styles.metadata}><dt>Fresh as of</dt><dd>{value.data.asOfDate}</dd><dt>Fresh posted through</dt><dd>{value.data.postedThrough}</dd><dt>Fresh principal</dt><dd><Money value={value.data.principalCentavos}/></dd><dt>Fresh interest due</dt><dd><Money value={value.data.interestDueCentavos}/></dd><dt>Fresh fees due</dt><dd><Money value={value.data.feesDueCentavos}/></dd><dt>Fresh overdue</dt><dd><Money value={value.data.overdueCentavos}/></dd><dt>Fresh pending movements</dt><dd>{value.data.pendingMovementCount}</dd></dl>}
 </section>;
}
