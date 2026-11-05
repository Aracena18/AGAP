import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { CommandReceiptSchema } from '../../../packages/contracts/src/schemas';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import type { RequestOptions } from '../../../packages/api-client/src/transport';
import { useStaff } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { usePage } from '../access/usePage';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Button, Money, Notice } from '../../shared/ui';
import styles from './loans.module.css';
type Attempt = { applicationId: string; csrfToken: string; body: { method: 'cash' } };
export default function LendingPage() {
  const { session } = useStaff();
  if (!session) return <Notice>Sign in to view lending applications.</Notice>;
  return <LendingQueue key={`${session.user.id}:${session.user.organizationId}:${session.user.branchIds.join(',')}:${session.user.roles.join(',')}:${session.csrfToken}`}/>;
}
function LendingQueue() {
  const { session, client } = useStaff();
  const allowed = Boolean(session?.user.roles.some(r => ['cashier', 'financial_authorizer', 'auditor'].includes(r)));
  const [denied, setDenied] = useState(false);
  const load = useCallback((options: RequestOptions) => allowed ? client.listLendingApplications(options).catch((error: unknown) => { if (!options.signal?.aborted && error instanceof ApiClientError && [401, 403].includes(error.status)) setDenied(true); throw error; }) : Promise.resolve({ items: [], nextCursor: null }), [client, allowed]);
  const page = usePage(load), command = useCommand<Attempt, z.output<typeof CommandReceiptSchema>>();
  const attempt = useRef<Attempt | null>(null), [notice, setNotice] = useState('');
  const locked = command.saving || command.uncertain;
  useUnsavedChanges(locked, command.uncertain);
  async function originate(applicationId: string) {
    if (!session || command.saving) return;
    const body = { applicationId, csrfToken: session.csrfToken, body: { method: 'cash' as const } };
    if (!command.uncertain) attempt.current = body;
    const result = await command.submit(attempt.current ?? body, (saved, key) => client.createPendingOrigination(saved.applicationId, saved.body, { csrfToken: saved.csrfToken, idempotencyKey: key }).catch((error: unknown) => { if (error instanceof ApiClientError && [401, 403].includes(error.status)) setDenied(true); throw error; }));
    if (result) { setNotice('Pending origination recorded. No funds have been released.'); page.refresh(); }
  }
  if (denied) return <Notice role="alert" tone="danger">Lending information is unavailable to the current account. Sign in again or contact the servicing owner.</Notice>;
  if (!allowed) return <Notice>This account has no loan servicing role.</Notice>;
  return <div className={styles.page}><header className="page-heading"><div><h1>Lending and payments</h1><p>Approved applications and saved loan movements.</p></div><Button variant="secondary" disabled={locked} onClick={page.refresh}>Refresh lending queue</Button></header>
    <Notice>Fictional principal-only lending demonstration. Creating a pending loan does not release money. Separate authorization, simulated settlement and accounting posting follow.</Notice>
    {notice && <Notice role="status">{notice}</Notice>}{command.error && <Notice role="alert" tone="danger">{command.error}</Notice>}
    {command.uncertain && <><Notice tone="warning">The original origination may have completed. Retry the same request before starting another.</Notice><Button onClick={() => { if (attempt.current) void originate(attempt.current.applicationId); }}>Retry same origination</Button></>}
    <section className="panel"><div className="panel-header"><h2>Recorded lending applications</h2></div><div className="panel-body">
      {page.loading && <p role="status">Loading lending applications…</p>}{page.error && <Notice role="alert" tone="warning">{page.error}</Notice>}
      {!page.loading && !page.error && !page.items.length && <p>No recorded lending applications are available.</p>}
      <div className={styles.queue}>{page.items.map(row => <article key={row.id} className={styles.record}><h3>{row.memberLabel}</h3><p>{row.purpose}</p><p>Approved principal: <Money value={row.principalCentavos}/></p><p>{row.acceptanceRecorded ? 'Member acceptance recorded' : 'Member acceptance pending'}</p><div className="actions">{row.loanId ? <Link to={`/staff/loans/${row.loanId}`}>Open loan and payments</Link> : session?.user.roles.includes('cashier') && row.acceptanceRecorded ? <Button disabled={locked} onClick={() => void originate(row.id)}>Create pending fictional loan</Button> : <p>No pending loan has been created.</p>}</div></article>)}</div>
      {page.hasMore && <Button variant="secondary" disabled={locked || page.loading} onClick={() => void page.more()}>Load more lending applications</Button>}
    </div></section>
  </div>;
}
