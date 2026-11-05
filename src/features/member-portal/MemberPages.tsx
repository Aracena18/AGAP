import { useCallback,useEffect,useRef,useState,type FormEvent } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
import type { z } from 'zod';
import { schemas } from '../../../packages/contracts/src/schemas';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { useMember } from './MemberContext';
import { useResource } from './useResource';
import { useCommand } from '../access/useCommand';
import { usePage } from '../access/usePage';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { parsePesoInput } from '../../domain/evidence';
import { dateLabel } from '../../domain/format';
import { Badge,Button,Money,Notice } from '../../shared/ui';
import { Gabay } from '../../shared/ui/Gabay';
import { ArrowForward } from '../../shared/icons';
import { CommandError,ReadState } from './MemberFeedback';
import {SupportCheckIn,emptyCheckIn} from '../monitoring/SupportCheckIn';
import {MemberSupportHistory} from './MemberSupportHistory';
import { MemberWorkflow } from '../workflow/WorkflowPanel';
import { PilotMemberDecisionPanel } from '../pilot/PilotMemberDecisionPanel';
import { DecisionPanel } from './ReviewPanels';
import styles from './MemberApp.module.css';
type Output<K extends keyof typeof schemas>=z.output<(typeof schemas)[K]>;
export const statusLabel:Record<Output<'MemberApplication'>['status'],string>={draft:'Draft',submitted:'Submitted for review',evidence_review:'Information review',clarification:'More information requested',assessment_ready:'Options ready',recommended:'With a reviewer',decision_recorded:'Decision recorded'};
const nextStep:Record<Output<'MemberApplication'>['status'],string>={draft:'Review your saved details, then submit when you are ready.',submitted:'The cooperative will review your request. Check here for updates.',evidence_review:'The cooperative is checking your information. You can view your supporting records below.',clarification:'Open your application to check what information the cooperative needs.',assessment_ready:'Review the available options and their full costs.',recommended:'Your request is with a reviewer. Check here for the recorded decision.',decision_recorded:'Read the recorded decision and any terms that need your response.'};
export function HomePage(){
  const {session,client}=useMember();
  const loadLoans=useCallback((signal:AbortSignal)=>client.listMemberLoans({signal}),[client]),loans=useResource(loadLoans);
  const loadApplications=useCallback((signal:AbortSignal)=>client.listMemberApplications({signal}),[client]),applications=useResource(loadApplications);
  const recent=applications.data?.items.slice().sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id))[0];
  const scheduled=loans.data?.state==='available'?loans.data.data.filter(loan=>loan.nextPayment).sort((a,b)=>a.nextPayment!.date.localeCompare(b.nextPayment!.date)||a.id.localeCompare(b.id)):[];
  const next=scheduled[0];
  const noApplications=applications.data?.items.length===0;
  const noLoans=loans.data?.state==='available'&&loans.data.data.length===0;
  const actions=[['/member/apply','Apply for a loan','Save a request for review'],['/member/applications','Track my application','Check progress and next steps'],['/member/loans','View my loan','Schedule and payment records'],['/member/help','Get payment help','Talk to the cooperative']];
  return <div className="stack">
    <section className={styles.homeWelcome}><div className={styles.intro}><p>Welcome, {session!.principal.displayName}.</p><h1>Your member account</h1></div><Gabay className={styles.homeArt}/></section>
    <div className={styles.homeOverview}>
      {!noLoans&&<section className={`panel panel-body ${styles.overview} ${next?styles.leadPayment:''}`} aria-label="Upcoming payments">
        <h2>{next?'Next payment':'Upcoming payments'}</h2><ReadState {...loans}/>
        {loans.data?.state==='unavailable'?<p>{loans.data.message}</p>:next?<><p className={styles.paymentAmount}><Money value={next.nextPayment!.amountCentavos}/></p><p>Due {dateLabel(next.nextPayment!.date)} · {next.label}</p><p className={styles.recordDate}>Position as of {dateLabel(next.position.asOfDate)}</p>{next.position.pendingMovementCount>0&&<p className={styles.recordDate}>Pending transactions are not included as confirmed payments.</p>}</>:loans.data?.state==='available'?<p>No next payment is shown in your current loan records.</p>:null}
        {loans.data&&<Link className={styles.link} to="/member/loans">View loan details and reminder settings <ArrowForward size={18}/></Link>}
      </section>}
      <section className={`panel panel-body ${styles.overview}`} aria-label="Recent application"><h2>{noApplications?'Your first application':'Your application'}</h2><ReadState {...applications}/>
        {recent&&<><Badge tone={recent.status==='clarification'?'warning':'neutral'}>{statusLabel[recent.status]}</Badge><h3 className={styles.applicationPurpose}>{recent.purpose}</h3><p>{nextStep[recent.status]}</p><p className="small subtle">Saved {dateLabel(recent.updatedAt)}</p><Link className={styles.link} to={`/member/applications/${recent.id}`}>{recent.status==='draft'?'Continue your draft':'View application'} <ArrowForward size={18}/></Link></>}
        {noApplications&&<><p>Start with the amount you need and what it is for. You can save a draft before sending it for review.</p><Link className={styles.primaryLink} to="/member/apply">Apply for a loan <ArrowForward size={18}/></Link></>}
      </section>
    </div>
    <section className={styles.homeTasks} aria-label="Member actions"><h2>What would you like to do?</h2><div className={styles.actions}>{actions.filter(([to])=>!noApplications||to!=='/member/apply').map(([to,title,detail])=><Link className={styles.action} to={to} key={to}><span><strong>{title}</strong><small>{detail}</small></span><ArrowForward size={20}/></Link>)}</div></section>
  </div>;
}
export function ApplicationsPage(){
  const {client}=useMember(),load=useCallback((options:RequestOptions)=>client.listMemberApplications(options),[client]),page=usePage(load);
  return <div className="stack"><div className="page-heading"><div><h1>My applications</h1><p>Drafts and submitted requests, saved to your account.</p></div><Link className={styles.primaryLink} to="/member/apply">Apply for a loan</Link></div><ReadState {...page}/>{page.items.length>0?<section className="panel" aria-label="Your applications">{page.items.map(item=><article className={styles.record} key={item.id}><div><h2>{item.purpose}</h2><p><Money value={item.requestedPrincipalCentavos}/> requested · {item.requestedTermMonths} months</p><p className="small subtle">Updated {dateLabel(item.updatedAt)}</p></div><Badge tone={item.status==='clarification'?'warning':'neutral'}>{statusLabel[item.status]}</Badge><Link className={styles.link} to={`/member/applications/${item.id}`}>View application <ArrowForward size={18} aria-hidden="true"/></Link></article>)}</section>:!page.loading&&!page.error?<section className={`panel panel-body ${styles.emptyState}`}><Gabay empty/><div><h2>No applications yet</h2><p>You can save a draft before submitting it for review.</p></div></section>:null}{page.hasMore&&<Button variant="secondary" disabled={page.loading} onClick={()=>void page.more()}>Load more applications</Button>}</div>;
}
const inputAmount=(value:number)=>`${Math.trunc(value/100)}.${String(value%100).padStart(2,'0')}`;
export function ApplicationFormPage(){
  const {id}=useParams(),{client}=useMember(),load=useCallback((signal:AbortSignal)=>id?client.getMemberApplication(id,{signal}):Promise.resolve(null),[client,id]),read=useResource(load);
  return <div className={`stack ${styles.narrow}`}><ReadState {...read}/>{(!id||read.data)&&(!read.data||read.data.status==='draft')?<ApplicationForm key={read.data?.id??'new'} initial={read.data??undefined}/>:read.data?<Notice>This application has already been submitted. <Link to={`/member/applications/${id}`}>Return to the request</Link> to see its progress.</Notice>:null}</div>;
}
function ApplicationForm({initial}:{initial?:Output<'MemberApplication'>}){
  const {client,session}=useMember(),navigate=useNavigate(),command=useCommand<Output<'MemberApplicationCreate'>|Output<'ApplicationUpdate'>,Output<'MemberApplication'>>();
  const [purpose,setPurpose]=useState(initial?.purpose??''),[amount,setAmount]=useState(initial?inputAmount(initial.requestedPrincipalCentavos):''),[term,setTerm]=useState(String(initial?.requestedTermMonths??12)),[consent,setConsent]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
  const allowSavedNavigation=useUnsavedChanges(dirty||command.uncertain,command.uncertain);
  async function save(event:FormEvent){
    event.preventDefault();setError('');let principal:number;
    try{principal=parsePesoInput(amount);if(principal<=0)throw new Error();}catch{setError('Enter a positive PHP amount with no more than two decimal places.');return;}
    const base={purpose,requestedPrincipalCentavos:principal,requestedTermMonths:Number(term),currency:'PHP' as const};
    const saved=await command.submit(initial?base:{...base,noticeVersion:session!.privacyNoticeVersion,noticeAcknowledged:consent as true},(body,key)=>initial?client.updateMemberApplication(initial.id,body,{version:initial.version,idempotencyKey:key,csrfToken:session!.csrfToken}):client.createMemberApplication(body as Output<'MemberApplicationCreate'>,{idempotencyKey:key,csrfToken:session!.csrfToken}));
    if(saved){allowSavedNavigation();setDirty(false);navigate(`/member/applications/${saved.id}`,{replace:true});}
  }
  return <><div className={styles.intro}><h1>{initial?'Edit your draft':'Apply for a loan'}</h1><p>Save your requested terms first. You will review the draft before sending it to the cooperative.</p></div><section className="panel panel-body"><form className={styles.form} onSubmit={event=>void save(event)} onChange={()=>setDirty(true)}><CommandError error={error||command.error} fields={command.fields}/><fieldset disabled={command.saving||command.uncertain} className={styles.fields}><legend className="sr-only">Requested loan details</legend>
    <div className={`field ${styles.full}`}><label htmlFor="member-purpose">What is the loan for?</label><input id="member-purpose" required minLength={3} maxLength={1000} value={purpose} onChange={e=>setPurpose(e.target.value)}/></div>
    <div className="field"><label htmlFor="member-amount">Requested amount (PHP)</label><input id="member-amount" required inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value)} aria-invalid={Boolean(error)} aria-describedby="member-amount-help"/><p id="member-amount-help" className="small subtle">Use pesos and centavos, e.g. 1500.25.</p></div>
    <div className="field"><label htmlFor="member-term">Requested term (months)</label><input id="member-term" required type="number" min={1} max={600} step={1} value={term} onChange={e=>setTerm(e.target.value)} aria-describedby="member-term-help"/><p id="member-term-help" className="small subtle">Requested terms are subject to review.</p></div>
    {!initial&&<label className={`${styles.check} ${styles.full}`}><input required type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/>I understand that this information will be shared with the cooperative to review my request. Saving a draft does not approve a loan.</label>}</fieldset><div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Saving…':command.uncertain?'Retry same submission':'Save draft'}</Button>{!command.uncertain&&<Link className={styles.link} to="/member/applications">Cancel</Link>}</div></form></section></>;
}
export function ApplicationPage(){
  const {id}=useParams(),{client,session}=useMember(),load=useCallback((signal:AbortSignal)=>client.getMemberApplication(id!,{signal}),[client,id]),read=useResource(load);
  const command=useCommand<Output<'MemberSubmit'>,Output<'MemberApplication'>>(),[reviewed,setReviewed]=useState(false);
  useUnsavedChanges(command.uncertain,command.uncertain);
  async function submit(event:FormEvent){event.preventDefault();const record=read.data!;const saved=await command.submit({noticeVersion:session!.privacyNoticeVersion,acknowledgment:reviewed as true},(body,key)=>client.submitMemberApplication(record.id,body,{version:record.version,idempotencyKey:key,csrfToken:session!.csrfToken}));if(saved){setReviewed(false);read.refresh();}}
  return <div className="stack"><Link className={styles.link} to="/member/applications">Back to my applications</Link><ReadState {...read}/>{read.data&&<><div className={styles.intro}><p className="eyebrow">{statusLabel[read.data.status]}</p><h1>{read.data.purpose}</h1><p>{read.data.status==='draft'?'Your draft is saved. Review it before submitting.':read.data.status==='submitted'?'Your request has been submitted. The cooperative will review the information and contact you if needed.':nextStep[read.data.status]}</p></div><section className="panel panel-body stack"><h2>Your requested terms</h2><dl className={styles.summary}><div><dt>Requested amount</dt><dd><Money value={read.data.requestedPrincipalCentavos}/></dd></div><div><dt>Requested term</dt><dd>{read.data.requestedTermMonths} months</dd></div><div><dt>Status</dt><dd>{statusLabel[read.data.status]}</dd></div><div><dt>Last saved</dt><dd>{dateLabel(read.data.updatedAt)}</dd></div></dl><p className="small subtle">These are requested terms. Approval, an offered schedule and your acceptance are separate steps.</p>
    {read.data.status==='draft'&&<form className={styles.form} onSubmit={e=>void submit(e)}><CommandError error={command.error} fields={command.fields}/><label className={styles.check}><input required disabled={command.saving||command.uncertain} type="checkbox" checked={reviewed} onChange={e=>setReviewed(e.target.checked)}/>I reviewed my requested amount, term and purpose.</label><div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Submitting…':command.uncertain?'Retry same submission':'Submit application'}</Button>{!command.uncertain&&<Link className={styles.link} to={`/member/applications/${id}/edit`}>Edit draft</Link>}</div></form>}</section>
    <MemberWorkflow record={read.data} changed={read.refreshKeepingData}/>{session!.fictionalPilot?<PilotMemberDecisionPanel applicationId={read.data.id} revision={read.data.version} changed={read.refreshKeepingData}/>:<DecisionPanel record={read.data} changed={read.refreshKeepingData}/>}</>}</div>;
}
export function LoansPage(){
  const {client,session}=useMember(),load=useCallback((signal:AbortSignal)=>client.listMemberLoans({signal}),[client]),read=useResource(load),prefLoad=useCallback((signal:AbortSignal)=>client.getReminderPreferences({signal}),[client]),preferences=useResource(prefLoad);
  const command=useCommand<Output<'ReminderPreferenceUpdate'>,Output<'ReminderPreferences'>>(),[saved,setSaved]=useState('');
  async function toggle(){const pref=preferences.data!;const result=await command.submit({noticesEnabled:!pref.noticesEnabled},(body,key)=>client.updateReminderPreferences(body,{version:pref.version,idempotencyKey:key,csrfToken:session!.csrfToken}));if(result){setSaved('Reminder preferences saved. Your payment dates are unchanged.');preferences.refresh();}}
  return <div className="stack"><div className={styles.intro}><h1>My loans</h1><p>Your posted loan information and agreed schedule.</p></div><ReadState {...read}/>{read.data?.state==='unavailable'?<Notice tone="warning">{read.data.message}</Notice>:read.data?.state==='available'&&<>{read.data.data.length===0?<section className="panel panel-body"><h2>No loans recorded</h2><p>No loans are currently shown for your account.</p></section>:read.data.data.map(loan=><section className={`panel panel-body ${styles.section}`} key={loan.id}><h2>{loan.label}</h2><Badge>{loan.status.replaceAll('_',' ')}</Badge><dl className={styles.summary}><div><dt>Next scheduled payment</dt><dd className={styles.loanPayment}>{loan.nextPayment?<><Money value={loan.nextPayment.amountCentavos}/><span className="small subtle">{dateLabel(loan.nextPayment.date)}</span></>:'No next payment shown'}</dd></div><div><dt>Outstanding principal</dt><dd><Money value={loan.position.principalCentavos}/></dd></div><div><dt>Position as of</dt><dd>{dateLabel(loan.position.asOfDate)}</dd></div><div><dt>Pending movements</dt><dd>{loan.position.pendingMovementCount}</dd></div></dl><p className="small subtle">Posted through {dateLabel(loan.position.postedThrough)}. Pending movements are not included as confirmed payments.</p><details><summary>View payment schedule</summary><div className="table-scroll" tabIndex={0} role="region" aria-label={`${loan.label} schedule`}><table><caption>Agreed payment schedule</caption><thead><tr><th scope="col">Due date</th><th scope="col" className="numeric">Amount</th></tr></thead><tbody>{loan.schedule.map((p,index)=><tr key={index}><td>{dateLabel(p.date)}</td><td className="numeric"><Money value={p.amountCentavos}/></td></tr>)}</tbody></table></div></details><details><summary>View payment receipts</summary>{loan.receipts.length?loan.receipts.map(receipt=><article key={receipt.id}><p>{dateLabel(receipt.paidOn)} · <Money value={receipt.amountCentavos}/></p><p className="small">Receipt {receipt.reference}</p></article>):<p>No posted receipts are shown.</p>}</details><Link className={styles.link} to="/member/help">Ask for payment help</Link></section>)}</>}
    <section className="panel panel-body stack"><h2>Reminder settings</h2><ReadState {...preferences}/><CommandError error={command.error}/>{saved&&<Notice role="status">{saved}</Notice>}{preferences.data&&<><p>In-account reminders are {preferences.data.noticesEnabled?'on':'off'}. This preference does not change your agreed due dates or pause charges.</p><Button variant="secondary" disabled={command.saving} onClick={()=>void toggle()}>{command.uncertain?'Retry same submission':preferences.data.noticesEnabled?'Turn reminders off':'Turn reminders on'}</Button></>}</section></div>;
}
export function HelpPage(){
  const {session}=useMember();
  if(!session)return <Notice>Sign in to your member account to view payment help.</Notice>;
  return <HelpAccessBoundary key={session.principal.memberId+':'+session.expiresAt}/>;
}
function HelpAccessBoundary(){
  const [denied,setDenied]=useState(false);
  const deny=useCallback(()=>setDenied(true),[setDenied]);
  return denied?<Notice tone="warning">Your support history is no longer available for this account. Reload or sign in again.</Notice>:<HelpWorkspace onAccessDenied={deny}/>;
}
function HelpWorkspace({onAccessDenied}:{onAccessDenied:()=>void}){
  const [checkIn,setCheckIn]=useState(emptyCheckIn),[loanId,setLoanId]=useState('');
  const {client,session}=useMember(),[historyRevision,setHistoryRevision]=useState(0);
  const loadLoans=useCallback((signal:AbortSignal)=>client.listMemberLoans({signal}),[client]),loans=useResource(loadLoans);
  const [message,setMessage]=useState(''),[contact,setContact]=useState<'portal'|'phone'>('portal'),[preview,setPreview]=useState(false),[share,setShare]=useState(false),[saved,setSaved]=useState('');
  const command=useCommand<Output<'MemberSupportCreate'>,Output<'MemberSupport'>>();
  const previewHeading=useRef<HTMLHeadingElement>(null),messageInput=useRef<HTMLTextAreaElement>(null),wasPreview=useRef(false);
  useEffect(()=>{
    if(preview)previewHeading.current?.focus();
    else if(wasPreview.current)messageInput.current?.focus();
    wasPreview.current=preview;
  },[preview]);
  useUnsavedChanges((Boolean(message)||Boolean(loanId)||Object.values(checkIn).some(v=>v!=='unavailable'))&&!saved||command.uncertain,command.uncertain);
  async function send(event:FormEvent){
    event.preventDefault();const result=await command.submit({loanId:loanId||null,checkIn,message,contactPreference:contact,sharingConfirmed:share as true,noticeVersion:session!.privacyNoticeVersion},(body,key)=>client.createMemberSupport(body,{idempotencyKey:key,csrfToken:session!.csrfToken}));
    if(result){setSaved('Your payment-help request was sent for staff review. Your current payment terms remain unchanged.');setMessage('');setCheckIn(emptyCheckIn());setLoanId('');setPreview(false);setShare(false);setHistoryRevision(value=>value+1);}
  }
  return <div className={`stack ${styles.narrow}`}><div className={styles.intro}><h1>Get payment help</h1><p>If your income or essential needs changed, tell the cooperative what you would like help with.</p></div><Notice>A request does not pause payments, interest or fees. Staff will review the available options with you.</Notice>{saved&&<Notice tone="success" role="status">{saved}</Notice>}<section className="panel panel-body"><form className={styles.form} onSubmit={e=>{if(preview)void send(e);else{e.preventDefault();setShare(false);setPreview(true);setSaved('');}}}><CommandError error={command.error} fields={command.fields}/>{preview?<><h2 ref={previewHeading} tabIndex={-1}>Review what will be shared</h2><div className={styles.source}><p>{message}</p></div><SupportCheckIn value={checkIn} onChange={value=>{setCheckIn(value);setSaved('');}} preview/><p>Linked loan: {loanId?(loans.data?.state==='available'?loans.data.data.find(loan=>loan.id===loanId)?.label:'')||'Selected loan':'No loan selected'}</p><p>Cooperative support staff will receive this message and your account reference to review your request. Your preferred response is {contact==='portal'?'in this account':'by phone'}.</p><label className={styles.check}><input required disabled={command.saving||command.uncertain} type="checkbox" checked={share} onChange={e=>setShare(e.target.checked)}/>I agree to send this message for staff review.</label></>:<fieldset disabled={command.saving||command.uncertain} className="stack"><legend className="sr-only">Payment help request</legend><div className="field"><label htmlFor="help-message">What changed, and what help do you need?</label><textarea ref={messageInput} id="help-message" required minLength={1} maxLength={2000} value={message} onChange={e=>{setMessage(e.target.value);setSaved('');}}/><p className="small subtle">Share only the details needed for staff to help. You can ask for a conversation without describing a sensitive emergency.</p></div><div className="field"><label htmlFor="help-contact">Preferred response</label><select id="help-contact" value={contact} onChange={e=>setContact(e.target.value as 'portal'|'phone')}><option value="portal">In my account</option><option value="phone">Phone call</option></select></div><div className={styles.optionalDetails}><div className="field"><label htmlFor="help-loan">Related loan (optional)</label><select id="help-loan" value={loanId} onChange={e=>{setLoanId(e.target.value);setSaved('');}}><option value="">General help request</option>{loans.data?.state==='available'&&loans.data.data.map(loan=><option key={loan.id} value={loan.id}>{loan.label}</option>)}</select>{(loans.error||loans.data?.state==='unavailable')&&<p className="small subtle">Loan information is unavailable. You can still send a general help request.</p>}</div><SupportCheckIn value={checkIn} onChange={value=>{setCheckIn(value);setSaved('');}}/></div></fieldset>}<div className="actions"><Button type="submit" disabled={command.saving}>{command.saving?'Sending…':command.uncertain?'Retry same submission':preview?'Send request':'Review request'}</Button>{preview&&!command.uncertain&&<Button variant="secondary" disabled={command.saving} onClick={()=>{setShare(false);setPreview(false);}}>Edit message</Button>}</div></form></section><MemberSupportHistory key={historyRevision} blocked={command.saving||command.uncertain} onAccessDenied={onAccessDenied}/></div>;
}
