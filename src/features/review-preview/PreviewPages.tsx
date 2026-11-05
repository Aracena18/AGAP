import { useCallback,useEffect,useRef,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import type { AgapClient } from '../../../packages/api-client/src';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import type { z } from 'zod';
import type { ApplicationSchema } from '../../../packages/contracts/src/schemas';
import { useMember } from '../member-portal/MemberContext';
import { useStaff } from '../access/StaffContext';
import { useResource } from '../member-portal/useResource';
import { WorkflowUpload } from '../workflow/WorkflowPanel';
import { Button,Money,Notice,Badge } from '../../shared/ui';
import { Description,FindInPage,CompareArrows } from '../../shared/icons';
import { dateLabel } from '../../domain/format';
import { buildReview,compareAttention,defaultAssumptions,materialBasis,priorityLabel,type Assumptions,type View,type Review } from './analysis';
import { HouseholdForm } from './HouseholdForm';
import { ScenarioForm,ReviewReport } from './ReviewReport';
import { usePreview } from './PreviewContext';
import styles from './preview.module.css';

const steps=['Gathering saved information','Checking sources and missing details','Comparing repayment scenarios','Preparing the 5C review'];
export function MemberPreviewPage(){const {id}=useParams(),{session,client}=useMember();if(!session||session.recordMode==='real')return <Notice>Demonstration analysis is available only in the fictional environment.</Notice>;return <PreviewWorkspace key={`${id}:${session.principal.memberId}`} id={id!} member client={client} csrf={session.csrfToken}/>;}
export function StaffPreviewPage(){const {id}=useParams(),{session,client}=useStaff();if(!session||session.recordMode==='real'||!session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r)))return <Notice>Demonstration analysis requires authorized lending-review access in the fictional environment.</Notice>;return <PreviewWorkspace key={`${id}:${session.user.id}`} id={id!} member={false} client={client} csrf={session.csrfToken} actor={{id:session.user.id,name:session.user.displayName,roles:session.user.roles}}/>;}
function Disclosure(){return <p className={styles.disclosure}><Badge tone="neutral">Demonstration preview</Badge><span>Calculated using your saved household cash flow and loan terms.</span></p>;}
function PreviewWorkspace({id,member,client,csrf,actor}:{id:string;member:boolean;client:AgapClient;csrf:string;actor?:{id:string;name:string;roles:string[]}}){
 const load=useCallback(async(signal:AbortSignal)=>{const [application,view]=await Promise.all([member?client.getMemberApplication(id,{signal}):client.getApplication(id,{signal}),member?client.getMemberWorkflow(id,{signal}):client.getStaffWorkflow(id,{signal})]);return {application,view};},[client,id,member]);
 const read=useResource(load),[blocked,setBlocked]=useState(false);
 const base=member?`/member/applications/${id}`:`/staff/applications/${id}/evidence`;
 return <div className="stack">
  <div className={styles.topRow}>
   <Link to={base} className={styles.backLink}>← {member?'Back to my application':'Back to evidence'}</Link>
   <Button variant="secondary" disabled={read.loading||blocked} onClick={read.refresh}>Refresh saved information</Button>
  </div>
  <header className={styles.heading}>
   <div>
    <h1>{member?'Your repayment review':'Application analysis'}</h1>
    <div className={styles.headerMeta}>
     <span className={styles.purposePill}>{read.data?.application.purpose??'Household needs, repayment options and a 5C handoff.'}</span>
     {read.data?.application&&<span className={styles.amountPill}><Money value={read.data.application.requestedPrincipalCentavos}/> · {read.data.application.requestedTermMonths} {read.data.application.requestedTermMonths===1?'month':'months'}</span>}
    </div>
   </div>
   <Badge tone="neutral">{member?'Your application':'Authorized staff view'}</Badge>
  </header>
  <Disclosure/>
  {read.loading&&<p role="status">Opening authorized application information…</p>}
  {read.error&&<Notice tone="warning" role="alert">{read.error}</Notice>}
  {read.data&&<WorkspaceData key={materialBasis(read.data.view)} view={read.data.view} purpose={read.data.application.purpose} requested={read.data.application.requestedPrincipalCentavos} term={read.data.application.requestedTermMonths} member={member} client={client} csrf={csrf} refresh={read.refresh} onBlocked={setBlocked} officer={actor&&(actor.roles.includes('reviewer')||actor.roles.includes('officer')&&'assignedOfficerId' in read.data.application&&read.data.application.assignedOfficerId===actor.id)?actor.name:undefined}/>}
 </div>;
}
function WorkspaceData({view,purpose,requested,term,member,client,csrf,refresh,officer,onBlocked}:{view:View;purpose:string;requested:number;term:number;member:boolean;client:AgapClient;csrf:string;refresh:()=>void;officer?:string;onBlocked:(value:boolean)=>void}){
 const context=usePreview(),basis=materialBasis(view),initial=context.get(view.applicationId,basis)??defaultAssumptions(view);
 const [last,setLast]=useState(initial);
 const [run,setRun]=useState<{basis:string;assumptions:Assumptions;stage:number}|null>(null),[editing,setEditing]=useState(true);
 const [householdBusy,setHouseholdBusy]=useState(false),[uploadBusy,setUploadBusy]=useState(false);
 useEffect(()=>{onBlocked(householdBusy||uploadBusy);return()=>onBlocked(false);},[householdBusy,uploadBusy,onBlocked]);
 const result=useRef<HTMLHeadingElement>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const active=run?.basis===basis?run:null;
 useEffect(()=>{if(!active||active.stage>=steps.length)return;const delay=window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:650;timer.current=setTimeout(()=>setRun(old=>old?.basis===basis?{...old,stage:old.stage+1}:old),delay);return()=>{if(timer.current)clearTimeout(timer.current);};},[active,basis]);
 useEffect(()=>{if(active?.stage===steps.length){result.current?.scrollIntoView({block:'start'});result.current?.focus({preventScroll:true});}},[active?.stage]);
 function start(assumptions:Assumptions,share:boolean){if(householdBusy||uploadBusy)return;context.share(view.applicationId,share?{basis,assumptions}:null);setLast(assumptions);setEditing(false);setRun({basis,assumptions,stage:0});}

 const isResultsReady=active&&active.stage===steps.length;

 return <>
  {!isResultsReady&&<section className={`panel panel-body ${styles.request}`}><Description size={24}/><div><h2>{purpose}</h2><p><Money value={requested}/> requested · {term} {term===1?'month':'months'}</p></div><Badge>{member?'Your application':'Authorized staff view'}</Badge></section>}

  {isResultsReady&&<>
   <h2 ref={result} tabIndex={-1} className={styles.resultHeading}>Analysis and next steps</h2>
   <ReviewReport key={JSON.stringify(active.assumptions)} view={view} purpose={purpose} member={member} assumptions={active.assumptions} officer={officer} revise={()=>{setEditing(true);setRun(null);}}/>
  </>}

  {(editing||!active)&&<>
   {member&&<section className="panel panel-body"><HouseholdForm key={view.applicationId} view={view} client={client} csrf={csrf} member saved={refresh} onBusy={setHouseholdBusy} disabled={uploadBusy}/></section>}
   <section className="panel panel-body stack"><div className={styles.heading}><div><h2>Supporting documents</h2><p>Upload proofs of income or bills to support your application.</p></div><Badge>{view.sources.filter(s=>s.kind==='document').length} {view.sources.filter(s=>s.kind==='document').length===1?'file':'files'}</Badge></div>{member&&<WorkflowUpload id={view.applicationId} client={client} csrf={csrf} member saved={refresh} onBusy={setUploadBusy} disabled={householdBusy}/>}<div className={styles.sources}>{view.sources.filter(s=>s.kind==='document').map(s=><article key={s.id}><Description/><div><h3>{s.label}</h3><p>{s.state==='cleared'?'File checks passed':s.state==='blocked'?'File unavailable':'Received · awaiting file checks'}</p></div><Badge tone={s.state==='cleared'?'neutral':'warning'}>{s.verification==='supported'?'Verification recorded':'Not independently verified'}</Badge></article>)}</div>{!view.sources.some(s=>s.kind==='document')&&<p className="small subtle">No supporting files have been uploaded for this application yet.</p>}<p className="small subtle">{view.facts.length} saved financial statement{view.facts.length===1?'':'s'} · {view.drafts.filter(d=>d.state==='suggested').length} suggestion{view.drafts.filter(d=>d.state==='suggested').length===1?' awaits':'s await'} confirmation</p><Link to={member?`/member/applications/${view.applicationId}`:`/staff/applications/${view.applicationId}/evidence`}>Inspect original sources and confirmed facts</Link></section>
   <section className="panel panel-body"><ScenarioForm key={basis} initial={last} run={start} disabled={householdBusy||uploadBusy}/></section>
  </>}

  {active&&active.stage<steps.length&&<section className={`panel panel-body stack ${styles.processing}`} aria-label="Demonstration review processing"><div className={styles.heading}><FindInPage size={28}/><h2>Preparing your review</h2><Badge>Demo playback</Badge></div><p role="status">{steps[active.stage]}…</p><ol className={styles.progress}>{steps.map((step,i)=><li key={step} aria-current={i===active.stage?'step':undefined} data-complete={i<active.stage}><span>{i+1}</span>{step}<small>{i<active.stage?'Complete':i===active.stage?'In progress':'Next'}</small></li>)}</ol><div className="actions"><Button onClick={()=>setRun({...active,stage:steps.length})}>Show review now</Button><Button variant="secondary" onClick={()=>{setRun(null);setEditing(true);}}>Cancel review</Button></div></section>}

  {isResultsReady&&<details className={`panel panel-body ${styles.inputSectionDetails}`}>
   <summary className={styles.detailsSummary}>
    <div className={styles.summaryTitle}>
     <Description size={20}/>
     <div>
      <strong>Review inputs & supporting files</strong>
      <p className="small subtle">Household facts ({view.facts.length}) and documents ({view.sources.filter(s=>s.kind==='document').length})</p>
     </div>
    </div>
    <span className={styles.expandLabel}>View or edit</span>
   </summary>
   <div className="stack" style={{marginTop:'var(--space-4, 16px)'}}>
    {member&&<HouseholdForm key={view.applicationId} view={view} client={client} csrf={csrf} member saved={refresh} onBusy={setHouseholdBusy} disabled={uploadBusy}/>}
    <div className={styles.sources}>{view.sources.filter(s=>s.kind==='document').map(s=><article key={s.id}><Description/><div><h3>{s.label}</h3><p>{s.state==='cleared'?'File checks passed':s.state==='blocked'?'File unavailable':'Received · awaiting file checks'}</p></div><Badge tone={s.state==='cleared'?'neutral':'warning'}>{s.verification==='supported'?'Verification recorded':'Not independently verified'}</Badge></article>)}</div>
    <Link to={member?`/member/applications/${view.applicationId}`:`/staff/applications/${view.applicationId}/evidence`}>Inspect original sources and confirmed facts</Link>
   </div>
  </details>}
 </>;
}

