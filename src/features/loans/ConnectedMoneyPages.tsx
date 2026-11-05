import {useCallback,useEffect,useMemo,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {Link,useParams} from 'react-router-dom';
import type {z} from 'zod';
import {schemas} from '../../../packages/contracts/src/schemas';
import {ApiClientError} from '../../../packages/api-client/src/transport';
import {useStaff} from '../access/StaffContext';
import {useCommand} from '../access/useCommand';
import {useUnsavedChanges} from '../access/useUnsavedChanges';
import {staffLoginHref} from '../access/staffLogin';
import {useResource} from '../member-portal/useResource';
import {Button,Money,Notice} from '../../shared/ui';
import {dateLabel} from '../../domain/format';
import StaffLoanPage from './StaffLoanPage';
import {connectedLoans} from './loan-gateway';

type Item=z.output<typeof schemas.ConnectedFinancialApplication>;
function denied(e:unknown){return e instanceof ApiClientError&&[401,403,404].includes(e.status);}
function Unavailable(){return <Notice>Connected fictional financial operations are unavailable for this account or configuration.</Notice>;}
function Gate({children}:{children:ReactNode}){const {session}=useStaff();return session?.connectedLending&&session.user.roles.some(r=>['cashier','financial_authorizer','auditor'].includes(r))?children:<Unavailable/>;}
function FinancialBoundary({children}:{children:(deny:()=>void)=>ReactNode}){const [blocked,setBlocked]=useState(false),fail=useCallback(()=>setBlocked(true),[setBlocked]);return blocked?<Unavailable/>:children(fail);}
export function ConnectedFinancialApplications(){const {session}=useStaff();return <Gate><FinancialBoundary key={`${session?.user.id}:${session?.csrfToken}`}>{fail=><FinancialList onDenied={fail}/>}</FinancialBoundary></Gate>;}
function FinancialList({onDenied}:{onDenied:()=>void}){
 const {client,session}=useStaff(),[items,setItems]=useState<Item[]>([]),[cursor,setCursor]=useState<string>();
 const load=useCallback(async(signal:AbortSignal)=>{try{const page=await client.getConnectedFinancialApplications({limit:25,...(cursor?{cursor}:{})},{signal});if(!signal.aborted)setItems(old=>[...new Map([...old,...page.items].map(x=>[x.applicationId,x])).values()]);return page;}catch(e){if(!signal.aborted&&denied(e))onDenied();throw e;}},[client,cursor,onDenied]);
 const read=useResource(load);
 if(!session?.user.roles.some(r=>r==='cashier'||r==='financial_authorizer'))return <Unavailable/>;
 return <div className="stack"><h1>Financial applications</h1><Notice>Fictional principal-only operations. Acceptance, settlement evidence and ledger posting are separate steps. These controls move no real funds.</Notice>{read.error&&<Notice role="alert" tone="warning">{read.error}</Notice>}{read.loading&&<p role="status">Loading financial applications…</p>}{!read.loading&&!items.length&&!read.error&&<p>No decided applications are available in your financial scope.</p>}<ul className="stack">{items.map(item=><li key={item.applicationId} className="panel panel-body stack"><h2>{item.memberName}</h2><p>{item.loanId?'A saved loan reference is available.':item.releaseBasisAvailable?'Current accepted terms are available.':'Current accepted terms are unavailable; release stays blocked.'}</p>{item.terms&&<p>Accepted principal: <Money value={item.terms.principalCentavos}/></p>}<Link to={`/staff/applications/${item.applicationId}/financial-workspace`}>Open financial application</Link></li>)}</ul><p role="status">Showing {items.length} financial applications.</p>{read.error&&<Button disabled={read.loading} onClick={read.refresh}>Retry financial applications</Button>}{read.data?.nextCursor&&<Button disabled={read.loading} onClick={()=>setCursor(read.data!.nextCursor!)}>Load more financial applications</Button>}</div>;
}
export function ConnectedFinancialApplication(){const {id}=useParams(),{session}=useStaff();return <Gate><FinancialBoundary key={`${session?.user.id}:${session?.csrfToken}:${id}`}>{fail=><FinancialApplication id={id!} onDenied={fail}/>}</FinancialBoundary></Gate>;}
type Attempt={kind:'originate'|'release';body:z.input<typeof schemas.FinancialCommandCreate>|z.input<typeof schemas.OriginationCreate>;csrf:string};
type Saved={kind:'originate'|'release';loanId:string};
function FinancialApplication({id,onDenied}:{id:string;onDenied:()=>void}){
 const {client,session}=useStaff(),[method,setMethod]=useState<'cash'|'bank'>('cash'),[day,setDay]=useState(''),[reference,setReference]=useState(''),[reason,setReason]=useState(''),[saved,setSaved]=useState<Saved|null>(null);
 const fail=useCallback((e:unknown)=>{if(denied(e))onDenied();},[onDenied]);
 const load=useCallback(async(signal:AbortSignal)=>{try{return await client.getConnectedFinancialApplication(id,{signal});}catch(e){if(!signal.aborted)fail(e);throw e;}},[client,id,fail]),read=useResource(load);
 const loanId=read.data?.loanId??null,loadLoan=useCallback(async(signal:AbortSignal)=>{if(!loanId)return null;try{return await client.getConnectedLoanWorkspace(loanId,{asOfDate:read.data!.asOfDate},{signal});}catch(e){if(!signal.aborted)fail(e);throw e;}},[client,loanId,read.data,fail]),loan=useResource(loadLoan);
 const command=useCommand<Attempt,Saved>(),locked=command.saving||command.uncertain,heading=useRef<HTMLHeadingElement>(null);
 useUnsavedChanges(Boolean(reason||reference)||locked,command.uncertain);
 useEffect(()=>{if(saved)heading.current?.focus();},[saved]);
 async function send(kind:'originate'|'release',event?:FormEvent){
  event?.preventDefault();if(!read.data||command.saving)return;
  if(!command.uncertain&&(read.loading||read.error||!read.data.releaseBasisAvailable))return;
  const data=read.data,body=kind==='originate'?{method}:data.loanId&&data.terms?{loanId:data.loanId,amountCentavos:data.terms.principalCentavos,currency:'PHP' as const,effectiveDate:day||data.asOfDate,method,instrumentReference:reference,reason}:null;if(!body)return;
  if(!command.uncertain)setSaved(null);
  const result=await command.submit({kind,body,csrf:session!.csrfToken},async(a,key)=>{
   const options={csrfToken:a.csrf,idempotencyKey:key};try{
    if(a.kind==='originate'){const r=await client.createPendingOrigination(id,schemas.OriginationCreate.parse(a.body),options);return {kind:a.kind,loanId:r.id};}
    const r=await client.prepareConnectedDisbursement(schemas.FinancialCommandCreate.parse(a.body).loanId,schemas.FinancialCommandCreate.parse(a.body),options);return {kind:a.kind,loanId:r.loanId};
   }catch(e){fail(e);throw e;}
  });
  if(result){setSaved(result);setReason('');setReference('');read.refreshKeepingData();loan.refreshKeepingData();}
 }
 const data=read.data,cashier=session?.user.roles.includes('cashier'),hasRelease=loan.data?.commands.some(c=>c.kind==='disbursement');
 return <div className="stack"><Link to="/staff/financial-applications">Back to financial applications</Link><h1>Financial application</h1><Notice>Fictional principal-only product. Creating a pending loan or preparing a command does not release funds or create an active balance.</Notice>{read.loading&&<p role="status">Loading current accepted terms…</p>}{read.error&&<Notice tone="warning" role="alert">{read.error}</Notice>}{command.error&&<Notice tone="warning" role="alert">{command.error}</Notice>}{saved&&<section className="panel panel-body stack"><h2 ref={heading} tabIndex={-1}>{saved.kind==='originate'?'Pending loan created':'Release command prepared'}</h2><p>{saved.kind==='originate'?'No release has been posted.':'Separate authorization, recorded settlement and atomic posting are still required.'}</p><Link to={`/staff/loans/${saved.loanId}`}>Open saved loan and payments</Link></section>}{command.uncertain&&<Button disabled={command.saving} onClick={()=>void send(data?.loanId?'release':'originate')}>Retry same financial submission</Button>}
 <Button variant="secondary" disabled={locked} onClick={()=>{read.refreshKeepingData();loan.refreshKeepingData();}}>Refresh financial status</Button>
 {data&&<section className="panel panel-body stack"><h2>{data.memberName}</h2><p>{data.releaseBasisAvailable?'Current accepted terms are available for financial checks.':'Current accepted terms are unavailable. Existing posted history remains preserved.'}</p>{data.terms&&<p>Accepted principal: <Money value={data.terms.principalCentavos}/> · {data.terms.label}</p>}{data.loanId&&<Link to={`/staff/loans/${data.loanId}`}>Open loan and payments</Link>}
 {!data.loanId&&cashier&&<form className="stack" onSubmit={e=>void send('originate',e)}><div className="field"><label htmlFor="connected-origin-method">Fictional origination method</label><select id="connected-origin-method" disabled={locked} value={method} onChange={e=>setMethod(e.target.value as typeof method)}><option value="cash">Cash simulation</option><option value="bank">Bank simulation</option></select></div><Button type="submit" disabled={locked||read.loading||!!read.error||!data.releaseBasisAvailable}>Create pending loan</Button></form>}
 {loan.error&&<Notice role="alert" tone="warning">{loan.error}</Notice>}
 {data.loanId&&cashier&&!hasRelease&&<form className="stack" onSubmit={e=>void send('release',e)}><h2>Prepare simulated release</h2><p>Exact accepted principal: {data.terms?<Money value={data.terms.principalCentavos}/>: 'Unavailable'}. The date today is {dateLabel(data.asOfDate)}.</p><fieldset className="stack" disabled={locked}><div className="field"><label htmlFor="connected-release-date">Release effective date</label><input id="connected-release-date" type="date" required value={day||data.asOfDate} onChange={e=>setDay(e.target.value)}/></div><div className="field"><label htmlFor="connected-release-method">Fictional release method</label><select id="connected-release-method" value={method} onChange={e=>setMethod(e.target.value as typeof method)}><option value="cash">Cash simulation</option><option value="bank">Bank simulation</option></select></div><div className="field"><label htmlFor="connected-instrument">Fictional instrument reference</label><input id="connected-instrument" required maxLength={160} value={reference} onChange={e=>setReference(e.target.value)}/></div><div className="field"><label htmlFor="connected-release-reason">Release preparation reason</label><textarea id="connected-release-reason" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></div></fieldset><Button type="submit" disabled={locked||read.loading||!!read.error||loan.loading||!!loan.error||!data.releaseBasisAvailable||!data.terms}>Prepare release command</Button></form>}
 {hasRelease&&<Notice>The original release command is preserved. Open the saved loan to review or complete that command.</Notice>}
 </section>}<p><a href={staffLoginHref(`/staff/applications/${id}/financial-workspace`,true)}>Sign in with fresh MFA</a> for a sensitive financial action. The preparer and authorizer must be different people.</p></div>;
}
export function ConnectedLoanPage(){
 const {id}=useParams(),{client}=useStaff(),gateway=useMemo(()=>connectedLoans(client),[client]);
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 return <Gate><div className="stack"><Link to="/staff/financial-applications">Back to financial applications</Link><StaffLoanPage loanId={id!} day={day} gateway={gateway}/></div></Gate>;
}
