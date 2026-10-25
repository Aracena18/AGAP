import { useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarToday, FindInPage, Print, History } from '../../shared/icons';
import { useWorkspace } from '../../app/WorkspaceContext';
import { assessCase } from '../../domain/assessment';
import { buildExplanation } from '../../domain/explanation';
import { dateLabel, isCalendarDate } from '../../domain/format';
import { recordDecision, recordFollowUp, validateDecision } from '../../domain/review';
import type { CaseRecord, DecisionInput, DecisionSnapshot, ExplanationDraft } from '../../domain/types';
import { Badge, Button, Money, Notice } from '../../shared/ui';
import styles from './DecisionPage.module.css';

function Explanation({ draft, snapshot }: { draft: ExplanationDraft; snapshot: DecisionSnapshot }) {
  return <div className={styles.explanation}>
    <p className={styles.summary}>{draft.summary}</p>
    {draft.sections.map((section, index) => <section key={`${section.title}-${index}`}>
      <h3>{section.title}</h3><p>{section.body}</p>
      {section.sourceIds.length > 0 && <p className={styles.citation}>Sources: {section.sourceIds.map(id => {
        const source = snapshot.sources.find(item => item.id === id);
        return source ? `${source.title} (${dateLabel(source.date)})` : 'Source unavailable in this saved record';
      }).join('; ')}.</p>}
    </section>)}
  </div>;
}
function FieldError({ name, errors }: { name: string; errors: Record<string, string> }) {
  return errors[name] ? <p className="field-error" id={`error-${name}`}>{errors[name]}</p> : null;
}

