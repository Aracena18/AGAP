import { staffLoginHref } from './staffLogin';
import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import type { z } from 'zod';
import type { StaffSchema } from '../../../packages/contracts/src/schemas';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { useStaff } from './StaffContext';
import { usePage } from './usePage';
import { useCommand } from './useCommand';
import { useUnsavedChanges } from './useUnsavedChanges';
import { Badge,Button,Notice } from '../../shared/ui';

type Staff=z.output<typeof StaffSchema>;
export default function AccessPage(){
  const {session,client}=useStaff();
  const loader=useCallback((options:RequestOptions)=>client.listStaff(options),[client]);const page=usePage(loader);
  const command=useCommand<{id:string;version:number;reason:string},Staff>();
  const [target,setTarget]=useState<Staff|null>(null),[reason,setReason]=useState(''),[status,setStatus]=useState('');
  const errorRef=useRef<HTMLDivElement>(null);useEffect(()=>{if(command.error)errorRef.current?.focus();},[command.error]);
  useUnsavedChanges(Boolean(target&&reason),command.uncertain);
  if(!session!.user.roles.includes('administrator'))return <Notice tone="warning">Staff access management requires an administrator role.</Notice>;
  async function submit(event:FormEvent){
    event.preventDefault();if(!target)return;
    const saved=await command.submit({id:target.id,version:target.version,reason},(body,key)=>client.revokeStaff(body.id,{reason:body.reason},{version:body.version,idempotencyKey:key,csrfToken:session!.csrfToken}));
    if(saved){setStatus(`Access revoked for ${saved.displayName}. Existing sessions have ended.`);setTarget(null);setReason('');page.refresh();}
  }
  return <div className="stack"><div className="page-heading"><div><p className="eyebrow">Administration</p><h1>Staff access</h1><p>Review assigned access and end access for a staff account when needed.</p></div></div>
    {status&&<Notice role="status">{status}</Notice>}
    {target&&<section className="panel panel-body"><form className="stack" onSubmit={event=>void submit(event)}><div><h2>Revoke access for {target.displayName}</h2><p className="subtle">This ends their sessions and prevents another sign-in. A recent multi-factor sign-in is required.</p></div>{command.error&&<div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{command.error}</Notice></div>}<div className="field"><label htmlFor="revocation-reason">Reason for revoking access</label><textarea id="revocation-reason" required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} disabled={command.saving||command.uncertain} autoFocus/></div><div className="actions"><Button type="submit" variant="danger" disabled={command.saving}>{command.saving?'Revoking…':command.uncertain?'Retry same submission':'Revoke access'}</Button>{!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={()=>{command.reset();setTarget(null);setReason('');}}>Cancel</Button>}<a href={staffLoginHref('/staff/access',true)}>Verify with authenticator</a></div></form></section>}
    {page.error&&<Notice tone="warning" role="alert">{page.error} <Button variant="quiet" onClick={page.refresh}>Retry</Button></Notice>}
    <section className="panel"><div className="table-scroll" tabIndex={0} role="region" aria-label="Staff accounts"><table><caption className="sr-only">Staff access within your administrative scope</caption><thead><tr><th scope="col">Staff member</th><th scope="col">Roles</th><th scope="col">Access</th><th scope="col">Action</th></tr></thead><tbody>{page.items.map(staff=><tr key={staff.id}><th scope="row">{staff.displayName}{staff.id===session!.user.id?' (you)':''}</th><td>{staff.roles.map(role=>role.replaceAll('_',' ')).join(', ')}</td><td><Badge tone={staff.active?'neutral':'warning'}>{staff.active?'Active':'Revoked'}</Badge></td><td>{staff.active&&staff.id!==session!.user.id?<Button variant="quiet" disabled={command.saving||command.uncertain} onClick={()=>{command.reset();setTarget(staff);setReason('');setStatus('');}}>Review revocation</Button>:<span className="subtle">—</span>}</td></tr>)}</tbody></table></div>{page.loading&&<p className="panel-body" role="status">Loading staff accounts…</p>}{page.hasMore&&<div className="panel-body"><Button variant="secondary" onClick={()=>void page.more()} disabled={page.loading}>Load more staff</Button></div>}</section>
  </div>;
}
