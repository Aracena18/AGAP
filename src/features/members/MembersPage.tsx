import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import type { z } from 'zod';
import type { MemberCreateSchema,MemberUpdateSchema,MemberSchema } from '../../../packages/contracts/src/schemas';
import { useStaff } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { usePage } from '../access/usePage';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { Badge,Button,Notice } from '../../shared/ui';
import styles from './intake.module.css';
type Member=z.output<typeof MemberSchema>;
type Command={kind:'create';data:z.input<typeof MemberCreateSchema>}|{kind:'update';id:string;version:number;data:z.input<typeof MemberUpdateSchema>};

export default function MembersPage(){
  const {session,client}=useStaff();
  const loader=useCallback((options:RequestOptions)=>client.listMembers(options),[client]);
  const page=usePage(loader);
  const command=useCommand<Command,Member>();
  const [editing,setEditing]=useState<Member|'create'|null>(null),[name,setName]=useState(''),[reference,setReference]=useState(''),[phone,setPhone]=useState(''),[branch,setBranch]=useState(session!.user.branches[0]?.id??''),[acknowledged,setAcknowledged]=useState(false),[status,setStatus]=useState('');
  const errorRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(command.error)errorRef.current?.focus();},[command.error]);
  useUnsavedChanges(editing==='create'?Boolean(name||reference||phone||acknowledged):Boolean(editing&&(name!==editing.fullName||phone!==(editing.phone??''))),command.uncertain);
  function cancel(){if(!command.reset())return;setEditing(null);setName('');setReference('');setPhone('');setAcknowledged(false);page.refresh();}
  async function submit(event:FormEvent){
    event.preventDefault();setStatus('');
    if(!editing)return;
    const request:Command=editing==='create'?{kind:'create',data:{externalReference:reference,fullName:name,phone:phone||null,branchId:branch,noticeVersion:session!.privacyNoticeVersion,noticeAcknowledged:true}}:{kind:'update',id:editing.id,version:editing.version,data:{fullName:name,phone:phone||null}};
    const saved=await command.submit(request,(body,key)=>body.kind==='create'?client.createMember(body.data,{idempotencyKey:key,csrfToken:session!.csrfToken}):client.updateMember(body.id,body.data,{version:body.version,idempotencyKey:key,csrfToken:session!.csrfToken}));
    if(saved){setStatus(`${saved.fullName} was ${editing==='create'?'added':'updated'}. The record is saved on the server.`);cancel();}
  }
  return <div className="stack">
    <div className="page-heading"><div><h1>Members</h1><p>Keep contact details and the member's application history together.</p></div>{session!.user.roles.includes('officer')&&!editing&&<Button onClick={()=>{setEditing('create');setStatus('');}}>Add member</Button>}</div>
    {status&&<Notice role="status">{status}</Notice>}
    {editing&&<section className="panel panel-body"><form onSubmit={event=>void submit(event)} className="stack"><div><h2>{editing==='create'?'Add a member':`Update ${editing.fullName}`}</h2><p className="small subtle">Changes are saved when you submit this form. Earlier revisions remain on the server.</p></div>
      {command.error&&<div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{command.error}{command.fields.length>0&&<ul>{command.fields.map(field=><li key={field.path}>{field.path}: {field.message}</li>)}</ul>}</Notice></div>}
      <fieldset disabled={command.saving||command.uncertain} className={styles.fields}><legend className="sr-only">Member details</legend>
        <div className="field"><label htmlFor="member-name">Full name</label><input id="member-name" autoComplete="name" required minLength={2} maxLength={160} value={name} onChange={event=>setName(event.target.value)} autoFocus/></div>
        {editing==='create'&&<div className="field"><label htmlFor="member-reference">Cooperative member reference</label><input id="member-reference" required maxLength={64} value={reference} onChange={event=>setReference(event.target.value)}/></div>}
        <div className="field"><label htmlFor="member-phone">Phone number (optional)</label><input id="member-phone" type="tel" autoComplete="tel" maxLength={40} value={phone} onChange={event=>setPhone(event.target.value)}/></div>
        {editing==='create'&&<><div className="field"><label htmlFor="member-branch">Branch</label><select id="member-branch" required value={branch} onChange={event=>setBranch(event.target.value)}>{session!.user.branches.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
        <label className={styles.check}><input type="checkbox" checked={acknowledged} required onChange={event=>setAcknowledged(event.target.checked)}/>The member has received the current privacy notice.</label></>}
      </fieldset>
      <div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Saving…':command.uncertain?'Retry same submission':'Save member'}</Button>{!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={cancel}>Cancel and reload</Button>}</div>
    </form></section>}
    {page.error&&<Notice tone="warning" role="alert">{page.error} <Button variant="quiet" onClick={page.refresh}>Retry</Button></Notice>}
    <section className="panel"><div className="table-scroll" tabIndex={0} role="region" aria-label="Member records"><table><caption className="sr-only">Members available within your staff access</caption><thead><tr><th scope="col">Member</th><th scope="col">Reference</th><th scope="col">Phone</th><th scope="col">Record</th>{session!.user.roles.includes('officer')&&<th scope="col">Action</th>}</tr></thead><tbody>{page.items.map(member=><tr key={member.id}><th scope="row">{member.fullName}</th><td>{member.externalReference}</td><td>{member.phone||'Not provided'}</td><td><Badge>Saved</Badge></td>{session!.user.roles.includes('officer')&&<td><Button variant="quiet" disabled={Boolean(editing)} onClick={()=>{setEditing(member);setName(member.fullName);setPhone(member.phone??'');setStatus('');}}>Update member</Button></td>}</tr>)}</tbody></table></div>{page.loading?<p className="panel-body" role="status">Loading members…</p>:page.items.length===0&&!page.error?<div className="panel-body"><h2>No members recorded</h2><p className="subtle">Add the first member before preparing an application.</p></div>:null}{page.hasMore&&<div className="panel-body"><Button variant="secondary" disabled={page.loading} onClick={()=>void page.more()}>Load more members</Button></div>}</section>
  </div>;
}
