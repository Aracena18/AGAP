import { useCallback, useRef, useState, type FormEvent } from 'react';
import type { z } from 'zod';
import { schemas } from '../../../packages/contracts/src/schemas';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { useMember } from './MemberContext';
import { useResource } from './useResource';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Button, Notice } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import { CommandError, ReadState } from './MemberFeedback';
import { OptionSummary } from './MemberOptionSummary';
import styles from './MemberApp.module.css';
type Output<K extends keyof typeof schemas>=z.output<(typeof schemas)[K]>;
type Attempt={body:Output<'MemberAcceptance'>;version:number};
type Acknowledgment={decisionId:string;documentId:string;sha256:string;version:number};
export default function MemberDecisionTerms({record,changed}:{record:Output<'MemberApplication'>;changed:()=>void}){
  const {client,session}=useMember();
  const load=useCallback((signal:AbortSignal)=>client.getMemberDecision(record.id,{signal}),[client,record.id]);
  const read=useResource(load,record.version),decision=read.data?.state==='available'?read.data.data:null;
  const documentId=decision?.documentVersionId??null;
  const loadDocument=useCallback(async(signal:AbortSignal)=>{
    if(!documentId)return null;
    const doc=await client.getMemberDecisionDocument(record.id,documentId,{signal});
    const bytes=new TextEncoder().encode(doc.text),digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
    if(doc.id!==documentId||bytes.byteLength>65536||digest!==doc.sha256)throw new ApiClientError(503,'document_integrity','The saved terms checksum could not be verified.');
    return doc;
  },[client,record.id,documentId]);
  const document=useResource(loadDocument,record.version);
  const command=useCommand<Attempt,Output<'CommandReceipt'>>(),last=useRef<Attempt|null>(null);
  const [acknowledgment,setAcknowledgment]=useState<Acknowledgment|null>(null),[status,setStatus]=useState('');
  const locked=command.saving||command.uncertain;
  const terms=decision&&document.data?.id===documentId&&!document.loading?document.data:null;
  const acknowledged=Boolean(terms&&acknowledgment&&acknowledgment.decisionId===decision?.id&&acknowledgment.documentId===terms.id&&acknowledgment.sha256===terms.sha256&&acknowledgment.version===record.version);
  useUnsavedChanges(acknowledged||locked,command.uncertain);
  async function execute(attempt:Attempt){
    last.current=attempt;
    const result=await command.submit(attempt,(a,key)=>client.acceptMemberDecision(record.id,a.body,{version:a.version,idempotencyKey:key,csrfToken:session!.csrfToken}));
    if(result){setAcknowledgment(null);setStatus('Your acceptance was recorded. Funds are released through a separate authorized process.');read.refresh();changed();}
  }
  function accept(event:FormEvent){event.preventDefault();if(!decision||!terms||!acknowledged||locked)return;void execute({body:{decisionId:decision.id,documentVersionId:terms.id,acknowledgment:true},version:record.version});}
  function download(){if(!terms)return;const url=URL.createObjectURL(new Blob([terms.text],{type:terms.mediaType}));const a=globalThis.document.createElement('a');a.href=url;a.download=`agap-terms-${terms.id}.txt`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className={`panel panel-body ${styles.section}`} aria-label="Recorded decision"><h2>Recorded decision</h2><Button variant="quiet" disabled={locked} onClick={()=>{setAcknowledgment(null);read.refresh();document.refresh();}}>Refresh recorded terms</Button><ReadState {...read}/><CommandError error={command.error}/>{status&&<Notice role="status">{status}</Notice>}
    {command.uncertain&&<div className="stack"><Notice tone="warning">The result is uncertain. Retry the original acceptance before starting another action, even if the current terms have changed.</Notice><Button disabled={command.saving} onClick={()=>{if(last.current)void execute(last.current);}}>Retry same acceptance</Button></div>}
    {read.data?.state==='unavailable'?<p>{read.data.message}</p>:read.data?.state==='available'&&(decision?<>
      <h3>{decision.outcome==='approve'?'Approved for the recorded terms':decision.outcome==='decline'?'Request declined':'More information requested'}</h3><p>{decision.explanation}</p><p className="small subtle">Recorded {dateLabel(decision.recordedAt)}</p>
      {decision.terms&&<OptionSummary option={decision.terms}/>}
      {documentId&&<section className={`stack ${styles.document}`}><h3>Exact saved terms</h3><ReadState {...document}/>{terms&&<><p className="small">Document version: {terms.id}</p><p className="small">SHA256 verified: {terms.sha256}</p><pre className={styles.exactTerms}>{terms.text}</pre><Button variant="secondary" disabled={locked} onClick={download}>Download exact saved terms</Button></>}</section>}
      {decision.accepted?<Notice>Your acceptance is recorded.</Notice>:decision.outcome==='approve'&&(documentId&&decision.terms?<form className={styles.form} onSubmit={accept}>
        {!terms&&<Notice tone="warning">The exact saved terms must load and pass their checksum check before a new acceptance.</Notice>}
        <label className={styles.check}><input type="checkbox" required disabled={locked||!terms} checked={acknowledged} onChange={e=>setAcknowledgment(e.target.checked&&terms?{decisionId:decision.id,documentId:terms.id,sha256:terms.sha256,version:record.version}:null)}/>I reviewed and accept these recorded terms, dates and full costs.</label>
        <Button type="submit" disabled={locked||!acknowledged||!terms}>{command.saving?'Saving…':'Accept these terms'}</Button>
      </form>:<Notice>The complete approved terms are unavailable. Contact the cooperative before accepting.</Notice>)}
    </>:<p>No decision has been recorded yet.</p>)}
  </section>;
}
