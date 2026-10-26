import { staffLoginHref } from '../access/staffLogin';
import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import type { z } from 'zod';
import type { ApplicationSchema,ApplicationUpdateSchema } from '../../../packages/contracts/src/schemas';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { useStaff } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { usePage } from '../access/usePage';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { parsePesoInput } from '../../domain/evidence';
import { Info } from '../../shared/icons';
import panel from '../../shared/ui/action-panel.module.css';
import { Button,Notice } from '../../shared/ui';
import styles from '../members/intake.module.css';
type Application=z.output<typeof ApplicationSchema>;
interface Props{record:Application;mode:'edit'|'assign';saved:(record:Application)=>void;cancel:()=>void}
export default function ApplicationManagement(props:Props){
  return props.mode==='assign'?<AssignmentEditor {...props}/>:<RequestEditor {...props}/>;
}
function RequestEditor({record,saved,cancel}:Props){
  const {client,session}=useStaff(),command=useCommand<z.input<typeof ApplicationUpdateSchema>,Application>();
  const [purpose,setPurpose]=useState(record.purpose),[amount,setAmount]=useState(`${Math.trunc(record.requestedPrincipalCentavos/100)}.${String(record.requestedPrincipalCentavos%100).padStart(2,'0')}`),[term,setTerm]=useState(String(record.requestedTermMonths)),[dirty,setDirty]=useState(false),[error,setError]=useState('');
  const heading=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});},[]);
  useEffect(()=>{if(error||command.error)errorRef.current?.focus();},[error,command.error]);useUnsavedChanges(dirty||command.uncertain,command.uncertain);
  async function submit(event:FormEvent){
    event.preventDefault();setError('');let principal:number;try{principal=parsePesoInput(amount);if(principal<=0)throw new Error();}catch{setError('Enter a positive amount with no more than two decimal places.');return;}
    const result=await command.submit({purpose,requestedPrincipalCentavos:principal,requestedTermMonths:Number(term),currency:'PHP'},(body,key)=>client.updateApplication(record.id,body,{version:record.version,idempotencyKey:key,csrfToken:session!.csrfToken}));if(result){setDirty(false);saved(result);}
  }
  return <section className="panel panel-body"><form className="stack" onSubmit={event=>void submit(event)} onChange={()=>setDirty(true)}><h2 ref={heading} tabIndex={-1}>Edit draft for {record.memberName}</h2><p>Changes create a new request revision. The earlier draft remains recorded.</p>{(error||command.error)&&<div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{error||command.error}</Notice></div>}<fieldset className={styles.fields} disabled={command.saving||command.uncertain}><legend className="sr-only">Draft request correction</legend><div className="field"><label htmlFor="edit-purpose">Loan purpose</label><input id="edit-purpose" required minLength={3} maxLength={1000} value={purpose} onChange={event=>setPurpose(event.target.value)}/></div><div className="field"><label htmlFor="edit-amount">Requested amount (PHP)</label><input id="edit-amount" required inputMode="decimal" value={amount} onChange={event=>setAmount(event.target.value)}/></div><div className="field"><label htmlFor="edit-term">Requested term (months)</label><input id="edit-term" required type="number" min={1} max={600} step={1} value={term} onChange={event=>setTerm(event.target.value)}/></div></fieldset><div className="actions"><Button type="submit" disabled={command.saving}>{command.uncertain?'Retry same submission':command.saving?'Saving…':'Save draft correction'}</Button>{!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={cancel}>Cancel</Button>}</div></form></section>;
}
function AssignmentEditor({record,saved,cancel}:Props){
  const {client,session}=useStaff(),load=useCallback((options:RequestOptions)=>client.listStaff(options),[client]),staff=usePage(load);
  const [officerId,setOfficerId]=useState(''),[reason,setReason]=useState('');const command=useCommand<{officerId:string;reason:string},Application>(),heading=useRef<HTMLHeadingElement>(null),errorRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{heading.current?.focus();heading.current?.scrollIntoView({block:'start'});},[]);useEffect(()=>{if(command.error)errorRef.current?.focus();},[command.error]);useUnsavedChanges(Boolean(officerId||reason)||command.uncertain,command.uncertain);
  const available=staff.items.filter(person=>person.active&&person.roles.includes('officer')&&person.branchIds.includes(record.branchId)&&person.id!==record.assignedOfficerId);
  async function submit(event:FormEvent){event.preventDefault();const result=await command.submit({officerId,reason},(body,key)=>client.assignApplication(record.id,body,{version:record.version,idempotencyKey:key,csrfToken:session!.csrfToken}));if(result)saved(result);}
  return <section className={`panel ${panel.panel}`} aria-label="Officer assignment"><form onSubmit={event=>void submit(event)}>
    <header className={panel.header}><div className={panel.identity}><h2 ref={heading} tabIndex={-1}>Assign officer</h2><p className={panel.subject}>{record.memberName}</p></div><div className={panel.verification}><Info size={16}/><span>Authenticator required</span><a className={panel.verifyLink} aria-label="Verify assignment with authenticator" href={staffLoginHref('/staff/applications',true)}>Verify</a></div></header>
    <div className={panel.body}>
      {command.error&&<div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{command.error}</Notice></div>}
      {staff.error&&<Notice tone="warning">{staff.error} <Button variant="quiet" onClick={staff.refresh}>Retry staff list</Button></Notice>}
      <fieldset className={panel.fields} disabled={command.saving||command.uncertain}><legend className="sr-only">Officer assignment details</legend>
        <div className="field"><label htmlFor="assigned-officer">Officer</label><select id="assigned-officer" aria-label="New assigned officer" required value={officerId} onChange={event=>setOfficerId(event.target.value)}><option value="">Choose an officer</option>{available.map(person=><option key={person.id} value={person.id}>{person.displayName}</option>)}</select>{staff.hasMore&&<Button variant="quiet" disabled={staff.loading} onClick={()=>void staff.more()}>Load more staff</Button>}{!staff.loading&&!available.length&&!staff.hasMore&&!staff.error&&<p className={panel.hint}>No eligible officers available.</p>}</div>
        <div className="field"><label htmlFor="assignment-reason">Reason</label><textarea id="assignment-reason" aria-label="Reason for assignment" required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></div>
      </fieldset>
    </div>
    <footer className={panel.footer}>{!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={cancel}>Cancel</Button>}<Button type="submit" disabled={command.saving||staff.loading}>{command.uncertain?'Retry same submission':command.saving?'Saving…':'Save assignment'}</Button></footer>
  </form></section>;
}
