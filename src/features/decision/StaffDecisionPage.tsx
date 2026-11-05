import { CheckedRemaining } from '../../shared/ui/CheckedRemaining';
import { useEffect, useRef, useState } from 'react';
import { CommandReceiptSchema, DecisionCreateSchema, DecisionSchema, RecommendationCreateSchema } from '../../../packages/contracts/src/schemas';
import { ApiClientError } from '../../../packages/api-client/src/transport';
import { useStaff, type StaffSession } from '../access/StaffContext';
import { useCommand } from '../access/useCommand';
import { useUnsavedChanges } from '../access/useUnsavedChanges';
import { Badge, Button, Money, Notice } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import { DecisionForm, emptyDecisionDraft, type DecisionDraft } from './DecisionForm';
import { SavedDecisionBrief } from './SavedDecisionBrief';
import { recordedInstant, unavailableStaffDecisions, type DecisionInput, type HistoryPage, type Preview, type SavedBrief, type StaffDecisionGateway, type WorkspaceView } from './staff-gateway';
import { WorkspaceViewSchema, HistoryPageSchema, SavedBriefSchema } from '../../../apps/api/src/modules/decisions/staff-views';
import { PreviewViewSchema } from '../../../apps/api/src/modules/decisions/backend-contracts';
import styles from './StaffDecisionPage.module.css';

