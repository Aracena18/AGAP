import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import type { z } from 'zod';
import { ReconciliationCreateSchema,ReconciliationRunSchema } from '../../../packages/contracts/src/schemas';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { Badge,Button,Money,Notice } from '../../shared/ui';
import { useStaff } from '../access/StaffContext';
import { usePage } from '../access/usePage';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import styles from './reconciliation.module.css';

type Run=z.output<typeof ReconciliationRunSchema>;
type Request=z.input<typeof ReconciliationCreateSchema>;
const label=(value:string)=>value.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
const tone=(status:string)=>status==='matched'?'success':status==='discrepancy'?'danger':status==='pending'||status==='unavailable'?'warning':'neutral';
const at=(value:string)=>new Date(value).toLocaleString('en-PH',{timeZone:'Asia/Manila'});
export default function ReconciliationPage(){
  const {session,client}=useStaff(), allowed=Boolean(session?.user.roles.includes('auditor'));
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
  const [fromDate,setFrom]=useState(`${today.slice(0,7)}-01`),[throughDate,setThrough]=useState(today),[dirty,setDirty]=useState(false);
  const [selected,setSelected]=useState<Run|null>(null),[filter,setFilter]=useState('all'),[readError,setReadError]=useState(''),[formError,setFormError]=useState(''),[reading,setReading]=useState(false),[accessDenied,setAccessDenied]=useState(false);
  const abort=useRef<AbortController|null>(null),errorSummary=useRef<HTMLDivElement>(null),resultHeading=useRef<HTMLHeadingElement>(null);
  const command=useCommand<Request,Run>();
  useUnsavedChanges(dirty||command.saving||command.uncertain,command.uncertain);
  useEffect(()=>()=>abort.current?.abort(),[]);
  const loader=useCallback(async(options:RequestOptions)=>{
    if(!allowed)return {items:[],nextCursor:null};
    setReadError('');return client.listReconciliations(options).catch((error:unknown)=>{if(options.signal?.aborted)throw error;if(error instanceof ApiClientError&&error.status===403){setSelected(null);setAccessDenied(true);}setReadError(error instanceof Error?error.message:'Report history is unavailable.');throw error;});
  },[allowed,client]);
  const page=usePage(loader);
  useEffect(()=>{if(command.error||formError)errorSummary.current?.focus();},[command.error,formError]);
  const blocked=command.saving||command.uncertain;
  async function submit(event:FormEvent){
    event.preventDefault();setFormError('');
    const request=ReconciliationCreateSchema.safeParse({fromDate,throughDate});
    if(!request.success){setFormError(request.error.issues[0].message);window.setTimeout(()=>errorSummary.current?.focus(),0);return;}
    const run=await command.submit(request.data,(body,key)=>client.createReconciliation(body,{csrfToken:session!.csrfToken,idempotencyKey:key}).catch((error:unknown)=>{if(error instanceof ApiClientError&&error.status===403){setSelected(null);setAccessDenied(true);}throw error;}));
    if(run){abort.current?.abort();setReading(false);setSelected(run);setFilter('all');setDirty(false);page.refresh();window.setTimeout(()=>resultHeading.current?.focus(),0);}
  }
  async function open(id:string){
    abort.current?.abort();const request=new AbortController();abort.current=request;setReading(true);setReadError('');
    try{const run=await client.getReconciliation(id,{signal:request.signal});if(!request.signal.aborted){setSelected(run);setFilter('all');window.setTimeout(()=>resultHeading.current?.focus(),0);}}
    catch(error){if(!request.signal.aborted){if(error instanceof ApiClientError&&error.status===403){setSelected(null);setAccessDenied(true);}setReadError(error instanceof Error?error.message:'The report is unavailable.');}}
    finally{if(!request.signal.aborted)setReading(false);}
  }
  if(!allowed||accessDenied)return <Notice tone="warning">Reconciliation requires an auditor with access to every organization branch.</Notice>;
  const events=selected?.report.events.filter(row=>filter==='all'||row.status===filter)??[];
  return <div className={styles.page}>
    <header><h1>Reconciliation</h1><p className="subtle">Compare principal movements, loan allocations, repayment receipts and ledger entries for one dated snapshot.</p></header>
    <Notice>Principal-only reporting uses reviewed mappings and complete organization-wide evidence. Each saved result preserves its original findings. A new run checks a new snapshot.</Notice>
    <section className="panel" aria-labelledby="run-heading"><div className={`panel-header ${styles.introHeader}`}><h2 id="run-heading">Run a principal check</h2><p className="subtle">Choose up to 31 calendar days. All dates and recording cutoffs remain visible in the result.</p></div>
      <form className={styles.form} onSubmit={event=>void submit(event)}>
        {(formError||command.error)&&<div ref={errorSummary} tabIndex={-1}><Notice tone="danger" role="alert">{formError||command.error}</Notice></div>}
        <fieldset disabled={blocked} className={styles.fields}><legend className="sr-only">Report dates</legend>
          <div className="field"><label htmlFor="reconciliation-from">From date</label><input id="reconciliation-from" type="date" required value={fromDate} onChange={event=>{setFrom(event.target.value);setDirty(true);}}/></div>
          <div className="field"><label htmlFor="reconciliation-through">Through date</label><input id="reconciliation-through" type="date" required value={throughDate} onChange={event=>{setThrough(event.target.value);setDirty(true);}}/></div>
        </fieldset>
        <div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Recording report…':command.uncertain?'Retry same report':'Run reconciliation'}</Button>
          {!blocked&&dirty&&<Button variant="secondary" onClick={()=>{setFrom(`${today.slice(0,7)}-01`);setThrough(today);setDirty(false);setFormError('');command.reset();}}>Reset dates</Button>}</div>
      </form>
    </section>
    {readError&&<Notice tone="warning" role="alert">{readError}</Notice>}
    <section className="panel" aria-labelledby="history-heading"><div className={`panel-header ${styles.heading}`}><h2 id="history-heading">Saved reports</h2><Button variant="quiet" disabled={page.loading} onClick={page.refresh}>Refresh history</Button></div>
      <div className="table-scroll" role="region" aria-label="Saved reconciliation reports" tabIndex={0}><table className={styles.history}><caption className="sr-only">Saved principal reports, newest first. Times use Asia/Manila.</caption><thead><tr><th scope="col">Recorded</th><th scope="col">Effective dates</th><th scope="col">Result</th><th scope="col">Report</th></tr></thead><tbody>
        {page.items.map(row=><tr key={row.id}><th scope="row">{at(row.createdAt)}</th><td>{row.fromDate} – {row.throughDate}</td><td><Badge tone={tone(row.status)}>{label(row.status)}</Badge></td><td><Button variant="quiet" disabled={blocked||dirty||reading} onClick={()=>void open(row.id)} aria-label={`Open report ${row.id}`}>Open report</Button></td></tr>)}
      </tbody></table></div>
      {page.loading?<p className="panel-body" role="status">Loading report history…</p>:!page.items.length&&!page.error?<p className="panel-body">No reconciliation reports have been recorded.</p>:null}
      {page.error&&<div className="panel-body"><Button variant="secondary" onClick={page.refresh}>Retry report history</Button></div>}
      {page.hasMore&&<div className="panel-body"><Button variant="secondary" disabled={page.loading} onClick={()=>void page.more()}>Load more reports</Button></div>}
    </section>
    {reading&&<p role="status">Opening saved report…</p>}
    {selected&&<section className="panel" aria-labelledby="result-heading"><div className={`panel-header ${styles.resultHeader}`}><h2 ref={resultHeading} id="result-heading" tabIndex={-1}>Saved reconciliation result</h2>
      <div className={styles.heading}><Badge tone={tone(selected.report.status)}>{label(selected.report.status)}</Badge><span>{selected.report.events.length} event records</span></div>
      <dl className={styles.metadata}><dt>Effective dates</dt><dd>{selected.report.scope.fromDate} – {selected.report.scope.throughDate}</dd><dt>Recording cutoff</dt><dd>{at(selected.report.scope.cutoffAt)} (Asia/Manila)</dd><dt>Report ID</dt><dd>{selected.id}</dd><dt>Snapshot</dt><dd>{selected.report.scope.snapshotId}</dd><dt>Evidence SHA-256</dt><dd>{selected.evidenceSha256}</dd></dl>
      <p className="subtle">These findings describe evidence visible in the captured database snapshot. They do not modify the underlying records.</p>
      {selected.report.sourceIssues.length>0&&<Notice tone="warning"><ul>{selected.report.sourceIssues.map(issue=><li key={issue}>{issue}</li>)}</ul></Notice>}
      {selected.report.status==='empty'&&<Notice>No posted or pending events were found in the complete inventories for this range. Opening balances and external bank reconciliation need their separate evidence.</Notice>}
      {selected.report.status==='unavailable'&&!selected.report.events.length&&<Notice tone="warning">Event-level conclusions are unavailable. Resolve the source coverage before interpreting the result.</Notice>}
    </div>
    {selected.report.events.length>0&&<><div className={styles.filter}><label htmlFor="event-status">Event status</label><select id="event-status" value={filter} onChange={event=>setFilter(event.target.value)}>{['all','matched','discrepancy','pending','unavailable'].map(status=><option key={status} value={status}>{label(status)}</option>)}</select><span role="status">Showing {events.length} of {selected.report.events.length} events</span></div>
      <div className="table-scroll" role="region" aria-label="Reconciliation event findings" tabIndex={0}><table className={styles.events}><caption className="sr-only">Principal event comparisons and recorded discrepancies</caption><thead><tr><th scope="col">Source event / loan</th><th scope="col">Amount</th><th scope="col">Status</th><th scope="col">Findings and references</th></tr></thead><tbody>{events.map(row=><tr key={row.sourceEventId}>
        <th scope="row"><span className={styles.id}>{row.sourceEventId}</span><span className={styles.id}>Loan: {row.loanId??'Unavailable'}</span></th><td>{row.amountCentavos===null?'Unavailable':<Money value={row.amountCentavos}/>}</td><td><Badge tone={tone(row.status)}>{label(row.status)}</Badge></td>
        <td>{row.findings.length?<ul>{row.findings.map((finding,index)=><li key={`${finding.code}-${index}`}>{label(finding.code)}{(finding.expectedCentavos!==null||finding.actualCentavos!==null)&&<span className={styles.amount}>Expected: {finding.expectedCentavos===null?'Unavailable':<Money value={finding.expectedCentavos}/>} · Recorded: {finding.actualCentavos===null?'Unavailable':<Money value={finding.actualCentavos}/>}</span>}</li>)}</ul>:<p>No discrepancies identified for this event.</p>}
        <details><summary>Record references</summary><p className={styles.id}>Journals: {row.journalIds.join(', ')||'Unavailable'}</p><p className={styles.id}>Allocations: {row.allocationIds.join(', ')||'Unavailable'}</p><p className={styles.id}>Repayment receipts: {row.receiptIds.join(', ')||'Not applicable or unavailable'}</p></details></td>
      </tr>)}</tbody></table></div>{!events.length&&<p className="panel-body">No events match this filter.</p>}</>}
    </section>}
  </div>;
}
