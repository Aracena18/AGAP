import {useEffect,useRef,useState} from 'react';
import type {z} from 'zod';
import type {SupportPositionViewSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {Button,Money,Notice} from '../../shared/ui';
import {useStaff} from '../access/StaffContext';
import styles from './support.module.css';

export function CurrentSupportPosition({requestId,blocked,onAccessDenied}:{requestId:string;blocked:boolean;onAccessDenied:(error:unknown)=>void}){
 const {client}=useStaff(),[attempt,setAttempt]=useState(0),[view,setView]=useState<z.output<typeof SupportPositionViewSchema>|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),busy=useRef(false);
 useEffect(()=>{
  const controller=new AbortController();busy.current=true;
  client.getSupportPosition(requestId,{signal:controller.signal}).then(value=>{if(!controller.signal.aborted)setView(value);}).catch(problem=>{if(controller.signal.aborted)return;if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onAccessDenied(problem);return;}setError('The current position could not be refreshed. Try again.');}).finally(()=>{if(!controller.signal.aborted){busy.current=false;setLoading(false);}});
  return()=>controller.abort();
 },[client,requestId,attempt,onAccessDenied]);
 function refresh(){if(blocked||busy.current)return;busy.current=true;setView(null);setError('');setLoading(true);setAttempt(value=>value+1);}
 return <section className="stack" aria-labelledby="current-support-position"><h3 id="current-support-position">Current posted loan position</h3><p className="small subtle">Read from posted records. The submission-time position remains preserved above. Pending movements do not reduce debt.</p>
 {loading&&<p role="status">Loading current position…</p>}{error&&<Notice tone="warning" role="alert">{error}</Notice>}
 {view?.state==='unavailable'&&<Notice tone="warning">{view.message}</Notice>}
 {view?.state==='available'&&<dl className={styles.metadata}><dt>As of</dt><dd>{view.data.asOfDate}</dd><dt>Posted through</dt><dd>{view.data.postedThrough}</dd><dt>Principal</dt><dd><Money value={view.data.principalCentavos}/></dd><dt>Interest due</dt><dd><Money value={view.data.interestDueCentavos}/></dd><dt>Fees due</dt><dd><Money value={view.data.feesDueCentavos}/></dd><dt>Overdue</dt><dd><Money value={view.data.overdueCentavos}/></dd><dt>Pending movements</dt><dd>{view.data.pendingMovementCount}</dd></dl>}
 <div className="actions"><Button variant="secondary" disabled={blocked||loading} onClick={refresh}>{error?'Retry current position':'Refresh current position'}</Button></div></section>;
}