export default function DecisionPage({ record }: { record: CaseRecord }) {
  const { actor, role, saveCase } = useWorkspace();
  const assessment = assessCase(record);
  const currentRecommendation = record.recommendation?.caseVersion === record.version ? record.recommendation : null;
  const [input, setInput] = useState<DecisionInput>({
    outcome: assessment.status === 'complete' && currentRecommendation ? 'approve' : 'return',
    offerId: currentRecommendation?.offerId ?? record.offers.find(offer => offer.available)?.id ?? null,
    rationale: '', departureReason: '', exceptions: [], reviewDate: record.periodEnd, explanationReviewed: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const errorSummary = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (Object.keys(errors).length) {
      const invalid = formRef.current?.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]');
      (invalid ?? errorSummary.current)?.focus();
    }
  }, [errors]);
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState(record.decisions.at(-1)?.id ?? '');
  const [followDate, setFollowDate] = useState(record.followUp?.reviewDate ?? record.decisions.at(-1)?.input.reviewDate ?? record.periodEnd);
  const [followNote, setFollowNote] = useState(record.followUp?.note ?? '');
  const [followStatus, setFollowStatus] = useState('');
  const [followError, setFollowError] = useState('');
  const selectedSnapshot = record.decisions.find(decision => decision.id === selectedId) ?? record.decisions.at(-1);
  const chosenScenario = assessment.status === 'complete' ? assessment.scenarios.find(scenario => scenario.offerId === input.offerId) : undefined;
  const failingChecks = chosenScenario?.policyChecks.filter(check => !check.passed) ?? [];
  const departs = Boolean(currentRecommendation && (input.outcome !== 'approve' || input.offerId !== currentRecommendation.offerId));
  const previewSnapshot: DecisionSnapshot = {
    id: 'preview', caseId: record.id, caseVersion: record.version, memberName: record.member.name, recordedAt: '', reviewer: actor,
    input: { ...input, offerId: input.outcome === 'return' ? null : input.offerId, exceptions: input.outcome === 'approve' ? input.exceptions : [], departureReason: departs ? input.departureReason : '' },
    periodStart: record.periodStart, periodEnd: record.periodEnd, facts: record.facts, sources: record.sources, offers: record.offers, recommendation: record.recommendation, assessment,
  };
  const preview = isCalendarDate(input.reviewDate) ? buildExplanation(previewSnapshot) : null;
  function updateInput(patch: Partial<DecisionInput>) {
    setInput(current => ({ ...current, ...patch, explanationReviewed: false }));
    setErrors({}); setStatus('');
  }
  function exceptionReason(policyId: string, reason: string) {
    updateInput({ exceptions: input.exceptions.map(exception => exception.policyId === policyId ? { policyId, reason } : exception) });
  }
  async function submitDecision(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setStatus('');
    const decisionInput = previewSnapshot.input;
    const validation = validateDecision(record, decisionInput);
    if (!validation.valid) { setErrors(validation.errors); return; }
    setSaving(true);
    try {
      const updated = recordDecision(record, decisionInput, actor, new Date().toISOString());
      await saveCase(updated);
      setSelectedId(updated.decisions.at(-1)!.id); setFollowDate(decisionInput.reviewDate);
      setStatus('Decision recorded. The saved member brief preserves this evidence and calculation version.');
      setInput(current => ({ ...current, explanationReviewed: false }));
    } catch (error) { setErrors({ form: error instanceof Error ? error.message : 'The decision could not be saved.' }); }
    finally { setSaving(false); }
  }
  async function submitFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setFollowStatus(''); setFollowError(''); setSaving(true);
    try {
      await saveCase(recordFollowUp(record, followDate, followNote, actor, new Date().toISOString()));
      setFollowStatus('Follow-up saved. The recorded decision and member brief are unchanged.');
    } catch (error) { setFollowError(error instanceof Error ? error.message : 'The follow-up could not be saved.'); }
    finally { setSaving(false); }
  }
  const decisionForm = <form ref={formRef} onSubmit={submitDecision} className={styles.form} noValidate>
    <fieldset><legend>Review outcome</legend><div className={styles.outcomes}>
      {(['approve', 'decline', 'return'] as const).map(outcome => <label key={outcome} className={styles.choice}>
        <input type="radio" name="outcome" value={outcome} checked={input.outcome === outcome} onChange={() => updateInput({ outcome, exceptions: [] })} />
        {outcome === 'approve' ? 'Approve' : outcome === 'decline' ? 'Decline' : 'Return for clarification'}
      </label>)}
    </div></fieldset>
    {Object.keys(errors).length > 0 && <div ref={errorSummary} tabIndex={-1}><Notice tone="danger" role="alert">The decision was not recorded. Check the messages below.</Notice></div>}
    {['outcome', 'assessment', 'recommendation', 'form', 'exceptions'].map(name => <FieldError key={name} name={name} errors={errors} />)}
    {input.outcome !== 'return' && <div className="field">
      <label htmlFor="decision-offer">Offer considered</label>
      <select id="decision-offer" value={input.offerId ?? ''} onChange={event => updateInput({ offerId: event.target.value, exceptions: [] })} aria-invalid={Boolean(errors.offerId)} aria-describedby={errors.offerId ? 'error-offerId' : undefined}>
        <option value="">Choose an available offer</option>{record.offers.filter(offer => offer.available).map(offer => <option value={offer.id} key={offer.id}>{offer.label}</option>)}
      </select><FieldError name="offerId" errors={errors} />
    </div>}
    <div className="field"><label htmlFor="decision-rationale">{input.outcome === 'return' ? 'Clarification needed and next step' : 'Decision rationale'}</label>
      <textarea id="decision-rationale" value={input.rationale} onChange={event => updateInput({ rationale: event.target.value })} required aria-invalid={Boolean(errors.rationale)} aria-describedby={errors.rationale ? 'error-rationale' : 'rationale-help'} />
      <p id="rationale-help" className="small subtle">Connect the decision to the evidence, household circumstances, and next action.</p><FieldError name="rationale" errors={errors} />
    </div>
    {departs && <div className="field"><label htmlFor="departure-reason">Reason for departing from the officer recommendation</label>
      <textarea id="departure-reason" value={input.departureReason} onChange={event => updateInput({ departureReason: event.target.value })} required aria-invalid={Boolean(errors.departureReason)} aria-describedby={errors.departureReason ? 'error-departureReason' : undefined} />
      <FieldError name="departureReason" errors={errors} />
    </div>}
    {input.outcome === 'approve' && failingChecks.length > 0 && <fieldset className={styles.exceptionPanel}><legend>Fictional policy exceptions</legend>
      <p>Approval requires an explicit exception and reason for each failed check. Missing critical evidence cannot be overridden.</p>
      {failingChecks.map(check => {
        const exception = input.exceptions.find(item => item.policyId === check.policyId);
        return <div key={check.policyId} className={styles.exception}>
          <p><strong>{check.label}</strong> · {check.detail}</p>
          <label className={styles.choice}><input type="checkbox" checked={Boolean(exception)} onChange={event => updateInput({ exceptions: event.target.checked ? [...input.exceptions, { policyId: check.policyId, reason: '' }] : input.exceptions.filter(item => item.policyId !== check.policyId) })} />Record an exception for {check.label.toLowerCase()}</label>
          {exception && <div className="field"><label htmlFor={`exception-${check.policyId}`}>Exception reason — {check.label}</label>
            <textarea id={`exception-${check.policyId}`} value={exception.reason} onChange={event => exceptionReason(check.policyId, event.target.value)} required aria-invalid={Boolean(errors[`exception.${check.policyId}`])} aria-describedby={`error-exception.${check.policyId}`} />
          </div>}
          <FieldError name={`exception.${check.policyId}`} errors={errors} />
        </div>;
      })}
    </fieldset>}
    <div className={`field ${styles.dateField}`}><label htmlFor="review-date">Review date</label>
      <input id="review-date" type="date" min={record.periodEnd} value={input.reviewDate} onChange={event => updateInput({ reviewDate: event.target.value })} required aria-invalid={Boolean(errors.reviewDate)} aria-describedby={errors.reviewDate ? 'error-reviewDate' : 'review-date-help'} />
      <p id="review-date-help" className="small subtle">On or after {dateLabel(record.periodEnd)}.</p><FieldError name="reviewDate" errors={errors} />
    </div>
    <div className={styles.preview}><div className={styles.sectionTitle}><FindInPage size={20} aria-hidden="true" /><h3>Template explanation preview</h3><Badge>Deterministic template</Badge></div>
      <p className="small subtle">Review the words, costs, assumptions, and next step before saving. Your edits update this preview.</p>
      {preview ? <details><summary>Read the explanation to be recorded</summary><Explanation draft={preview} snapshot={previewSnapshot} /></details> : <Notice tone="warning">Choose a valid review date to view the explanation.</Notice>}
    </div>
    <div><label className={styles.choice}><input type="checkbox" checked={input.explanationReviewed} onChange={event => setInput(current => ({ ...current, explanationReviewed: event.target.checked }))} disabled={!preview} aria-invalid={Boolean(errors.explanationReviewed)} aria-describedby={errors.explanationReviewed ? 'error-explanationReviewed' : undefined} />I reviewed the template explanation, including costs, assumptions, and next step.</label><FieldError name="explanationReviewed" errors={errors} /></div>
    <div className="actions"><Button type="submit" disabled={saving}>Record decision</Button><p className="small subtle">Records the current evidence version {record.version}.</p></div>
  </form>;
  return <div className={styles.page}>
    <div className="page-heading no-print"><div><p className="eyebrow">Human review · Step 3 of 3</p><h1>Decision and explanation</h1><p>Carry the evidence, costs, and reasoning into a recorded decision.</p></div><Badge>Version {record.version}</Badge></div>
    <section className="panel no-print" aria-labelledby="assessment-summary"><div className="panel-header"><h2 id="assessment-summary">Ready for human review</h2><Badge tone={assessment.status === 'complete' ? 'brand' : 'warning'}>{assessment.status === 'complete' ? 'Assessment complete' : 'Evidence incomplete'}</Badge></div>
      <div className={`panel-body ${styles.assessment}`}>
        <div><h3>Officer recommendation</h3>{record.recommendation ? <><p>{record.offers.find(offer => offer.id === record.recommendation?.offerId)?.label ?? 'Offer unavailable'}</p><p className="small subtle">{record.recommendation.note}</p><p className="small subtle">{record.recommendation.actor.name} · {dateLabel(record.recommendation.at)} · version {record.recommendation.caseVersion}</p>{!currentRecommendation && <Badge tone="warning">Recommendation needs renewed review</Badge>}</> : <p className="subtle">No officer recommendation recorded.</p>}</div>
        {assessment.status === 'incomplete' ? <Notice tone="warning"><p>Approval and decline are unavailable until the critical evidence is complete and an officer recommendation is recorded. Return for clarification is available.</p><ul>{assessment.issues.map(issue => <li key={`${issue.factId}-${issue.message}`}>{issue.message}</li>)}</ul></Notice> : <div className={styles.metrics}>
          {chosenScenario ? <><div><span>Monthly remaining</span><strong><Money value={chosenScenario.monthlyRemaining} /></strong></div><div><span>Lowest dated balance</span><strong><Money value={chosenScenario.lowestBalance} /></strong></div><p className="small subtle">{record.offers.find(offer => offer.id === chosenScenario.offerId)?.label} · {dateLabel(record.periodStart)}–{dateLabel(record.periodEnd)}</p></> : <p>Select an available offer to see its assessment.</p>}
        </div>}
      </div>
      {assessment.status === 'complete' && !currentRecommendation && <div className={styles.prerequisite}><Notice tone="warning">Approval and decline require a current officer recommendation. Use Repayment comparison in the officer role to record it. Return for clarification remains available.</Notice></div>}
    </section>
    <section className="panel no-print" aria-labelledby="reviewer-action"><div className="panel-header"><h2 id="reviewer-action">Reviewer decision</h2><Badge>{role === 'reviewer' ? actor.name : 'Demo reviewer action'}</Badge></div><div className="panel-body">
      {role !== 'reviewer' ? <Notice>Switch to the demo reviewer role using the role control above to record a decision. You can review the evidence summary and saved member briefs here. Demo roles demonstrate the workflow; they are not authentication.</Notice> : selectedSnapshot ? <details className={styles.newReview}><summary>Record a further decision</summary>{decisionForm}</details> : decisionForm}
      {status && <div className={styles.feedback}><Notice tone="success" role="status">{status}</Notice></div>}
    </div></section>
    {selectedSnapshot && <section className={`panel ${styles.saved}`} aria-labelledby="saved-brief-title">
      <div className="panel-header no-print"><h2 id="saved-brief-title">Saved member brief</h2><Button variant="secondary" onClick={() => window.print()}><Print size={20} aria-hidden="true" />Print saved brief</Button></div>
      {record.decisions.length > 1 && <div className={`${styles.historySelect} no-print`}><label htmlFor="decision-history">Recorded decision</label><select id="decision-history" value={selectedSnapshot.id} onChange={event => setSelectedId(event.target.value)}>{[...record.decisions].reverse().map((decision, index) => <option key={decision.id} value={decision.id}>{dateLabel(decision.recordedAt)} · {decision.input.outcome} · evidence version {decision.caseVersion}{index === 0 ? ' · latest' : ' · historical'}</option>)}</select></div>}
      <article aria-label="Saved member brief" className={`panel-body ${styles.brief}`}>
        <div className={styles.briefHeader}><p className="eyebrow">AGAP · Fictional member explanation</p><h2>{selectedSnapshot.memberName}</h2><p>{selectedSnapshot.caseId} · Recorded {dateLabel(selectedSnapshot.recordedAt)} · Evidence version {selectedSnapshot.caseVersion}</p><Badge>Deterministic template · reviewed by staff</Badge></div>
        {selectedSnapshot.caseVersion !== record.version && <Notice tone="warning">Historical decision from evidence version {selectedSnapshot.caseVersion}. The case has changed; renewed review is needed. This brief preserves the recorded decision.</Notice>}
        {selectedSnapshot !== record.decisions.at(-1) && <Notice tone="warning">Historical decision. A later recorded decision is available in the selector.</Notice>}
        {selectedSnapshot.explanation ? <Explanation draft={selectedSnapshot.explanation} snapshot={selectedSnapshot} /> : <Notice tone="warning">The saved explanation is unavailable in this historical record.</Notice>}
        <p className={styles.signoff}>Recorded by {selectedSnapshot.reviewer.name}, demo reviewer · Review date {dateLabel(selectedSnapshot.input.reviewDate)}. All people, records, offers, and policies shown are fictional.</p>
      </article>
      <details className={`${styles.staffDetails} no-print`}><summary><History size={20} aria-hidden="true" />Staff details and frozen evidence</summary><div className={styles.form}>
        <p className="small subtle">Case version {selectedSnapshot.caseVersion} · Calculation {selectedSnapshot.assessment.calculationVersion} · Recorded {selectedSnapshot.recordedAt}. Browser recordkeeping demonstrates the workflow and is not a secure audit service.</p>
        {selectedSnapshot.recommendation && <p>Officer recommendation: {selectedSnapshot.offers.find(offer => offer.id === selectedSnapshot.recommendation?.offerId)?.label} · {selectedSnapshot.recommendation.note} · {selectedSnapshot.recommendation.actor.name}</p>}
        <div className="table-scroll"><table><caption>Evidence preserved with this decision</caption><thead><tr><th scope="col">Recorded fact</th><th scope="col" className="numeric">Amount</th><th scope="col">Status and source</th></tr></thead><tbody>{selectedSnapshot.facts.map(fact => <tr key={fact.id}><th scope="row">{fact.label}</th><td className="numeric">{fact.value === null ? 'Unavailable' : <Money value={fact.value} />}</td><td>{fact.status} · {selectedSnapshot.sources.find(source => source.id === fact.sourceId)?.title ?? 'Source unavailable'} · {dateLabel(fact.effectiveDate)}</td></tr>)}</tbody></table></div>
        {selectedSnapshot.sources.map(source => <section key={source.id}><h3>{source.title} · {dateLabel(source.date)}</h3><p>{source.excerpt}</p></section>)}
      </div></details>
    </section>}
    {selectedSnapshot && <section className="panel no-print" aria-labelledby="followup-title"><div className="panel-header"><h2 id="followup-title"><CalendarToday size={20} aria-hidden="true" />Follow-up checkpoint</h2></div><form onSubmit={submitFollowUp} className={`panel-body ${styles.form}`} noValidate>
      <p className="small subtle">Record a short fictional check-in. The saved decision and its original review date stay preserved.</p>
      <div className={`field ${styles.dateField}`}><label htmlFor="followup-date">Follow-up date</label><input id="followup-date" type="date" value={followDate} min={record.periodEnd} onChange={event => setFollowDate(event.target.value)} /></div>
      <div className="field"><label htmlFor="followup-note">Follow-up note</label><textarea id="followup-note" value={followNote} maxLength={500} onChange={event => setFollowNote(event.target.value)} aria-describedby="followup-note-help" /><p id="followup-note-help" className="small subtle">Up to 500 characters. Add material evidence changes on the Evidence screen for renewed review.</p></div>
      {followError && <Notice tone="danger" role="alert">{followError}</Notice>}{followStatus && <Notice tone="success" role="status">{followStatus}</Notice>}
      <div className="actions"><Button type="submit" variant="secondary" disabled={saving}>Save follow-up</Button>{record.followUp && <p className="small subtle">Last updated {dateLabel(record.followUp.updatedAt)}</p>}</div>
    </form></section>}
  </div>;
}
