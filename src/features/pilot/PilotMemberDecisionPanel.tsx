import { useCallback, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { schemas } from '../../../packages/contracts/src/schemas';
import { useMember } from '../member-portal/MemberContext';
import { useResource } from '../member-portal/useResource';
import { ReadState, CommandError } from '../member-portal/MemberFeedback';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Button, Notice } from '../../shared/ui';
import { PrincipalTerms } from './PrincipalTerms';
import styles from './pilot.module.css';

type Attempt={body:z.input<typeof schemas.MemberAcceptance>;version:number;csrf:string;applicationId:string};
export function PilotMemberDecisionPanel({applicationId,revision,changed}:{applicationId:string;revision:number;changed:()=>void}){
  const {session}=useMember();
  if(!session)return null;
  return <Decision key={`${session.principal.memberId}:${session.csrfToken}:${applicationId}`} applicationId={applicationId} revision={revision} changed={changed}/>;
}
function Decision({applicationId,revision,changed}:{applicationId:string;revision:number;changed:()=>void}){
  const {client,session}=useMember(),load=useCallback((signal:AbortSignal)=>client.getPilotMemberDecision(applicationId,{signal}),[client,applicationId]);
  const read=useResource(load,revision),command=useCommand<Attempt,z.output<typeof schemas.CommandReceipt>>();
  const last=useRef<Attempt|null>(null);
  const [checked,setChecked]=useState(false),[notice,setNotice]=useState('');
  useUnsavedChanges(checked||command.uncertain,command.uncertain);
  const decision=read.data?.state==='available'?read.data.data:null;
  async function accept(event?:FormEvent){event?.preventDefault();if(!command.uncertain){if(!decision?.document||!checked)return;last.current={applicationId,version:decision.applicationVersion,csrf:session!.csrfToken,body:{decisionId:decision.id,documentVersionId:decision.document.id,acknowledgment:true}};}if(!last.current)return;
    const result=await command.submit(last.current,(a,key)=>client.acceptPilotMemberDecision(a.applicationId,a.body,{version:a.version,csrfToken:a.csrf,idempotencyKey:key}));
    if(result){setChecked(false);setNotice('Your acceptance is recorded. A separate authorized process handles the simulated release.');read.refreshKeepingData();changed();}
  }
  return <section className="panel panel-body stack" aria-label="Recorded decision"><h2>Recorded decision</h2><ReadState {...read}/><CommandError error={command.error} fields={command.fields}/>{notice&&<Notice role="status">{notice}</Notice>}{command.uncertain&&!decision&&<Button disabled={command.saving} onClick={()=>void accept()}>Retry same acceptance</Button>}
    {read.data?.state==='unavailable'&&<Notice>{read.data.message}</Notice>}
    {read.data?.state==='available'&&!decision&&<p>No human decision has been recorded yet.</p>}
    {decision&&<><h3>{decision.outcome==='approve'?'Approved for these saved terms':decision.outcome==='decline'?'Request declined':'More information requested'}</h3><p>{decision.explanation}</p>
      {decision.offer&&<PrincipalTerms offer={decision.offer} assessment={decision.assessment}/>}
      {decision.document&&<details><summary>Read the exact saved terms document</summary><pre className={styles.terms} tabIndex={0}>{decision.document.text}</pre><p className="small">Document checksum: <span className={styles.reference}>{decision.document.sha256}</span></p></details>}
      {decision.accepted?<Notice>Your acceptance of the saved document is recorded.</Notice>:decision.outcome==='approve'&&(decision.offer&&decision.document?<form className="stack" onSubmit={e=>void accept(e)}><label><input type="checkbox" required checked={checked} disabled={command.saving||command.uncertain} onChange={e=>setChecked(e.target.checked)}/> I reviewed and accept this exact document, schedule and full costs.</label><div><Button type="submit" disabled={command.saving}>{command.saving?'Saving…':command.uncertain?'Retry same acceptance':'Accept these terms'}</Button></div></form>:<Notice>The full saved terms are unavailable. Contact staff before accepting.</Notice>)}
    </>}
  </section>;
}