type Common = { app: string; version: number; csrf: string };
type Attempt = Common & ({ kind: 'recommend'; body: Parameters<StaffDecisionGateway['recommend']>[1] } | { kind: 'preview'; body: Omit<DecisionInput, 'explanationReviewed'> } | { kind: 'record'; body: DecisionInput; proof: string });
type Result = { attempt: Attempt } & ({ kind: 'preview'; value: Preview } | { kind: 'recommend'; value: Awaited<ReturnType<StaffDecisionGateway['recommend']>> } | { kind: 'record'; value: Awaited<ReturnType<StaffDecisionGateway['record']>> });
/** Explicit injection point until Robert publishes a canonical client/route adapter. */
export default function StaffDecisionPage({ applicationId, gateway = unavailableStaffDecisions }: { applicationId: string; gateway?: StaffDecisionGateway }) {
  const { session } = useStaff();
  if (!session) return <Notice>Sign in to the staff workspace to inspect a decision.</Notice>;
  return <StaffDecisionWorkspace key={`${session.user.id}:${session.csrfToken}:${applicationId}`} applicationId={applicationId} session={session} gateway={gateway}/>;
}
/** Testable feature controller, not a staff session/authentication replacement. */
type WorkspaceProps = { applicationId: string; session: StaffSession; gateway?: StaffDecisionGateway };
export function StaffDecisionWorkspace(props: WorkspaceProps) {
  if (!props.session.user.roles.some(role => ['officer', 'reviewer', 'auditor'].includes(role))) return <div className="no-print"><Notice>This account has no staff decision role.</Notice></div>;
  return <DecisionController key={`${props.applicationId}:${props.session.user.id}:${props.session.csrfToken}`} {...props}/>;
}
function DecisionController({ applicationId: app, session, gateway = unavailableStaffDecisions }: WorkspaceProps) {
  const [revision, setRevision] = useState(0);
  const [resource, setResource] = useState<{ revision: number; gateway: StaffDecisionGateway; view?: WorkspaceView; history?: HistoryPage; error?: string }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [brief, setBrief] = useState<{ id: string; revision: number; gateway: StaffDecisionGateway; value?: SavedBrief; error?: string }>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState<DecisionDraft>({ ...emptyDecisionDraft, exceptions: {} });
  const [recommendOffer, setRecommendOffer] = useState(''), [recommendReason, setRecommendReason] = useState('');
  const [preview, setPreview] = useState<Preview>(), [reviewed, setReviewed] = useState(false);
  const [notice, setNotice] = useState(''), [localError, setLocalError] = useState(''), [denied, setDenied] = useState('');
  const [clock, setClock] = useState(() => Date.now());
  const [document, setDocument] = useState<{ id: string; revision: number; text: string }>();
  const documentRequest = useRef<AbortController | null>(null);
  const [documentError, setDocumentError] = useState('');
  const [paging, setPaging] = useState(false);
  const last = useRef<Attempt | null>(null), errorRef = useRef<HTMLDivElement>(null), pageGate = useRef(false);
  const command = useCommand<Attempt, Result>();
  const current = resource?.revision === revision && resource.gateway === gateway;
  const view = current ? resource.view : undefined, history = current ? resource.history : undefined;
  const loading = !current, locked = command.saving || command.uncertain;
  const chosen = view?.offers.find(o => o.offer.id === draft.offerId);
  const dirty = Boolean(draft.rationale || draft.departureReason || draft.outcome || draft.reviewDate || recommendReason || recommendOffer || preview);
  useUnsavedChanges(dirty || locked, command.uncertain);
  const expired = preview ? new Date(preview.expiresAt).getTime() <= clock : false;
  const selectedBrief = brief?.id === selected && brief.revision === revision && brief.gateway === gateway ? brief.value : undefined;
  const briefError = brief?.id === selected && brief.revision === revision && brief.gateway === gateway ? brief.error : undefined;
  const problem = localError || command.error;
  const rejectAccess = (error: unknown) => {
    if (error instanceof ApiClientError && [401, 403, 404].includes(error.status)) setDenied('This decision information is unavailable to the current account. Sign in again or contact the authorized review owner.');
  };
  useEffect(() => {
    const abort = new AbortController();
    Promise.all([gateway.workspace(app, abort.signal), gateway.history(app, undefined, abort.signal)]).then(([raw, rawPage]) => {
      const next = WorkspaceViewSchema.parse(raw), page = HistoryPageSchema.parse(rawPage);
      if (abort.signal.aborted) return;
      if (next.application.id !== app || next.application.organizationId !== session.user.organizationId || !session.user.branchIds.includes(next.application.branchId) || page.items.some(i => i.applicationId !== app)) throw new ApiClientError(503, 'invalid_response', 'The decision workspace does not match this application.');
      setResource({ revision, gateway, view: next, history: page });
      setSelected(id => id ?? next.currentDecisionId ?? page.items[0]?.id ?? null);
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) { rejectAccess(error); setResource({ revision, gateway, error: error instanceof Error ? error.message : 'The workspace is unavailable.' }); }
    });
    return () => abort.abort();
  }, [app, gateway, revision, session.user.organizationId, session.user.branchIds]);
  useEffect(() => {
    if (!selected || denied) return;
    const abort = new AbortController();
    gateway.brief(app, selected, abort.signal).then(raw => {
      const value = SavedBriefSchema.parse(raw);
      if (abort.signal.aborted) return;
      if (value.id !== selected || value.applicationId !== app) throw new ApiClientError(503, 'invalid_response', 'The selected brief could not be verified.');
      setBrief({ id: selected, revision, gateway, value });
    }).catch((error: unknown) => {
      if (!abort.signal.aborted) { if (error instanceof ApiClientError && [401, 403].includes(error.status)) rejectAccess(error); setBrief({ id: selected, revision, gateway, error: error instanceof Error ? error.message : 'The selected brief is unavailable.' }); }
    });
    return () => abort.abort();
  }, [app, selected, revision, gateway, denied]);
  useEffect(() => {
    if (!preview) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [preview]);
  useEffect(() => () => documentRequest.current?.abort(), [selected, revision, gateway, denied]);
  useEffect(() => { if (problem) errorRef.current?.focus(); }, [problem]);
  function update(patch: Partial<DecisionDraft>) { if (locked) return; setDraft(d => ({ ...d, ...patch })); setPreview(undefined); setReviewed(false); setLocalError(''); setFieldErrors({}); command.reset(); }
  function refresh() { if (locked) return; setRevision(r => r + 1); setPreview(undefined); setReviewed(false); setDocument(undefined); setDocumentError(''); }
  async function send(attempt: Attempt, key: string): Promise<Result> {
    const options = { version: attempt.version, csrfToken: attempt.csrf, idempotencyKey: key };
    try {
      if (attempt.kind === 'preview') {
        const value = PreviewViewSchema.parse(await gateway.preview(attempt.app, attempt.body, options));
        if (value.applicationVersion !== attempt.version || value.basisHash !== view?.basisHash) throw new ApiClientError(503, 'invalid_response', 'The preview basis could not be verified.');
        return { attempt, kind: 'preview', value };
      }
      if (attempt.kind === 'recommend') return { attempt, kind: 'recommend', value: CommandReceiptSchema.parse(await gateway.recommend(attempt.app, attempt.body, options)) };
      const value = DecisionSchema.parse(await gateway.record(attempt.app, attempt.body, attempt.proof, options));
      if (value.applicationId !== attempt.app || value.outcome !== attempt.body.outcome) throw new ApiClientError(503, 'invalid_response', 'The recorded decision could not be verified.');
      return { attempt, kind: 'record', value };
    } catch (error) {
      rejectAccess(error);
      if (error instanceof ApiClientError && error.status < 500 && error.code !== 'invalid_response') { setPreview(undefined); setReviewed(false); }
      if (error instanceof ApiClientError && error.status === 501 && error.code === 'module_not_available') { setPreview(undefined); setReviewed(false); }
      throw error;
    }
  }
  async function execute(attempt: Attempt) {
    setLocalError(''); setNotice(''); last.current = attempt;
    const result = await command.submit(attempt, send);
    if (!result) return;
    if (result.kind === 'preview') {
      if (result.value.applicationVersion !== result.attempt.version || result.value.basisHash !== view?.basisHash) {
        setPreview(undefined); setLocalError('The recovered preview is no longer current. Refresh and prepare a new preview.'); return;
      }
      setPreview(result.value); setClock(Date.now()); setReviewed(false); setNotice('Exact preview prepared. Review it before recording a decision.');
    } else {
      setPreview(undefined); setReviewed(false); setDraft({ ...emptyDecisionDraft, exceptions: {} }); setRecommendOffer(''); setRecommendReason('');
      if (result.kind === 'record') { setSelected(result.value.id); setNotice(`Decision recorded: ${result.value.outcome === 'return' ? 'returned for clarification' : result.value.outcome}. Loading the saved brief. Approval does not release funds.`); }
      else setNotice('Officer recommendation recorded. A separate authorized reviewer must make the decision.');
      setRevision(r => r + 1);
    }
  }
  function prepare() {
    if (!view || locked) return;
    const departs = view.recommendation && (draft.outcome !== 'approve' || draft.offerId !== view.recommendation.offerVersionId);
    const input = { outcome: draft.outcome, assessmentId: view.assessment?.id ?? null, recommendationId: view.recommendation?.id ?? null,
      offerVersionId: draft.outcome === 'return' ? null : draft.offerId || null, rationale: draft.rationale, departureReason: departs ? draft.departureReason : '',
      exceptions: draft.outcome === 'approve' ? (chosen?.checked?.policyChecks.filter(p => !p.passed).map(p => ({ policyId: p.policyId, reason: draft.exceptions[p.policyId] ?? '' })) ?? []) : [],
      reviewDate: draft.reviewDate, explanationReviewed: true as const };
    const parsed = DecisionCreateSchema.safeParse(input);
    if (!parsed.success || departs && !draft.departureReason.trim() || draft.reviewDate < view.periodEnd) {
      setFieldErrors(parsed.success ? { departureReason: !draft.departureReason.trim() ? 'Record the departure reason.' : '', reviewDate: draft.reviewDate < view.periodEnd ? 'Choose a date on or after the assessed horizon.' : '' } : Object.fromEntries(parsed.error.issues.map(i => [i.path.join('.'), i.message])));
      setLocalError(parsed.success ? 'Record the departure reason and a review date on or after the assessed horizon.' : parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' ')); return;
    }
    const body = { outcome: parsed.data.outcome, assessmentId: parsed.data.assessmentId, recommendationId: parsed.data.recommendationId, offerVersionId: parsed.data.offerVersionId, rationale: parsed.data.rationale, departureReason: parsed.data.departureReason, exceptions: parsed.data.exceptions, reviewDate: parsed.data.reviewDate };
    setPreview(undefined); setReviewed(false);
    void execute({ kind: 'preview', app, version: view.application.version, csrf: session.csrfToken, body });
  }
  function record() {
    if (!view || !preview || !reviewed || expired || locked || !last.current || last.current.kind !== 'preview') return;
    void execute({ kind: 'record', app, version: preview.applicationVersion, csrf: session.csrfToken, proof: preview.id, body: { ...last.current.body, explanationReviewed: true } });
  }
  function recommend() {
    if (!view || !view.assessment || locked) return;
    const parsed = RecommendationCreateSchema.safeParse({ assessmentId: view.assessment.id, offerVersionId: recommendOffer, inputVersion: view.assessment.inputVersion, reason: recommendReason });
    if (!parsed.success) { setLocalError('Choose a checked offer and record a recommendation reason.'); return; }
    void execute({ kind: 'recommend', app, version: view.application.version, csrf: session.csrfToken, body: parsed.data });
  }
  async function moreHistory() {
    if (!history?.nextCursor || pageGate.current || locked) return;
    pageGate.current = true; setPaging(true); const abort = new AbortController();
    const epoch = revision;
    try {
      const page = HistoryPageSchema.parse(await gateway.history(app, history.nextCursor, abort.signal));
      if (page.items.some(i => i.applicationId !== app)) throw new ApiClientError(503, 'invalid_response', 'History is unavailable.');
      setResource(old => old?.revision === epoch && old.gateway === gateway && old.history ? { ...old, history: { items: [...old.history.items, ...page.items.filter(i => !old.history!.items.some(item => item.id === i.id))], nextCursor: page.nextCursor } } : old);
    } catch (error) { rejectAccess(error); setLocalError('Additional history could not be loaded.'); }
    finally { pageGate.current = false; setPaging(false); }
  }
  async function inspectTerms() {
    if (!selectedBrief || !selectedBrief.document) return;
    documentRequest.current?.abort();
    const expected = selectedBrief, abort = new AbortController(); documentRequest.current = abort; setDocumentError('');
    try {
      const result = await gateway.document(app, expected.id, abort.signal);
      if (abort.signal.aborted) return;
      if (result.id !== expected.document!.id || result.sha256 !== expected.document!.sha256) throw new Error('The saved terms could not be verified.');
      setDocument({ id: expected.id, revision, text: result.text });
    } catch { if (!abort.signal.aborted) setDocumentError('The exact saved terms are unavailable. The recorded decision remains preserved.'); }
  }
  if (denied) return <div className="no-print"><Notice tone="danger" role="alert">{denied}</Notice></div>;
  const mayReview = session.user.roles.includes('reviewer'), mayRecommend = session.user.roles.includes('officer');
  return <div className={styles.page}>
    <header className="page-heading no-print"><div><h1>Decision and explanation</h1><p>Application {app}</p></div><Button variant="secondary" disabled={locked || loading} onClick={refresh}>Refresh current basis</Button></header>
    <div className="no-print">{loading && <p role="status">Loading current decision basis…</p>}{current && resource.error && <Notice tone="warning" role="alert">{resource.error}</Notice>}
      {notice && <Notice tone="success" role="status">{notice}</Notice>}
      {problem && <div ref={errorRef} tabIndex={-1}><Notice tone="danger" role="alert">{problem}</Notice>{command.fields.map((f, i) => <p key={i}>{f.path}: {f.message}</p>)}</div>}
      {command.saving && <p role="status">Saving the exact submission…</p>}
      {command.uncertain && <div className={styles.form}><Button onClick={() => { if (last.current) void execute(last.current); }} disabled={command.saving}>Retry the same submission</Button><p>Do not start a different submission. Reloading loses the in-memory retry details; inspect the saved decision history with the review owner before submitting again.</p></div>}
    </div>
    {view && <section className="panel no-print"><div className="panel-header"><h2>Current review basis</h2><Badge>Application version {view.application.version} · Input {view.application.assessmentInputVersion}</Badge></div><div className={`panel-body ${styles.form}`}>
      <h3>{view.application.memberName}</h3><p>Horizon {dateLabel(view.periodStart)}–{dateLabel(view.periodEnd)} · Assessment {view.assessment?.state ?? 'unavailable'}</p>
      {view.assessment?.issues.map((i, n) => <p key={n}>{i}</p>)}
      {view.recommendation ? <div><h3>Officer recommendation</h3><p>{view.recommendation.reason}</p><p>Preparer {view.recommendation.preparedBy} · {recordedInstant(view.recommendation.preparedAt)}</p></div> : <p>No officer recommendation recorded.</p>}
      {mayReview && !view.offers.some(o => o.outcomes.length) && view.canReturn && <Notice tone="warning">{view.assessment?.state !== 'complete' ? 'Approval and decline require a current complete checked assessment.' : !view.recommendation ? 'Approval and decline require a current officer recommendation.' : 'Current input, authority, conflict or exception guards prevent a final decision. Contact the authorized review owner.'} Return for clarification remains available.</Notice>}
      {view.blockedReason && <Notice tone="warning">{view.blockedReason}</Notice>}
      {view.offers.map(o => <section key={o.offer.id}><h3>{o.offer.label}</h3><dl className={styles.figures}>
        <div><dt>Principal</dt><dd><Money value={o.offer.principalCentavos}/></dd></div><div><dt>Net proceeds</dt><dd><Money value={o.offer.netReceivedCentavos}/></dd></div><div><dt>Separately paid fees</dt><dd><Money value={o.offer.feesPaidSeparatelyCentavos}/></dd></div>
        {o.checked ? <CheckedRemaining scenario={o.checked}/> : <div><dt>Remaining</dt><dd>Unavailable</dd></div>}<div><dt>Lowest dated balance</dt><dd>{o.checked ? <Money value={o.checked.lowestBalanceCentavos}/> : 'Unavailable'}</dd></div><div><dt>Total repayment</dt><dd>{o.checked ? <Money value={o.checked.totalRepaymentCentavos}/> : 'Unavailable'}</dd></div><div><dt>Financing cost</dt><dd>{o.checked ? <Money value={o.checked.financingCostCentavos}/> : 'Unavailable'}</dd></div>
      </dl><p>Term {o.offer.termMonths} months. {o.offer.available ? 'Explicitly available offer.' : 'Offer unavailable.'}</p><div className="table-scroll"><table><caption>Checked payment schedule</caption><thead><tr><th scope="col">Due date</th><th scope="col">Amount</th></tr></thead><tbody>{o.offer.payments.map((p, i) => <tr key={i}><td>{dateLabel(p.date)}</td><td><Money value={p.amountCentavos}/></td></tr>)}</tbody></table></div>
      {o.checked?.shortageDates.length ? <Notice tone="warning">Modeled dated shortages: {o.checked.shortageDates.map(dateLabel).join('; ')}. A monthly surplus does not remove this timing gap.</Notice> : null}</section>)}
    </div></section>}
    {mayRecommend && <section className="panel no-print"><div className="panel-header"><h2>Officer recommendation</h2></div><fieldset disabled={locked || !view || !view.offers.some(o => o.recommend)} className={`panel-body ${styles.form}`}><legend>Current checked offer and reason</legend><div className="field"><label htmlFor="recommend-offer">Recommended offer</label><select id="recommend-offer" value={recommendOffer} onChange={e => setRecommendOffer(e.target.value)}><option value="">Choose a permitted checked offer</option>{view?.offers.filter(o => o.recommend).map(o => <option key={o.offer.id} value={o.offer.id}>{o.offer.label}</option>)}</select></div><div className="field"><label htmlFor="recommend-reason">Recommendation reason</label><textarea id="recommend-reason" value={recommendReason} maxLength={2000} onChange={e => setRecommendReason(e.target.value)}/></div><Button onClick={recommend}>Record recommendation</Button></fieldset></section>}
    {mayReview && <DecisionForm errors={fieldErrors} view={view} draft={draft} update={update} preview={preview} reviewed={reviewed} setReviewed={setReviewed} locked={locked} expired={expired} prepare={prepare} record={record}/>}
    <section className="panel no-print"><div className="panel-header"><h2>Saved decision history</h2></div><div className={`panel-body ${styles.form}`}>
      {history && history.items.length === 0 && <p>No saved decisions recorded.</p>}
      {history && history.items.length > 0 && <div className="field"><label htmlFor="staff-history">Selected saved decision</label><select id="staff-history" value={selected ?? ''} onChange={e => { setSelected(e.target.value); setDocument(undefined); setDocumentError(''); }} disabled={locked}><option value="">Choose a saved decision</option>{history.items.map(item => <option key={item.id} value={item.id}>{recordedInstant(item.recordedAt)} · {item.outcome} · {item.id} · {item.accepted ? 'Acknowledged' : 'Not acknowledged'}</option>)}</select></div>}
      {history?.nextCursor && <Button variant="secondary" disabled={locked || paging} onClick={() => void moreHistory()}>Load earlier decisions</Button>}
      {selected && !selectedBrief && !briefError && <p role="status">Loading selected saved brief…</p>}
      {briefError && <Notice tone="warning" role="alert">The selected brief is unavailable: {briefError}. A recorded decision is not resubmitted by this read.</Notice>}
    </div></section>
    {selectedBrief && <><SavedDecisionBrief brief={selectedBrief} historical={Boolean(view && view.currentDecisionId !== selectedBrief.id || view && view.application.assessmentInputVersion !== selectedBrief.inputVersion)}/>
      {selectedBrief.document && <section className="panel panel-body no-print"><Button variant="secondary" onClick={() => void inspectTerms()}>Inspect exact saved terms</Button>{document?.id === selected && document.revision === revision && <pre>{document.text}</pre>}{documentError && <Notice tone="warning">{documentError}</Notice>}</section>}</>}
    <p className="no-print">Follow-up editing and further decisions require their authorized server workflows. Member acceptance is separate; a recorded approval does not create an active loan or release funds.</p>
  </div>;
}
