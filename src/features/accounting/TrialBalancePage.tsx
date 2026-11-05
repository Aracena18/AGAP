import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import type {z} from 'zod';
import {TrialBalanceCreateSchema,TrialBalanceRunSchema} from '../../../packages/contracts/src/schemas';
import {ApiClientError,type RequestOptions} from '../../../packages/api-client/src/transport';
import {Badge,Button,Money,Notice} from '../../shared/ui';
import {useStaff} from '../access/StaffContext';
import {useCommand} from '../access/useCommand';
import {usePage} from '../access/usePage';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import styles from './reconciliation.module.css';

type Run=z.output<typeof TrialBalanceRunSchema>;type Input=z.input<typeof TrialBalanceCreateSchema>;
export default function TrialBalancePage(){
 const {session}=useStaff(),[denied,setDenied]=useState(false);const deny=useCallback(()=>setDenied(true),[]);
 if(denied||!session?.user.roles.includes('auditor'))return <Notice tone="warning">Accounting reports require complete organization auditor access. Reload after access is reviewed.</Notice>;
 return <Reports key={`${session.user.id}:${session.expiresAt}`} onDenied={deny}/>;
}
function Reports({onDenied}:{onDenied:()=>void}){
 const {client,session}=useStaff(),today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date());
 const [fromDate,setFrom]=useState(today.slice(0,7)+'-01'),[throughDate,setThrough]=useState(today),[dirty,setDirty]=useState(false),[selected,setSelected]=useState<Run|null>(null),[reading,setReading]=useState(false),[error,setError]=useState('');
 const pending=useRef<AbortController|null>(null),resultHeading=useRef<HTMLHeadingElement>(null),errorSummary=useRef<HTMLDivElement>(null),command=useCommand<Input,Run>();
 const fail=useCallback((problem:unknown)=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status)){onDenied();return;}setError(problem instanceof Error?problem.message:'Report history is unavailable.');},[onDenied]);
 const loader=useCallback((options:RequestOptions)=>client.listTrialBalances(options).catch(problem=>{if(!options.signal?.aborted)fail(problem);throw problem;}),[client,fail]),history=usePage(loader);
 const blocked=command.saving||command.uncertain;
 useUnsavedChanges(dirty||blocked,command.uncertain);
 useEffect(()=>()=>pending.current?.abort(),[]);
 useEffect(()=>{if(error||command.error)errorSummary.current?.focus();},[error,command.error]);
 async function submit(event:FormEvent){event.preventDefault();setError('');const parsed=TrialBalanceCreateSchema.safeParse({fromDate,throughDate});if(!parsed.success){setError(parsed.error.issues[0].message);return;}
  const saved=await command.submit(parsed.data,(body,key)=>client.createTrialBalance(body,{csrfToken:session!.csrfToken,idempotencyKey:key}).catch(problem=>{if(problem instanceof ApiClientError&&[401,403,404].includes(problem.status))onDenied();throw problem;}));
  if(saved){pending.current?.abort();setSelected(saved);setReading(false);setDirty(false);history.refresh();window.setTimeout(()=>resultHeading.current?.focus(),0);}
 }
 async function open(id:string){if(blocked)return;pending.current?.abort();const controller=new AbortController();pending.current=controller;setSelected(null);setReading(true);setError('');try{const run=await client.getTrialBalance(id,{signal:controller.signal});if(!controller.signal.aborted){setSelected(run);window.setTimeout(()=>{if(!controller.signal.aborted)resultHeading.current?.focus();},0);}}catch(problem){if(!controller.signal.aborted)fail(problem);}finally{if(!controller.signal.aborted)setReading(false);}}
 return <div className={`stack ${styles.page}`}><header><h1>Trial balance</h1><p>Opening balances, posted movements and closing balances by account.</p></header>
 <Notice>This report describes posted ledger records. Debit/credit agreement does not establish complete bank reconciliation or approved opening balances.</Notice>
 <div ref={errorSummary} tabIndex={-1}>{(error||command.error)&&<Notice role="alert" tone="warning">{error||command.error}</Notice>}</div>
 <form className={`panel stack ${styles.form}`} onSubmit={event=>void submit(event)}><h2>Create a dated report</h2><fieldset disabled={blocked} className={styles.fields}><legend className="sr-only">Report dates</legend>
 <div className="field"><label htmlFor="trial-from">From date</label><input id="trial-from" type="date" required value={fromDate} onChange={e=>{setFrom(e.target.value);setDirty(true);}}/></div><div className="field"><label htmlFor="trial-through">Through date</label><input id="trial-through" type="date" required value={throughDate} onChange={e=>{setThrough(e.target.value);setDirty(true);}}/></div></fieldset><p className="small subtle">Up to 366 inclusive days. Earlier posted entries contribute to opening balances.</p><div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Creating report…':command.uncertain?'Retry same report':'Create trial balance'}</Button></div></form>
 <section className="panel panel-body stack" aria-label="Saved trial balances"><h2>Saved reports</h2>{history.error&&<Notice tone="warning">{history.error}</Notice>}{history.loading&&<p role="status">Loading report history…</p>}{!history.loading&&!history.error&&!history.items.length&&<p>No saved trial balances.</p>}<div className="actions"><Button variant="secondary" disabled={blocked||history.loading} onClick={()=>history.refresh()}>Refresh report history</Button></div>
 {history.items.map(item=><div key={item.id} className="actions"><span>{item.fromDate} to {item.throughDate} · {item.status}</span><Button variant="quiet" disabled={blocked} onClick={()=>void open(item.id)} aria-label={`Open saved report ${item.id}`}>Open saved report</Button></div>)}{history.hasMore&&<Button variant="secondary" disabled={blocked||history.loading} onClick={()=>void history.more()}>Load older reports</Button>}</section>
 {reading&&<p role="status">Opening saved report…</p>}{selected&&<section className="panel panel-body stack" aria-label="Trial balance result"><h2 ref={resultHeading} tabIndex={-1}>Saved trial balance</h2><Badge tone={selected.status==='unavailable'?'warning':selected.balanced?'success':'danger'}>{selected.status==='unavailable'?'Unavailable':selected.status==='empty'?'Empty':selected.balanced?'Debits equal credits':'Ledger imbalance'}</Badge>
 <dl className={styles.metadata}><dt>Report dates</dt><dd>{selected.fromDate} to {selected.throughDate}</dd><dt>Ledger cutoff</dt><dd>{selected.cutoffAt}</dd><dt>Source journals / lines</dt><dd>{selected.sourceJournalCount} / {selected.sourceLineCount}</dd><dt>Latest included posting</dt><dd>{selected.postedThrough??'No included postings'}</dd></dl>
 {selected.issues.map(issue=><Notice key={issue} tone="warning">{issue}</Notice>)}{selected.status==='empty'&&<p>No accounts were recorded in the authorized ledger snapshot.</p>}
 {selected.accounts.length>0&&<div className="table-scroll" role="region" aria-label="Account balances table" tabIndex={0}><table><caption>PHP balances from the saved ledger snapshot; inactive accounts with history are retained</caption><thead><tr><th scope="col">Account</th><th scope="col">Opening debit</th><th scope="col">Opening credit</th><th scope="col">Period debit</th><th scope="col">Period credit</th><th scope="col">Closing debit</th><th scope="col">Closing credit</th></tr></thead><tbody>{selected.accounts.map(row=><tr key={row.accountId}><th scope="row">{row.code} · {row.label}{!row.active?' · Inactive':''}</th>{(['openingDebitCentavos','openingCreditCentavos','debitCentavos','creditCentavos','closingDebitCentavos','closingCreditCentavos'] as const).map(key=><td key={key}><Money value={row[key]}/></td>)}</tr>)}</tbody>{selected.totals&&<tfoot><tr><th scope="row">Totals</th>{(['openingDebitCentavos','openingCreditCentavos','debitCentavos','creditCentavos','closingDebitCentavos','closingCreditCentavos'] as const).map(key=><td key={key}><Money value={selected.totals![key]}/></td>)}</tr></tfoot>}</table></div>}</section>}
 </div>;
}
