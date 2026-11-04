import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useWorkspace } from '../../app/WorkspaceContext';
import { acknowledgeNotice, assignEscalation, checkConcern, confirmEvidenceCurrent, evaluateReview, recordInvestigation, REVIEW_CAPABILITY_STATUS } from '../../domain/priorityReview';
import type { CaseRecord, ConcernReview, EscalationAction, SimulatedConcern } from '../../domain/types';
import { dateLabel } from '../../domain/format';
import { Badge, Button, Money, Notice } from '../../shared/ui';
import styles from './review.module.css';

function ActionForm({ label, save, children }: { label: string; save: (reason: string) => Promise<void>; children?: ReactNode }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setStatus('');
    try { await save(reason); setReason(''); setStatus(`${label} saved.`); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The action could not be saved.'); }
    finally { setSaving(false); }
  }
  return <form className={styles.form} aria-label={label} onSubmit={event => void submit(event)}>
    {error && <div ref={errorRef} tabIndex={-1}><Notice role="alert" tone="danger">{error}</Notice></div>}
    <fieldset disabled={saving}><legend className="sr-only">{label}</legend>{children}
      <label className="field">{label} — reason<textarea required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></label>
    </fieldset>
    <Button type="submit" disabled={saving}>{saving ? 'Saving…' : label}</Button>
    {status && <Notice role="status" tone="success">{status}</Notice>}
  </form>;
}

function SourceLinks({ record, ids }: { record: CaseRecord; ids: string[] }) {
  return <ul className={styles.sources}>{ids.map(id => <li key={id}>{record.sources.filter(source => source.id === id).length === 1
    ? <Link to={`/applications/${record.id}/evidence#source-${id}`}>{record.sources.find(source => source.id === id)!.title}</Link>
    : <span>Source unavailable or ambiguous: {id}</span>}</li>)}</ul>;
}
function ConcernEditor({ record, concern }: { record: CaseRecord; concern: SimulatedConcern }) {
  const { actor, saveCase } = useWorkspace();
  const [outcome, setOutcome] = useState<ConcernReview['outcome']>('confirm');
  const [corrected, setCorrected] = useState('');
  return <ActionForm label="Save concern check" save={async reason => saveCase(checkConcern(record, concern.id, outcome, reason, corrected, actor, new Date().toISOString()))}>
    <label className="field">Concern-check outcome<select value={outcome} onChange={event => setOutcome(event.target.value as ConcernReview['outcome'])}>
      <option value="confirm">Confirm observation</option><option value="correct">Correct observation</option><option value="dismiss">Dismiss observation</option>
    </select></label>
    {outcome === 'correct' && <label className="field">Corrected observation<textarea required maxLength={2000} value={corrected} onChange={event => setCorrected(event.target.value)} /></label>}
  </ActionForm>;
}

export function ReviewNotices() {
  const { records, role, actor, saveCase } = useWorkspace();
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  if (role !== 'reviewer') return null;
  const notices = records.flatMap(record => {
    const view = evaluateReview(record);
    return view.completed ? [] : (view.escalation?.notices ?? []).filter(notice => notice.basis === view.context && notice.recipient.name === actor.name).map(notice => ({ record, notice }));
  });
  if (!notices.length) return null;
  return <section className={`panel panel-body ${styles.inbox} no-print`} aria-label="Reviewer notices">
    <h2>Reviewer notices <Badge>{REVIEW_CAPABILITY_STATUS}</Badge></h2>
    <p className="small subtle">Acknowledgment records receipt. Investigation and resolution are separate actions.</p>
    {error && <Notice tone="danger" role="alert">{error}</Notice>}
    <ul>{notices.map(({ record, notice }) => <li key={`${record.id}-${notice.id}`}>
      <Link to={`/applications/${record.id}/summary`}>Review escalation for {record.member.name}</Link>{' '}
      {notice.acknowledged ? <Badge>Acknowledged</Badge> : <Button variant="secondary" disabled={saving} onClick={async () => {
        setSaving(true); setError('');
        try { await saveCase(acknowledgeNotice(record, notice.id, actor, new Date().toISOString())); }
        catch (failure) { setError(failure instanceof Error ? failure.message : 'The acknowledgment could not be saved.'); }
        finally { setSaving(false); }
      }}>Acknowledge notice for {record.member.name}</Button>}
    </li>)}</ul>
  </section>;
}

