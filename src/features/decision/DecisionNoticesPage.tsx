import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { ApiClientError, type RequestOptions } from '../../../packages/api-client/src/transport';
import { useStaff } from '../access/StaffContext';
import { usePage } from '../access/usePage';
import { useCommand } from '../access/useCommand';
import { Button, Notice } from '../../shared/ui';
import { recordedInstant } from './staff-gateway';

export default function DecisionNoticesPage(){
  const {client,session}=useStaff();
  const [denied,setDenied]=useState(false);
  const loader=useCallback(async(options:RequestOptions)=>{try{return await client.listDecisionNotices(options);}catch(e){if(e instanceof ApiClientError&&[401,403,404].includes(e.status))setDenied(true);throw e;}},[client]);const page=usePage(loader);
  const command=useCommand<string,Awaited<ReturnType<typeof client.acknowledgeDecisionNotice>>>();
  const [selected,setSelected]=useState('');
  if(!session?.user.roles.includes('reviewer'))return <Notice>This inbox requires a reviewer account.</Notice>;
  if(denied)return <Notice tone="danger" role="alert">Review notices are unavailable to the current account. Sign in again or contact the review owner.</Notice>;
  async function acknowledge(id:string){setSelected(id);const saved=await command.submit(id,(notice,key)=>client.acknowledgeDecisionNotice(notice,{acknowledgment:true},{csrfToken:session!.csrfToken,idempotencyKey:key}));if(saved){setSelected('');page.refresh();}}
  return <div className="stack"><h1>Assigned review notices</h1><p>Acknowledgment records receipt. It does not resolve a concern or approve a loan.</p>{page.error&&<Notice tone="warning" role="alert">{page.error}</Notice>}{command.error&&<Notice tone="danger" role="alert">{command.error}</Notice>}
    {command.uncertain&&<Button disabled={command.saving} onClick={()=>void acknowledge(selected)}>Retry same acknowledgment</Button>}
    {!page.loading&&!page.items.length&&!page.error&&<Notice>No assigned review notices.</Notice>}
    {page.items.map(n=><section className="panel panel-body stack" key={n.id}><h2>Review assignment</h2><p>{recordedInstant(n.createdAt)}</p><Link to={`/staff/applications/${n.applicationId}/decision`}>Open assigned application review</Link><p>{n.acknowledgedAt?`Acknowledged ${recordedInstant(n.acknowledgedAt)}`:'Not yet acknowledged'}</p>{!n.acknowledgedAt&&<Button variant="secondary" disabled={command.saving||command.uncertain} onClick={()=>void acknowledge(n.id)}>Acknowledge receipt</Button>}</section>)}
    <div className="actions"><Button variant="secondary" disabled={page.loading||command.saving||command.uncertain} onClick={page.refresh}>Refresh notices</Button>{page.hasMore&&<Button variant="quiet" disabled={page.loading} onClick={()=>void page.more()}>Load earlier notices</Button>}</div>
  </div>;
}
