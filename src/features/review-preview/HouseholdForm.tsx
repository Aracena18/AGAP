import { useEffect,useId,useRef,useState,type FormEvent } from 'react';
import type { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { WorkflowFactInput } from '../../../packages/contracts/src/workflow';
import { isCalendarDate } from '../../domain/format';
import { parsePesoInput } from '../../domain/evidence';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Button,Notice } from '../../shared/ui';
import { defaultAssumptions,type View } from './analysis';
import styles from './preview.module.css';

const fields=[['opening','Opening spendable cash','opening'],['income','Take-home income','income'],['rent','Housing or rent','expense'],['essentials','Other essential expenses','expense'],['debt','Existing repayments','obligation']] as const;
type Values={start:string;end:string;payroll:boolean;rows:Record<string,{amount:string;dates:string}>};
export function HouseholdForm({view,client,csrf,member,saved,onBusy,disabled=false}:{view:View;client:AgapClient;csrf:string;member:boolean;saved:()=>void;onBusy?:(value:boolean)=>void;disabled?:boolean}){
 const uid=useId(),[opened,setOpened]=useState(view.facts.length===0),[basis]=useState(view.version),[dirty,setDirty]=useState(false),[confirmed,setConfirmed]=useState(false),[error,setError]=useState('');
 const [values,setValues]=useState<Values>(()=>({start:defaultAssumptions(view).start,end:defaultAssumptions(view).end,payroll:view.facts.some(f=>f.input.label==='Existing repayments'&&f.input.deduction==='yes'),rows:Object.fromEntries(fields.map(([key,label])=>{const fact=view.facts.find(f=>f.input.label===label)?.input;return [key,{amount:fact?.value.availability==='recorded'?String(fact.value.amountCentavos/100):'',dates:fact?.cashDates.join(', ')??''}];}))}));
 const command=useCommand<Values,boolean>(),errors=useRef<HTMLDivElement>(null);useEffect(()=>{if(error||command.error)errors.current?.focus();},[error,command.error]);useUnsavedChanges(dirty||command.uncertain,command.uncertain);useEffect(()=>{onBusy?.(command.saving||command.uncertain);return()=>onBusy?.(false);},[onBusy,command.saving,command.uncertain]);
 async function submit(event:FormEvent){
  event.preventDefault();setError('');
  if(!command.uncertain&&view.version!==basis){setError('Saved information changed. Your entries are preserved. Close and reopen this page to review the current information before saving.');return;}
  if(!confirmed&&!command.uncertain){setError('Confirm the amounts, dates and coverage before saving.');return;}
  try{
   if(!isCalendarDate(values.start)||!isCalendarDate(values.end)||values.start>values.end||Date.parse(values.end)-Date.parse(values.start)>365*86400000)throw new Error();
   for(const [key] of fields){parsePesoInput(values.rows[key].amount);const dates=key==='opening'?[values.start]:values.rows[key].dates.split(/[\s,]+/).filter(Boolean);if(!dates.length||dates.some(d=>!isCalendarDate(d)||d<values.start||d>values.end)||new Set(dates).size!==dates.length)throw new Error();}
  }catch{setError('Enter every amount (including a confirmed zero), a valid period, and distinct cash dates inside that period.');return;}
  // The retained sender owns progress, exact requests and keys across an uncertain batch.
  let next=0,expectedVersion=view.version;
  const steps=fields.map(([key,label,category])=>({key,label,category,idempotencyKey:crypto.randomUUID(),request:null as {body:ReturnType<typeof WorkflowFactInput.parse>;version:number}|null}));
  const result=await command.submit(values,async body=>{
   while(next<steps.length){
    const step=steps[next];
    if(!step.request){
     const current=await(member?client.getMemberWorkflow(view.applicationId):client.getStaffWorkflow(view.applicationId));
     if(current.version!==expectedVersion)throw new ApiClientError(412,'stale_household_batch','Saved information changed during this save. Earlier successful statements remain saved. Refresh and review the current household facts before continuing.');
     const matching=current.facts.filter(f=>f.input.label===step.label);
     if(matching.length>1)throw new ApiClientError(422,'ambiguous_household_fact','More than one saved fact has this label. Use the evidence editor to resolve it.');
     const amount=parsePesoInput(body.rows[step.key].amount),dates=step.key==='opening'?[body.start]:body.rows[step.key].dates.split(/[\s,]+/).filter(Boolean).sort();
     step.request={version:current.version,body:WorkflowFactInput.parse({factId:matching[0]?.id??null,relevance:'included',label:step.label,category:step.category,value:{availability:'recorded',amountCentavos:amount},sourceId:null,sourceVersion:null,statement:`Member-confirmed ${step.label}: PHP ${`${Math.trunc(amount/100)}.${String(amount%100).padStart(2,'0')}`} on each listed cash date: ${dates.join(', ')}. Coverage ${body.start} through ${body.end}. Existing repayments ${body.payroll?'are':'are not'} already included in take-home payroll deductions.`,effectiveDate:body.start,coverageStart:body.start,coverageEnd:body.end,cashDates:dates,period:step.key==='opening'?'one_time':'monthly',basis:step.key==='income'?'net':'not_applicable',deduction:step.key==='debt'&&body.payroll?'yes':'no',reason:'Member explicitly confirmed the amounts, exact dates and complete modeled-period coverage. No future dates were inferred.'})};
    }
    const options={version:step.request.version,idempotencyKey:step.idempotencyKey,csrfToken:csrf};
    const receipt=await(member?client.saveMemberFact(view.applicationId,step.request.body,options):client.saveStaffFact(view.applicationId,step.request.body,options));
    expectedVersion=receipt.version;
    next++;
   }
   return true;
  });
  if(result){setDirty(false);setOpened(false);saved();}
 }
 if(!opened)return <div className={styles.saved}><div><h2>Household information</h2><p>Saved statements and their exact cash dates form the calculation basis.</p></div><Button variant="secondary" disabled={disabled} onClick={()=>setOpened(true)}>Review household entries</Button></div>;
 return <form onSubmit={e=>void submit(e)} className="stack"><div><h2>Your household cash flow</h2><p>Use the amounts and dates you can confirm. Enter 0 only when you know there is no amount.</p></div>{(error||command.error)&&<div ref={errors} tabIndex={-1}><Notice tone="warning" role="alert">{error||command.error}</Notice></div>}<fieldset className="stack" disabled={disabled||command.saving||command.uncertain} onChange={e=>{setDirty(true);if(!e.target.hasAttribute('data-confirmation'))setConfirmed(false);}}><legend className="sr-only">Household information</legend><div className={styles.two}><div className="field"><label htmlFor={`${uid}-start`}>Review starts</label><input id={`${uid}-start`} type="date" required value={values.start} onChange={e=>setValues(v=>({...v,start:e.target.value}))}/></div><div className="field"><label htmlFor={`${uid}-end`}>Review ends</label><input id={`${uid}-end`} type="date" required value={values.end} onChange={e=>setValues(v=>({...v,end:e.target.value}))}/></div></div>
 {fields.map(([key,label])=><div className={styles.entry} key={key}><div className="field"><label htmlFor={`${uid}-${key}`}>{label} (PHP)</label><input id={`${uid}-${key}`} inputMode="decimal" required value={values.rows[key].amount} onChange={e=>setValues(v=>({...v,rows:{...v.rows,[key]:{...v.rows[key],amount:e.target.value}}}))}/></div>{key==='opening'?<p className="small subtle">Available at the start of the review. Exclude loan proceeds reserved for the purchase.</p>:<div className="field"><label htmlFor={`${uid}-${key}-date`}>{label} cash dates</label><input id={`${uid}-${key}-date`} required placeholder="YYYY-MM-DD, YYYY-MM-DD" value={values.rows[key].dates} onChange={e=>setValues(v=>({...v,rows:{...v.rows,[key]:{...v.rows[key],dates:e.target.value}}}))}/><p className="small subtle">The entered amount applies on each listed date.</p></div>}</div>)}
 <label className={styles.check}><input type="checkbox" checked={values.payroll} onChange={e=>setValues(v=>({...v,payroll:e.target.checked}))}/> Existing repayments are already deducted from take-home pay.</label><label className={styles.check}><input type="checkbox" data-confirmation required checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> I confirm these amounts, exact cash dates and coverage of the review period.</label></fieldset><div className="actions"><Button type="submit" disabled={disabled||command.saving}>{command.saving?'Saving confirmed information…':command.uncertain?'Retry original save':'Save household information'}</Button>{view.facts.length>0&&!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={()=>{setDirty(false);setOpened(false);}}>Close</Button>}</div><p className="small subtle">Each saved statement retains its own history. If interrupted, retry the original save to finish the remaining statements.</p></form>;
}
