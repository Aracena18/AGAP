import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import type {z} from 'zod';
import {CheckInSummaryQuerySchema,CheckInSummarySchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {Button,Notice} from '../../shared/ui';
import {useStaff} from '../access/StaffContext';
import styles from '../accounting/reconciliation.module.css';

type Summary=z.output<typeof CheckInSummarySchema>;
export default function CheckInSummaryPage(){
 const {session}=useStaff();const [denied,setDenied]=useState(false);const deny=useCallback(()=>setDenied(true),[]);
 if(denied||!session?.user.roles.includes('officer'))return <Notice tone="warning">Check-in summaries require current assigned-officer access. Reload after access is reviewed.</Notice>;
 return <SummaryWorkspace key={`${session.user.id}:${session.expiresAt}`} onDenied={deny}/>;
}
function SummaryWorkspace({onDenied}:{onDenied:()=>void}){
 const {client}=useStaff(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
 const [fromDate,setFrom]=useState(today.slice(0,7)+'-01'),[throughDate,setThrough]=useState(today),[result,setResult]=useState<Summary|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const pending=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null),errors=useRef<HTMLDivElement>(null);
 useEffect(()=>()=>pending.current?.abort(),[]);
 useEffect(()=>{if(error)errors.current?.focus();},[error]);
 async function submit(event:FormEvent){event.preventDefault();const dates=CheckInSummaryQuerySchema.safeParse({fromDate,throughDate});if(!dates.success){setError('Choose a valid date range of up to 366 inclusive days.');return;}
  pending.current?.abort();const request=new AbortController();pending.current=request;setResult(null);setLoading(true);setError('');
  try{const data=await client.getCheckInSummary(dates.data,{signal:request.signal});if(!request.signal.aborted){setResult(data);window.setTimeout(()=>{if(!request.signal.aborted)heading.current?.focus();},0);}}
  catch(problem){if(!request.signal.aborted){if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status))onDenied();else setError('The summary could not be loaded. Try again.');}}
  finally{if(!request.signal.aborted)setLoading(false);}
 }
 return <div className={`stack ${styles.page}`}><header><h1>Check-in summary</h1><p>Answers from support submissions currently assigned to you.</p></header><Notice>These are counts of submissions, including corrections and repeat check-ins. They do not measure unique members, change over time, financial health or lending risk.</Notice>
 <div ref={errors} tabIndex={-1}>{error&&<Notice tone="warning" role="alert">{error}</Notice>}</div>
 <form className={`panel stack ${styles.form}`} onSubmit={event=>void submit(event)}><h2>Submission dates</h2><div className={styles.fields}><div className="field"><label htmlFor="summary-from">From date</label><input id="summary-from" type="date" required value={fromDate} onChange={e=>setFrom(e.target.value)}/></div><div className="field"><label htmlFor="summary-through">Through date</label><input id="summary-through" type="date" required value={throughDate} onChange={e=>setThrough(e.target.value)}/></div></div><p className="small subtle">Manila calendar dates. Up to 366 inclusive days and 1,000 submissions.</p><div className="actions"><Button type="submit" disabled={loading}>{loading?'Loading summary…':'Load summary'}</Button></div></form>
 {result&&<section className="panel panel-body stack" aria-label="Check-in counts"><h2 ref={heading} tabIndex={-1}>Recorded answers</h2><p>{result.fromDate} to {result.throughDate} · Read at {result.cutoffAt}</p><Notice tone={result.state==='unavailable'?'warning':'neutral'}>{result.message}</Notice>{result.answers&&<><p>{result.submissionCount} submissions in your current assignments.</p><div className="table-scroll" role="region" aria-label="Check-in answers table" tabIndex={0}><table><caption>Every declined or unavailable answer stays separate</caption><thead><tr><th scope="col">Question</th><th scope="col">Answer</th><th scope="col">Count</th></tr></thead><tbody>{(Object.entries(result.answers) as [keyof NonNullable<Summary['answers']>,Record<string,number>][]).flatMap(([field,counts])=>Object.entries(counts).map(([answer,count])=><tr key={`${field}-${answer}`}><th scope="row">{{canMeetEssentials:'Can meet essentials',borrowedToRepay:'Borrowed to repay',financialStrain:'Financial strain'}[field]}</th><td>{{yes:'Yes',no:'No',reported:'Reported',not_reported:'Not reported',declined:'Declined',unavailable:'Unavailable'}[answer]??answer}</td><td>{count}</td></tr>))}</tbody></table></div></>}</section>}
 </div>;
}
