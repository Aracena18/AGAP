import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { z } from 'zod';
import type { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { DecisionConcernCheckSchema, DecisionConcernCreateSchema, DecisionConflictCreateSchema, DecisionReviewAssignmentSchema, DecisionReviewConfirmSchema, DecisionReviewDispositionSchema, type DecisionReviewSchema } from '../../../packages/contracts/src/schemas';
import type { StaffSession } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Badge, Button, Notice } from '../../shared/ui';
import { recordedInstant } from './staff-gateway';
import styles from './StaffDecisionPage.module.css';

type Review=z.output<typeof DecisionReviewSchema>;
type Kind='declare'|'confirm'|'raise'|'check'|'assign'|'dispose';
type Editor={kind:Kind;basis:Review;concernId?:string};
type Attempt={editor:Editor;body:unknown};
const titles:Record<Kind,string>={declare:'Declare own conflict status',confirm:'Confirm evidence check',raise:'Raise a source concern',check:'Check this concern',assign:'Assign a separate reviewer',dispose:'Record assigned review disposition'};
export default function DecisionReadiness({app,session,client,revision,disabled,onEditing,deny,saved}:{app:string;session:StaffSession;client:AgapClient;revision:number;disabled:boolean;onEditing:(v:boolean)=>void;deny:(message:string)=>void;saved:()=>void}){
  const [review,setReview]=useState<Review>(),[error,setError]=useState(''),[denied,setDenied]=useState(false),[refresh,setRefresh]=useState(0);
  const [editor,setEditor]=useState<Editor>(),[reason,setReason]=useState(''),[status,setStatus]=useState('clear'),[outcome,setOutcome]=useState('confirmed');
  const [source,setSource]=useState(''),[page,setPage]=useState('1'),[excerpt,setExcerpt]=useState(''),[corrected,setCorrected]=useState(''),[reviewer,setReviewer]=useState(''),[ack,setAck]=useState(false);
  const [history,setHistory]=useState<Awaited<ReturnType<AgapClient['listDecisionReviewEvents']>>>();
  const [paging,setPaging]=useState(false);const pageGate=useRef(false),heading=useRef<HTMLHeadingElement>(null);
  const command=useCommand<Attempt,Awaited<ReturnType<AgapClient['confirmDecisionReview']>>>();
  const locked=command.saving||command.uncertain;
  useUnsavedChanges(Boolean(editor),command.uncertain);
  useEffect(()=>{onEditing(Boolean(editor)||locked);return()=>onEditing(false);},[editor,locked,onEditing]);
  useEffect(()=>{
    const abort=new AbortController();
    Promise.all([client.getDecisionReview(app,{signal:abort.signal}),client.listDecisionReviewEvents(app,{signal:abort.signal})]).then(([r,h])=>{if(!abort.signal.aborted){setReview(r);setHistory(h);setError('');}}).catch((e:unknown)=>{if(!abort.signal.aborted){setError(e instanceof Error?e.message:'Review readiness is unavailable.');if(e instanceof ApiClientError&&[401,403,404].includes(e.status)){setDenied(true);setReview(undefined);setHistory(undefined);deny('This decision information is unavailable to the current account. Sign in again or contact the review owner.');}}});
    return()=>abort.abort();
  },[app,client,revision,refresh,deny]);
  function open(kind:Kind,concernId?:string){if(!review||disabled||locked)return;setEditor({kind,basis:structuredClone(review),concernId});setReason('');setAck(false);setStatus('clear');setOutcome(kind==='dispose'?'investigating':'confirmed');setSource('');setExcerpt('');setPage('1');setCorrected('');setReviewer('');setError('');command.reset();}
  function close(){if(locked)return;setEditor(undefined);command.reset();}
  async function send(attempt:Attempt,key:string){
    const {editor:e,body}=attempt,options={version:e.basis.version,csrfToken:session.csrfToken,idempotencyKey:key};
    try{
      switch(e.kind){
        case 'declare':return await client.declareDecisionConflict(app,DecisionConflictCreateSchema.parse(body),options);
        case 'confirm':return await client.confirmDecisionReview(app,DecisionReviewConfirmSchema.parse(body),options);
        case 'raise':return await client.raiseDecisionConcern(app,DecisionConcernCreateSchema.parse(body),options);
        case 'check':return await client.checkDecisionConcern(app,e.concernId!,DecisionConcernCheckSchema.parse(body),options);
        case 'assign':return await client.assignDecisionConcern(app,e.concernId!,DecisionReviewAssignmentSchema.parse(body),options);
        case 'dispose':return await client.recordDecisionConcernDisposition(app,e.concernId!,DecisionReviewDispositionSchema.parse(body),options);
      }
    }catch(e){if(e instanceof ApiClientError&&[401,403,404].includes(e.status)){setDenied(true);setReview(undefined);setHistory(undefined);deny('This decision information is unavailable to the current account. Sign in again or contact the review owner.');}throw e;}
  }
  async function submit(event:FormEvent){
    event.preventDefault();if(!editor)return;setError('');
    const basis={evidenceBasisHash:editor.basis.evidenceBasisHash},concern=editor.basis.concerns.find(c=>c.id===editor.concernId);
    let body:unknown;
    try{
      switch(editor.kind){
        case 'declare':body=DecisionConflictCreateSchema.parse({status,reference:reason});break;
        case 'confirm':body=DecisionReviewConfirmSchema.parse({...basis,mode:'manual',reviewedSources:ack,reviewedScenarios:ack,reason});break;
        case 'raise':{const s=editor.basis.sources.find(s=>s.sourceId===source);body=DecisionConcernCreateSchema.parse({...basis,description:reason,source:{sourceId:source,sourceVersion:s?.sourceVersion,page:Number(page),excerpt}});break;}
        case 'check':body=DecisionConcernCheckSchema.parse({...basis,outcome,reason,correctedText:outcome==='corrected'?corrected:''});break;
        case 'assign':body=DecisionReviewAssignmentSchema.parse({...basis,reviewerId:reviewer,reason});break;
        case 'dispose':body=DecisionReviewDispositionSchema.parse({...basis,assignmentId:concern?.assignment?.id,outcome,reason});break;
      }
    }catch{setError('Complete the required fields, exact source reference and applicable acknowledgments.');return;}
    const result=await command.submit({editor,body},send);
    if(result){setEditor(undefined);saved();setRefresh(n=>n+1);heading.current?.focus();}
  }
  async function more(){if(!history?.nextCursor||pageGate.current)return;pageGate.current=true;setPaging(true);try{const h=await client.listDecisionReviewEvents(app,{cursor:history.nextCursor});setHistory(old=>old?{items:[...old.items,...h.items.filter(e=>!old.items.some(x=>x.id===e.id))],nextCursor:h.nextCursor}:h);}catch(e){setError(e instanceof Error?e.message:'History is unavailable.');}finally{pageGate.current=false;setPaging(false);}}
  if(denied)return <Notice tone="danger" role="alert">Review information is unavailable to this account. Sign in again or contact the review owner.</Notice>;
  const canDeclare=session.user.roles.some(r=>r==='officer'||r==='reviewer');
  return <section className="panel no-print"><div className="panel-header"><h2 ref={heading} tabIndex={-1}>Evidence check and concerns</h2>{review&&<Badge>{review.state==='ready'?'Evidence check current':review.state.replaceAll('_',' ')}</Badge>}</div><div className={`panel-body ${styles.form}`}>
    {error&&<Notice tone="warning" role="alert">{error}</Notice>}{command.error&&<Notice tone="danger" role="alert">{command.error}</Notice>}
    <p>Manual review of saved evidence and all checked scenarios. A current check does not approve a loan or resolve failed financial rules.</p>
    <Link to={`/staff/applications/${app}/evidence`}>Inspect sources and assessment</Link>
    <Button variant="quiet" disabled={command.saving} onClick={()=>setRefresh(n=>n+1)}>Refresh review status</Button>
    {review&&<><p>{review.message}</p><p>Own conflict declaration: {review.ownConflict.status}. {review.ownConflict.reference}</p>
      {review.confirmation&&<p>Last confirmation: {recordedInstant(review.confirmation.recordedAt)} · {review.confirmation.current?'Current':'Renewed check required'}. {review.confirmation.reason}</p>}
      {disabled&&!editor&&<Notice>Finish or clear the decision draft before editing evidence-review actions.</Notice>}
      {!editor&&<div className="actions">{canDeclare&&<Button variant="secondary" disabled={disabled||locked||review.ownConflict.status==='restricted'} onClick={()=>open('declare')}>Declare own conflict status</Button>}{review.canConfirm&&<Button disabled={disabled||locked} onClick={()=>open('confirm')}>Confirm evidence check</Button>}{review.canRaiseConcern&&<Button variant="secondary" disabled={disabled||locked} onClick={()=>open('raise')}>Raise a source concern</Button>}</div>}
      <details><summary>Supplied source inventory ({review.sources.length})</summary><ul>{review.sources.map(s=><li key={s.sourceId}>{s.label} · {s.date} · version {s.sourceVersion} · {s.verification.replaceAll('_',' ')} · {s.referenceable?'Text available':'Text unavailable'}</li>)}</ul></details>
      {review.concerns.map(c=><section key={c.id} className={styles.preview}><h3>{c.description}</h3><Badge>{c.state.replaceAll('_',' ')}</Badge><blockquote>{c.source.excerpt}</blockquote><p>Source {c.source.sourceId} · version {c.source.sourceVersion} · page {c.source.page??'Unspecified'}</p>{c.check&&<p>Officer check: {c.check.outcome}. {c.check.reason} {c.check.correctedText}</p>}{c.assignment&&<p>Assigned to {c.assignment.reviewerName}: {c.assignment.reason}</p>}{c.disposition&&<p>Disposition: {c.disposition.outcome}. {c.disposition.reason}</p>}
        {!editor&&<div className="actions">{review.canCheckConcerns&&<Button variant="secondary" disabled={disabled||locked} onClick={()=>open('check',c.id)}>Check concern</Button>}{review.canCheckConcerns&&['needs_assignment','escalated','resolved'].includes(c.state)&&<Button variant="secondary" disabled={disabled||locked} onClick={()=>open('assign',c.id)}>Assign reviewer</Button>}{c.assignment?.reviewerId===session.user.id&&['escalated','resolved'].includes(c.state)&&<Button disabled={disabled||locked} onClick={()=>open('dispose',c.id)}>Record disposition</Button>}</div>}
      </section>)}
    </>}
    {editor&&<form onSubmit={event=>void submit(event)} className={styles.preview}><h3>{titles[editor.kind]}</h3><p>Opened at application version {editor.basis.version}. Refresh preserves this draft and its original version.</p>{review&&review.version!==editor.basis.version&&<Notice tone="warning">The application changed. This draft cannot overwrite newer work. Cancel and inspect the current basis before a new action.</Notice>}
      <fieldset disabled={locked} className={styles.form}><legend>Accountable review details</legend>
      {editor.kind==='declare'&&<div className="field"><label htmlFor="review-conflict">Own conflict status</label><select id="review-conflict" value={status} onChange={e=>setStatus(e.target.value)}><option value="clear">Clear</option><option value="restricted">Restricted — another participant required</option></select></div>}
      {editor.kind==='raise'&&<><div className="field"><label htmlFor="review-source">Supporting source</label><select required id="review-source" value={source} onChange={e=>setSource(e.target.value)}><option value="">Choose inspected source</option>{editor.basis.sources.filter(s=>s.referenceable).map(s=><option key={s.sourceId} value={s.sourceId}>{s.label} · {s.date}</option>)}</select></div><div className="field"><label htmlFor="review-page">Source page</label><input id="review-page" type="number" min={1} step={1} required value={page} onChange={e=>setPage(e.target.value)}/></div><div className="field"><label htmlFor="review-quote">Exact supporting quotation</label><textarea id="review-quote" required maxLength={2000} value={excerpt} onChange={e=>setExcerpt(e.target.value)}/></div></>}
      {['check','dispose'].includes(editor.kind)&&<div className="field"><label htmlFor="review-outcome">Review outcome</label><select id="review-outcome" value={outcome} onChange={e=>setOutcome(e.target.value)}>{(editor.kind==='check'?['confirmed','corrected','dismissed']:['investigating','clarification','options','resolved']).map(v=><option key={v} value={v}>{v}</option>)}</select></div>}
      {editor.kind==='check'&&outcome==='corrected'&&<div className="field"><label htmlFor="review-correction">Corrected concern text</label><textarea id="review-correction" required maxLength={2000} value={corrected} onChange={e=>setCorrected(e.target.value)}/></div>}
      {editor.kind==='assign'&&<div className="field"><label htmlFor="review-assignee">Separate eligible reviewer</label><select id="review-assignee" required value={reviewer} onChange={e=>setReviewer(e.target.value)}><option value="">Choose reviewer</option>{editor.basis.reviewers.map(r=><option key={r.userId} value={r.userId} disabled={!r.available}>{r.displayName}{r.available?'':' · clearance or authority unavailable'}</option>)}</select></div>}
      <div className="field"><label htmlFor="review-reason">{editor.kind==='raise'?'Concern and requested check':'Reason and evidence reviewed'}</label><textarea id="review-reason" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></div>
      {editor.kind==='confirm'&&<label className={styles.choice}><input type="checkbox" required checked={ack} onChange={e=>setAck(e.target.checked)}/>I inspected the complete current sources and all checked scenarios. This is a manual check.</label>}
      </fieldset><div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Saving…':command.uncertain?'Retry same review submission':'Record review action'}</Button>{!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={close}>Cancel review action</Button>}</div>
    </form>}
    {history&&<details><summary>Immutable review history ({history.items.length} loaded)</summary><ol>{history.items.map(e=><li key={e.id}>{recordedInstant(e.recordedAt)} · {e.event.kind.replaceAll('_',' ')} · actor {e.recordedBy} · revision {e.version}</li>)}</ol>{history.nextCursor&&<Button variant="quiet" disabled={paging} onClick={()=>void more()}>Load earlier review actions</Button>}</details>}
  </div></section>;
}