type Row={application:z.output<typeof ApplicationSchema>;view:View|null;review:Review|null};
export function PreviewQueuePage(){const {session,client}=useStaff();if(!session||session.recordMode==='real'||!session.user.roles.some(r=>['officer','reviewer','auditor'].includes(r)))return <Notice>Analysis queue requires authorized lending-review access in the fictional environment.</Notice>;return <Queue key={`${session.user.id}:${session.csrfToken}`} client={client}/>;}
function Queue({client}:{client:AgapClient}){
 const shared=usePreview(),[rows,setRows]=useState<Row[]|null>(null),[error,setError]=useState(''),[revision,setRevision]=useState(0),[query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[asOf,setAsOf]=useState('');
 useEffect(()=>{const abort=new AbortController();let disposed=false;
  async function load(){try{const applications:z.output<typeof ApplicationSchema>[]=[];let cursor:string|undefined;const seen=new Set<string>();do{const page=await client.listApplications({signal:abort.signal,...(cursor?{cursor}:{})});applications.push(...page.items);if(applications.length>500)throw new Error('This preview supports at most 500 applications. Use the ordinary application workspace.');cursor=page.nextCursor??undefined;if(cursor&&seen.has(cursor))throw new Error('The application list changed. Refresh the queue.');if(cursor)seen.add(cursor);}while(cursor);
   const results:Row[]=[];const active=applications.filter(a=>a.status!=='draft'&&a.status!=='decision_recorded');
   for(let i=0;i<active.length;i+=4){const batch=await Promise.all(active.slice(i,i+4).map(async application=>{try{const view=await client.getStaffWorkflow(application.id,{signal:abort.signal});return {application,view,review:buildReview(view,shared.get(application.id,materialBasis(view))??defaultAssumptions(view))};}catch(problem){if(problem instanceof ApiClientError&&[403,404].includes(problem.status))return {application,view:null,review:null};throw problem;}}));results.push(...batch);}
   results.sort((a,b)=>a.review&&b.review?compareAttention({review:a.review,createdAt:a.application.createdAt,id:a.application.id},{review:b.review,createdAt:b.application.createdAt,id:b.application.id}):a.review?-1:b.review?1:a.application.id.localeCompare(b.application.id));
   if(!disposed){setRows(results);setAsOf(new Date().toLocaleString('en-PH',{timeZone:'Asia/Manila'}));}
  }catch(problem){if(!disposed&&!abort.signal.aborted)setError(problem instanceof Error?problem.message:'The queue could not be loaded.');}}
  void load();return()=>{disposed=true;abort.abort();};
 // Shared scenarios are read on explicit queue entry/refresh, never during a live paging read.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[client,revision]);
 const filtered=rows?.filter(r=>(filter==='all'||r.review?.priority===filter)&&`${r.application.memberName} ${r.application.purpose}`.toLowerCase().includes(query.toLowerCase()));
 function refresh(){setRows(null);setError('');setRevision(v=>v+1);}
 return <div className="stack"><header className={styles.heading}><div><h1>Application analysis queue</h1><p>Review the concern, its basis and the next officer action.</p></div><Button variant="secondary" disabled={!rows&&!error} onClick={refresh}>Refresh analysis queue</Button></header><Disclosure/><Notice>Suggested attention order uses current calculated cash pressure, clarification needs and original received time. It does not assign a default probability or replace the authoritative review/decision guards.</Notice><div className={styles.queueSummary}>{(['urgent','clarification','review','routine'] as const).map(key=><div key={key}><strong>{rows?.filter(r=>r.review?.priority===key).length??'—'}</strong><span>{priorityLabel[key]}</span></div>)}</div><div className={styles.two}><div className="field"><label htmlFor="preview-search">Find an application</label><input id="preview-search" type="search" value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="field"><label htmlFor="preview-filter">Attention needed</label><select id="preview-filter" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All active applications</option>{Object.entries(priorityLabel).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div></div>{error&&<Notice tone="warning" role="alert">{error} <Button variant="quiet" onClick={refresh}>Retry queue</Button></Notice>}{!rows&&!error&&<p role="status">Collecting authorized applications and their saved information…</p>}{rows&&<section className="panel"><div className="panel-header"><p>{filtered?.length} matching applications · {asOf} (Manila)</p></div><div className="table-scroll" tabIndex={0} role="region" aria-label="Analysis attention queue"><table className={styles.queue}><thead><tr><th scope="col">Order / member</th><th scope="col">Application</th><th scope="col">Attention and reason</th><th scope="col">Next step</th></tr></thead><tbody>{filtered?.map(row=><tr key={row.application.id}><th scope="row"><span className={styles.position}>#{rows.indexOf(row)+1}</span> {row.application.memberName}<p className="small subtle">Received {dateLabel(row.application.createdAt.slice(0,10))}</p></th><td><strong>{row.application.purpose}</strong><p><Money value={row.application.requestedPrincipalCentavos}/> · {row.application.requestedTermMonths} months</p></td><td>{row.review?<><Badge tone={row.review.priority==='urgent'?'danger':row.review.priority==='routine'?'brand':'warning'}>{priorityLabel[row.review.priority]}</Badge><p>{row.review.reason}</p><p className="small subtle">Preparing officer: {row.application.assignedOfficerId?'Assigned':'Awaiting assignment'}</p></>:<Notice>Evidence access or module unavailable. This is not a cleared application.</Notice>}</td><td>{row.review?<Link className={styles.queueLink} to={`/staff/applications/${row.application.id}/analysis`}><CompareArrows size={20}/> Open 5C review</Link>:<Link to="/staff/applications">Review assignment</Link>}</td></tr>)}</tbody></table></div>{!filtered?.length&&<p className="panel-body">No active applications match. New member submissions appear after refresh.</p>}</section>}</div>;
}