export default function ReviewSummary({ record }: { record: CaseRecord }) {
  const { role, actor, saveCase } = useWorkspace();
  const view = evaluateReview(record);
  const offer = record.offers.find(item => item.id === view.offerId);
  const [investigationKind, setInvestigationKind] = useState<EscalationAction['kind']>('investigate');
  const now = () => new Date().toISOString();
  const officer = role === 'officer' && !view.completed;
  const reviewer = role === 'reviewer' && !view.completed;
  return <div className={styles.page}>
    <div className="page-heading"><div><h1>Review summary</h1><p>Sources, checked results and the next human actions.</p></div><Badge>{REVIEW_CAPABILITY_STATUS}</Badge></div>
    <section className="panel panel-body" aria-label="Readiness and pending actions">
      <h2>{view.completed ? 'Decision recorded' : view.ready ? 'Ready for approval' : 'Pending review actions'}</h2>
      <div className={styles.badges}>{view.paths.map(path => <Badge key={path} tone={path === 'Ready for approval' ? 'brand' : 'warning'}>{path}</Badge>)}</div>
      {view.completed ? <p>The saved decision retains the evidence and review history used at that time.</p> : <>
        {view.blockers.length > 0 && <ul>{view.blockers.map((blocker, index) => <li key={`${index}-${blocker}`}>{blocker}</li>)}</ul>}
        <ul className={styles.tasks}>
          {view.needsClarification && <li><strong>Mara Santos:</strong> obtain clarification and <Link to={`/applications/${record.id}/evidence`}>update the evidence</Link>. A return request requires a saved correction and renewed recommendation.</li>}
          {!view.confirmed && <li><strong>Mara Santos:</strong> confirm that the evidence applies to {dateLabel(record.periodStart)}–{dateLabel(record.periodEnd)}.</li>}
          {view.pendingConcerns.length > 0 && <li><strong>Mara Santos:</strong> check the simulated AI concern against its sources.</li>}
          {!view.recommendation && <li><strong>Mara Santos:</strong> <Link to={`/applications/${record.id}/comparison`}>review permitted options and save a recommendation</Link>.</li>}
          {view.escalated && <li><strong>{view.assignment ? 'Luis Reyes' : 'Mara Santos'}:</strong> {view.assignment ? 'investigate the escalation and record the next action; verify resolution after corrections.' : 'assign the escalation to the eligible demo reviewer, Luis Reyes.'}</li>}
          {view.lastRequest?.kind === 'options' && <li><strong>Mara Santos:</strong> review the permitted alternatives requested by Luis.</li>}
          {view.ready && <li><strong>Luis Reyes:</strong> <Link to={`/applications/${record.id}/decision`}>review and record the separate lending decision</Link>.</li>}
        </ul>
      </>}
      <p className="small subtle">Ready for approval describes workflow readiness. It does not guarantee repayment or eliminate risk.</p>
      <div className={styles.links}><Link to={`/applications/${record.id}/evidence`}>Review evidence</Link><Link to={`/applications/${record.id}/comparison`}>Compare options</Link><Link to={`/applications/${record.id}/decision`}>Decision and explanation</Link></div>
    </section>

    <section className="panel panel-body" aria-label="Consolidated affordability and costs">
      <h2>Affordability and full costs</h2><p>Active offer: <strong>{offer?.label ?? 'Unavailable'}</strong> · {dateLabel(record.periodStart)}–{dateLabel(record.periodEnd)}</p>
      {view.scenario && offer ? <>
        <dl className={styles.metrics}>
          <div><dt>Monthly remaining</dt><dd><Money value={view.scenario.monthlyRemaining} /></dd></div>
          <div><dt>Lowest dated balance</dt><dd><Money value={view.scenario.lowestBalance} /></dd></div>
          <div><dt>Net received</dt><dd><Money value={offer.netReceived} /></dd></div>
          <div><dt>Full repayment</dt><dd><Money value={view.scenario.totalRepayment} /></dd></div>
          <div><dt>Financing cost</dt><dd><Money value={view.scenario.financingCost} /></dd></div>
        </dl>
        <p className="small subtle">Household cash flow covers the modeled period; costs cover the full explicit loan schedule. Loan proceeds are reserved for their purpose.</p>
        {view.scenario.policyChecks.map(check => <article className={styles.concern} key={check.policyId}><h3>{check.label} <Badge tone={check.passed ? 'neutral' : 'warning'}>{check.passed ? 'Passes fictional check' : 'Material concern'}</Badge></h3><p>{check.detail}</p></article>)}
        <SourceLinks record={record} ids={[...new Set(record.facts.flatMap(fact => fact.sourceId ? [fact.sourceId] : []))]} />
      </> : <Notice tone="warning">Affordability figures are unavailable until the evidence and assessment are complete. Missing financial facts remain unavailable.</Notice>}
      <Link to={`/applications/${record.id}/comparison`}>Inspect all permitted offers and dated movements</Link>
    </section>

    <section className="panel panel-body" aria-label="Evidence currentness">
      <h2>Evidence currentness</h2><p>{view.confirmed ? 'Mara confirmed the evidence for the current modeled period.' : 'Confirmation is pending for the current financial evidence.'}</p>
      <p className="small subtle">Material changes require renewed confirmation. This demo adds no document-expiry threshold or independent verification claim.</p>
      {officer && !view.confirmed && <ActionForm label="Confirm evidence currentness" save={async reason => saveCase(confirmEvidenceCurrent(record, reason, actor, now()))} />}
    </section>

    {view.review.aiConcerns.map(concern => {
      const checked = [...view.review.concernReviews].reverse().find(action => action.concernId === concern.id && action.basis === view.basis);
      return <section className="panel panel-body" key={concern.id} aria-label="Simulated AI concern">
        <h2>Simulated AI concern <Badge>{checked ? `Checked: ${checked.outcome}` : 'Awaiting concern check'}</Badge></h2>
        <p>{concern.text}</p><SourceLinks record={record} ids={concern.sourceIds} />
        {checked && <p>{checked.correctedText || checked.reason}</p>}
        <p className="small subtle">Checking this suggestion does not change financial facts, resolve checked policy failures or make a lending decision.</p>
        {officer && <ConcernEditor record={record} concern={concern} />}
      </section>;
    })}

    {view.escalation && <section className="panel panel-body" aria-label="Escalated review">
      <h2>Escalated review <Badge>{view.completed ? 'Disposition recorded' : view.resolved ? 'Resolution verified' : view.assignment ? 'Assigned to Luis Reyes' : 'Awaiting reviewer assignment'}</Badge></h2>
      {view.escalated && view.assessment.status === 'incomplete' && <Notice tone="warning">Earlier material findings await recheck. Current evidence is incomplete; earlier figures are historical and cannot establish present affordability.</Notice>}
      {view.escalated && view.failures.length === 0 && view.assessment.status === 'complete' && <p>The active offer passes the checked rules. Luis must verify resolution on this updated basis.</p>}
      {officer && view.escalated && !view.assignment && <ActionForm label="Assign escalation to Luis Reyes" save={async reason => saveCase(assignEscalation(record, reason, actor, now()))} />}
      {reviewer && view.escalated && view.assignment && <>
        <ActionForm label="Save investigation" save={async reason => saveCase(recordInvestigation(record, investigationKind, reason, actor, now()))}>
          <label className="field">Investigation next action<select value={investigationKind} onChange={event => setInvestigationKind(event.target.value as EscalationAction['kind'])}>
            <option value="investigate">Record investigation findings</option><option value="clarification">Request evidence clarification</option><option value="options">Request review of permitted options</option>
          </select></label>
        </ActionForm>
        <ActionForm label="Verify escalation resolution" save={async reason => saveCase(recordInvestigation(record, 'resolve', reason, actor, now()))} />
      </>}
      {officer && ['clarification', 'options'].includes(view.lastRequest?.kind ?? '') && <ActionForm label="Respond to reviewer request" save={async reason => saveCase(recordInvestigation(record, 'respond', reason, actor, now()))} />}
      <p className="small subtle">Only corrected evidence or a permitted offer can remove a failed check. Approval is blocked while a material failure persists. Decline requires current evidence, completed concern checks, a current recommendation and recorded investigation.</p>
    </section>}

    <section className="panel panel-body" aria-label="Saved review history"><details><summary>Saved review history</summary><div className={styles.history}>
      {view.review.evidenceConfirmations.map((action, index) => <article key={`confirmation-${index}`}><h3>Evidence confirmation</h3><p>{action.reason}</p><p className="small subtle">{action.actor.name} · {action.at} · {action.basis === view.basis ? 'Current basis' : 'Earlier basis — renewed review required'}</p></article>)}
      {view.review.concernReviews.map((action, index) => <article key={`concern-${index}`}><h3>AI concern: {action.outcome}</h3><p>{action.reason}</p>{action.correctedText && <p>{action.correctedText}</p>}<p className="small subtle">{action.actor.name} · {action.at} · {action.basis === view.basis ? 'Current basis' : 'Earlier basis'}</p></article>)}
      {view.escalation?.observations.map((observation, index) => <article key={`observation-${index}`}><h3>Checked material finding</h3><p className="small subtle">{observation.at} · {observation.basis === view.context ? 'Current offer and evidence' : 'Historical offer/evidence — retained for review'}</p><ul>{observation.checks.map(check => <li key={check.policyId}>{check.detail}</li>)}</ul><SourceLinks record={record} ids={observation.sourceIds} /></article>)}
      {view.escalation?.assignments.map((assignment, index) => <article key={`assignment-${index}`}><h3>Assigned to {assignment.reviewer.name}</h3><p>{assignment.reason}</p><p className="small subtle">{assignment.actor.name} · {assignment.at}</p></article>)}
      {view.escalation?.notices.map(notice => <article key={notice.id}><h3>In-app notice: {notice.acknowledged ? 'acknowledged' : 'receipt pending'}</h3><p className="small subtle">For {notice.recipient.name} · {notice.at}{notice.acknowledged && ` · Acknowledged ${notice.acknowledged.at}`}</p></article>)}
      {view.escalation?.actions.map((action, index) => <article key={`action-${index}`}><h3>Reviewer action: {action.kind}</h3><p>{action.reason}</p><p className="small subtle">{action.actor.name} · {action.at} · {action.basis === view.context ? 'Current offer and evidence' : 'Earlier basis'}{action.decisionId && ` · Decision ${action.decisionId}`}</p></article>)}
      {record.decisions.map(decision => <article key={decision.id}><h3>Human decision: {decision.input.outcome}</h3><p>{decision.input.rationale}</p><p className="small subtle">{decision.reviewer.name} · {decision.recordedAt} · Evidence version {decision.caseVersion}</p></article>)}
      {!view.review.evidenceConfirmations.length && !view.review.concernReviews.length && !view.escalation && !record.decisions.length && <p>No review actions recorded yet.</p>}
    </div></details></section>
  </div>;
}
