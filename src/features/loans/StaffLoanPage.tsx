import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import { ConnectedLoanWorkspace as LoanWorkspaceSchema } from '../../../packages/contracts/src/schemas';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { useStaff, type StaffSession } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Badge, Button, Money, Notice } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import { ReceiptBrief } from '../payments/ReceiptBrief';
import { unavailableLoans, type LoanGateway, type LoanWorkspace, type MoneyAction } from './loan-gateway';
import styles from './loans.module.css';

type Attempt = { loanId: string; csrf: string; input: Parameters<LoanGateway['act']>[1] };
const Result = z.strictObject({ recorded: z.literal(true) });
export default function StaffLoanPage({ loanId, day, gateway = unavailableLoans }: { loanId: string; day: string; gateway?: LoanGateway }) {
  const { session } = useStaff();
  if (!session) return <Notice>Sign in to inspect a loan.</Notice>;
  return <StaffLoanWorkspace loanId={loanId} day={day} gateway={gateway} session={session}/>;
}
/** Injection is a test/composition boundary, not authentication. */
export function StaffLoanWorkspace(props: { loanId: string; day: string; session: StaffSession; gateway?: LoanGateway }) {
  if (!props.session.user.roles.some(r => ['cashier', 'financial_authorizer', 'auditor'].includes(r))) return <Notice>This account has no loan servicing role.</Notice>;
  const u = props.session.user;
  return <Controller key={`${props.loanId}:${props.day}:${u.id}:${u.organizationId}:${u.branchIds.join(',')}:${u.roles.join(',')}:${props.session.csrfToken}`} {...props}/>;
}
function Controller({ loanId, day, session, gateway = unavailableLoans }: { loanId: string; day: string; session: StaffSession; gateway?: LoanGateway }) {
  const [epoch, setEpoch] = useState(0), [resource, setResource] = useState<{ epoch: number; gateway: LoanGateway; value?: LoanWorkspace; error?: string }>();
  const [reason, setReason] = useState(''), [selected, setSelected] = useState(''), [notice, setNotice] = useState(''), [denied, setDenied] = useState(false),[method,setMethod]=useState<'cash'|'bank'>('cash');
  const command = useCommand<Attempt, { recorded: true }>(), attempt = useRef<Attempt | null>(null), errorRef = useRef<HTMLDivElement>(null);
  const locked = command.saving || command.uncertain;
  useUnsavedChanges(Boolean(reason) || locked, command.uncertain);
  const current = resource?.epoch === epoch && resource.gateway === gateway;
  const view = current ? resource.value : undefined;
  useEffect(() => {
    const abort = new AbortController();
    gateway.workspace(loanId, day, abort.signal).then(raw => {
      const value = LoanWorkspaceSchema.parse(raw);
      if (abort.signal.aborted) return;
      if (value.loanId !== loanId || value.organizationId !== session.user.organizationId || !session.user.branchIds.includes(value.branchId)
        || value.position && value.position.asOfDate !== day) throw new ApiClientError(503, 'invalid_response', 'The loan projection could not be verified.');
      setResource({ epoch, gateway, value });
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) {
        if (error instanceof ApiClientError && [401, 403].includes(error.status)) setDenied(true);
        setResource({ epoch, gateway, error: error instanceof Error ? error.message : 'The loan view is unavailable.' });
      }
    });
    return () => abort.abort();
  }, [loanId, day, epoch, gateway, session.user.organizationId, session.user.branchIds]);
  useEffect(() => { if (command.error) errorRef.current?.focus(); }, [command.error]);
  async function execute(action: MoneyAction, id: string | null, version: number | null) {
    if (!reason.trim() || locked && !command.uncertain) { setNotice('Record a reason before requesting a financial action.'); return; }
    setNotice('');
    if(action==='prepare_repayment'&&!view?.nextPayment){setNotice('The next scheduled payment is unavailable. Refresh the saved position.');return;}
    const body: Attempt = { loanId, csrf: session.csrfToken, input: { action, commandId: id, version, reason: reason.trim(),...(action==='prepare_repayment'&&view?.nextPayment?{scheduledPayment:{...view.nextPayment,method}}:{}) } };
    if (!command.uncertain) attempt.current = body;
    const result = await command.submit(attempt.current ?? body, async (saved, key) => {
      try { return Result.parse(await gateway.act(saved.loanId, saved.input, { csrfToken: saved.csrf, idempotencyKey: key })); }
      catch (error) { if (error instanceof ApiClientError && [401, 403].includes(error.status)) setDenied(true); throw error; }
    });
    if (result) { setReason(''); setNotice('Action recorded. Refreshing the saved financial position.'); setEpoch(e => e + 1); }
  }
  if (denied) return <div className="no-print"><Notice tone="danger" role="alert">Loan information is unavailable to the current account. Sign in again or contact the servicing owner.</Notice></div>;
  const cashier = session.user.roles.includes('cashier'), authorizer = session.user.roles.includes('financial_authorizer');
  const receipts = view?.position?.receipts ?? [], receipt = receipts.find(r => r.receiptId === selected);
  return <div className={styles.page}><header className="page-heading no-print"><div><h1>Loan and payments</h1><p>{view?.memberLabel ?? loanId}</p></div><Button variant="secondary" disabled={locked} onClick={() => setEpoch(e => e + 1)}>Refresh saved position</Button></header>
    <div className="no-print">{!current && <p role="status">Loading loan position…</p>}{current && resource.error && <Notice role="alert" tone="warning">{resource.error}</Notice>}
      {notice && <Notice role="status">{notice}</Notice>}{command.error && <div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{command.error}</Notice></div>}
      {command.uncertain && <div><p>The action may already have completed. Retry the original submission before starting another. Reloading loses the in-memory retry details.</p><Button onClick={() => { const a = attempt.current; if (a) void execute(a.input.action, a.input.commandId, a.input.version); }}>Retry same submission</Button></div>}
    </div>
    {view && <><div className="no-print"><Notice>Fictional manual payment demonstration. These actions do not send a bank transfer.</Notice></div><section className="panel no-print"><div className="panel-header"><h2>Posted loan position</h2><Badge>{view.position?.state ?? 'Pending release'}</Badge></div><div className="panel-body"><p>{view.message}</p>
      {view.position ? <><p>As of {dateLabel(view.position.asOfDate)} · Posted through {dateLabel(view.position.postedThrough)}</p><dl className={styles.figures}><div><dt>Principal remaining</dt><dd><Money value={view.position.principalCentavos}/></dd></div><div><dt>Overdue principal</dt><dd><Money value={view.position.overdueCentavos}/></dd></div><div><dt>Pending movements</dt><dd>{view.position.pendingMovementCount}</dd></div></dl>
        <div className="table-scroll" role="region" aria-label="Original accepted schedule" tabIndex={0}><table><caption>Original accepted schedule</caption><thead><tr><th scope="col">Due date</th><th scope="col">Amount</th></tr></thead><tbody>{view.position.schedule.map((p, i) => <tr key={i}><td>{dateLabel(p.date)}</td><td><Money value={p.amountCentavos}/></td></tr>)}</tbody></table></div></> : <Notice>No posted balance is available. Approval or settlement evidence alone does not make the loan active.</Notice>}
    </div></section>
    <section className="panel no-print"><div className="panel-header"><h2>Financial actions</h2></div><div className={`panel-body ${styles.form}`}>
      {(cashier || authorizer) && <div className="field"><label htmlFor="payment-reason">Action reason</label><textarea id="payment-reason" value={reason} maxLength={2000} disabled={locked} onChange={e => setReason(e.target.value)}/></div>}
      {view.commands.map(c => <section key={c.id}><h3>{c.kind === 'disbursement' ? 'Release' : 'Repayment'}</h3><p><Money value={c.amountCentavos}/> · {dateLabel(c.effectiveDate)} · <Badge tone={c.state === 'confirmed' ? 'success' : 'warning'}>{c.state === 'confirmed' ? 'Posted' : c.state.replaceAll('_', ' ')}</Badge></p><p className="small subtle">Command {c.id} · Version {c.version}</p><div className="actions">
        {authorizer && c.state === 'prepared' && c.preparedBy!==session.user.id && <Button disabled={locked||c.reviewRequired} onClick={() => void execute('authorize', c.id, c.version)}>{c.kind==='disbursement'?'Authorize release':'Authorize repayment'}</Button>}
        {(cashier || authorizer) && c.state === 'authorized' && <Button disabled={locked} onClick={() => void execute('submit', c.id, c.version)}>Record submission intent</Button>}
        {(cashier || authorizer) && c.state === 'submitted' && <><Notice>An intent does not establish receipt of money. The demonstration records explicitly simulated settlement through its authorized intake.</Notice><Button disabled={locked} onClick={() => void execute('record_simulation', c.id, c.version)}>Record simulated settlement</Button><Button variant="secondary" disabled={locked} onClick={()=>void execute('record_unknown',c.id,c.version)}>Record unknown simulation outcome</Button></>}
        {c.reviewRequired&&<Notice tone="warning">Conflicting movement evidence requires financial review. No replacement transfer has been created.</Notice>}
        {authorizer && c.state === 'confirmed_unposted' && <Button disabled={locked||c.reviewRequired} onClick={() => void execute('finalize', c.id, c.version)}>Post recorded movement</Button>}
        {c.state === 'unknown' && <><Notice tone="warning">Reconcile this existing movement. Do not prepare another transfer.</Notice>{(cashier||authorizer)&&<Button disabled={locked} onClick={()=>void execute('record_simulation',c.id,c.version)}>Resolve original simulated movement</Button>}</>}
      </div></section>)}
      {cashier && view.nextPayment && !view.commands.some(c=>c.kind==='repayment'&&c.state!=='confirmed') && <><p>Next supported scheduled payment: <Money value={view.nextPayment.amountCentavos}/> on {dateLabel(view.nextPayment.date)}.</p><div className="field"><label htmlFor="repayment-method">Fictional repayment method</label><select id="repayment-method" disabled={locked} value={method} onChange={e=>setMethod(e.target.value as typeof method)}><option value="cash">Cash simulation</option><option value="bank">Bank simulation</option></select></div><Button disabled={locked} onClick={() => void execute('prepare_repayment', null, null)}>Prepare scheduled repayment</Button></>}
    </div></section>
    <section className="panel no-print"><div className="panel-header"><h2>Posted receipts</h2></div><div className="panel-body">{receipts.length ? <div className="field"><label htmlFor="receipt-selection">Selected saved receipt</label><select id="receipt-selection" value={selected} disabled={locked} onChange={e => setSelected(e.target.value)}><option value="">Choose a saved receipt</option>{receipts.map(r => <option key={r.receiptId} value={r.receiptId!}>{dateLabel(r.effectiveDate)} · {r.receiptId}</option>)}</select></div> : <p>No posted repayment receipt is available.</p>}</div></section>
    {receipt && <ReceiptBrief receipt={receipt}/>}</>}
  </div>;
}
