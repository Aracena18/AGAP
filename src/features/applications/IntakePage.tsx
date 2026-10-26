import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import type { ApplicationCreateSchema,ApplicationSchema } from '../../../packages/contracts/src/schemas';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { useStaff } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { usePage } from '../access/usePage';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { parsePesoInput } from '../../domain/evidence';
import { Badge,Button,Money,Notice } from '../../shared/ui';
import styles from '../members/intake.module.css';
import ApplicationManagement from './ApplicationManagement';

export default function IntakePage(){
  const {session,client}=useStaff();
  const loader=useCallback((options:RequestOptions)=>client.listApplications(options),[client]);const page=usePage(loader);
  const membersLoader=useCallback((options:RequestOptions)=>client.listMembers(options),[client]);const members=usePage(membersLoader);
  const command=useCommand<z.input<typeof ApplicationCreateSchema>,z.output<typeof ApplicationSchema>>();
  const [editing,setEditing]=useState(false),[memberId,setMemberId]=useState(''),[purpose,setPurpose]=useState(''),[amount,setAmount]=useState(''),[term,setTerm]=useState('12'),[error,setError]=useState(''),[status,setStatus]=useState('');
  const [management,setManagement]=useState<{record:z.output<typeof ApplicationSchema>;mode:'edit'|'assign'}|null>(null);
  const errorRef=useRef<HTMLDivElement>(null);useEffect(()=>{if(command.error||error)errorRef.current?.focus();},[command.error,error]);
  useUnsavedChanges(editing&&Boolean(memberId||purpose||amount),command.uncertain);
  async function submit(event:FormEvent){
    event.preventDefault();setError('');setStatus('');let principal:number;
    try{principal=parsePesoInput(amount);if(principal<=0)throw new Error();}catch{setError('Enter a positive PHP amount with no more than two decimal places.');return;}
    const saved=await command.submit({memberId,purpose,requestedPrincipalCentavos:principal,requestedTermMonths:Number(term),currency:'PHP'},(body,key)=>client.createApplication(body,{idempotencyKey:key,csrfToken:session!.csrfToken}));
    if(saved){setStatus(`Application saved for ${saved.memberName}.`);setEditing(false);setMemberId('');setPurpose('');setAmount('');setTerm('12');page.refresh();}
  }
  return <div className="stack"><div className="page-heading"><div><p className="eyebrow">Loan intake</p><h1>Applications</h1><p>Record the request before its evidence and terms are reviewed.</p></div>{session!.user.roles.includes('officer')&&!editing&&<Button onClick={()=>{setEditing(true);setStatus('');}}>New application</Button>}</div>
    {status&&<Notice role="status">{status}</Notice>}
    {management&&<ApplicationManagement key={`${management.record.id}:${management.mode}`} record={management.record} mode={management.mode} cancel={()=>setManagement(null)} saved={saved=>{setManagement(null);setStatus(`Application ${management.mode==='assign'?'assignment':'correction'} saved for ${saved.memberName}.`);page.refresh();}}/>}
    {editing&&<section className="panel panel-body"><form onSubmit={event=>void submit(event)} className="stack"><div><h2>Prepare an application</h2><p className="small subtle">Requested terms are for review. Saving this draft does not approve a loan.</p></div>
      {(command.error||error)&&<div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{error||command.error}{command.fields.length>0&&<ul>{command.fields.map(field=><li key={field.path}>{field.path}: {field.message}</li>)}</ul>}</Notice></div>}
      {members.error&&<Notice tone="warning" role="alert">{members.error} <Button variant="quiet" onClick={members.refresh}>Retry members</Button></Notice>}
      {!members.loading&&members.items.length===0&&!members.error&&<Notice>Add a <Link to="/staff/members">member record</Link> before creating an application.</Notice>}
      <fieldset disabled={command.saving||command.uncertain} className={styles.fields}><legend className="sr-only">Requested loan details</legend>
        <div className="field"><label htmlFor="application-member">Member</label><select id="application-member" required value={memberId} onChange={event=>setMemberId(event.target.value)}><option value="">Choose a member</option>{members.items.map(member=><option key={member.id} value={member.id}>{member.fullName} · {member.externalReference}</option>)}</select>{members.hasMore&&<Button variant="quiet" disabled={members.loading} onClick={()=>void members.more()}>Load more members</Button>}</div>
        <div className="field"><label htmlFor="application-purpose">Loan purpose</label><input id="application-purpose" required minLength={3} maxLength={1000} value={purpose} onChange={event=>setPurpose(event.target.value)}/></div>
        <div className="field"><label htmlFor="application-amount">Requested amount (PHP)</label><input id="application-amount" inputMode="decimal" required value={amount} onChange={event=>setAmount(event.target.value)} aria-invalid={Boolean(error)}/></div>
        <div className="field"><label htmlFor="application-term">Requested term (months)</label><input id="application-term" type="number" required min={1} max={600} step={1} value={term} onChange={event=>setTerm(event.target.value)}/></div>
      </fieldset><div className="actions"><Button type="submit" disabled={command.saving||members.loading}>{command.saving?'Saving…':command.uncertain?'Retry same submission':'Save application'}</Button>{!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={()=>{command.reset();setEditing(false);setMemberId('');setPurpose('');setAmount('');setTerm('12');setError('');}}>Cancel</Button>}</div>
    </form></section>}
    {page.error&&<Notice tone="warning" role="alert">{page.error} <Button variant="quiet" onClick={page.refresh}>Retry</Button></Notice>}
    <section className="panel"><div className="table-scroll" tabIndex={0} role="region" aria-label="Server application records"><table><caption className="sr-only">Applications within your assigned access</caption><thead><tr><th scope="col">Member</th><th scope="col">Purpose</th><th scope="col" className="numeric">Requested</th><th scope="col">Term</th><th scope="col">Status</th><th scope="col">Action</th></tr></thead><tbody>{page.items.map(application=><tr key={application.id}><th scope="row">{application.memberName}</th><td>{application.purpose}</td><td className="numeric"><Money value={application.requestedPrincipalCentavos}/></td><td>{application.requestedTermMonths} months</td><td><Badge>{application.status==='draft'?'Draft':application.status.replaceAll('_',' ')}</Badge></td><td>{!editing&&!management&&<div className="actions">{application.status==='draft'&&application.assignedOfficerId===session!.user.id&&session!.user.roles.includes('officer')&&<Button variant="quiet" onClick={()=>{setManagement({record:application,mode:'edit'});setStatus('');}}>Edit draft request</Button>}{['draft','submitted','evidence_review','clarification'].includes(application.status)&&session!.user.roles.includes('administrator')&&<Button variant="quiet" onClick={()=>{setManagement({record:application,mode:'assign'});setStatus('');}}>Assign officer</Button>}{!application.assignedOfficerId&&<span className="small subtle">Awaiting assignment</span>}</div>}</td></tr>)}</tbody></table></div>{page.loading?<p className="panel-body" role="status">Loading applications…</p>:page.items.length===0&&!page.error?<div className="panel-body"><h2>No applications recorded</h2><p className="subtle">Prepare the first request from a saved member record.</p></div>:null}{page.hasMore&&<div className="panel-body"><Button variant="secondary" disabled={page.loading} onClick={()=>void page.more()}>Load more applications</Button></div>}</section>
  </div>;
}
