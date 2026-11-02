import type { WorkspaceView, Preview } from './staff-gateway';
import { Button, Badge, Notice } from '../../shared/ui';
import styles from './StaffDecisionPage.module.css';
export interface DecisionDraft { outcome: '' | 'approve' | 'decline' | 'return'; offerId: string; rationale: string; departureReason: string; reviewDate: string; exceptions: Record<string, string> }
export const emptyDecisionDraft: DecisionDraft = { outcome: '', offerId: '', rationale: '', departureReason: '', reviewDate: '', exceptions: {} };
export function DecisionForm({ errors, view, draft, update, preview, reviewed, setReviewed, locked, expired, prepare, record }: {
  errors: Record<string, string>; view?: WorkspaceView; draft: DecisionDraft; update: (patch: Partial<DecisionDraft>) => void;
  preview?: Preview; reviewed: boolean; setReviewed: (v: boolean) => void; locked: boolean; expired: boolean;
  prepare: () => void; record: () => void;
}) {
  const chosen = view?.offers.find(o => o.offer.id === draft.offerId);
  const allowed = draft.outcome === 'return' ? view?.canReturn : chosen?.outcomes.includes(draft.outcome as 'approve' | 'decline');
  const departs = view?.recommendation && (draft.outcome !== 'approve' || draft.offerId !== view.recommendation.offerVersionId);
  return <section className="panel no-print"><div className="panel-header"><h2>Reviewer decision</h2></div><div className={`panel-body ${styles.form}`}>
    <fieldset disabled={locked || !view}><legend>Review outcome</legend><div className={styles.choices}>{(['approve', 'decline', 'return'] as const).map(outcome => <label key={outcome}>
      <input type="radio" name="staff-outcome" checked={draft.outcome === outcome} disabled={outcome === 'return' ? !view?.canReturn : !view?.offers.some(o => o.outcomes.includes(outcome))} onChange={() => update({ outcome, exceptions: {} })}/>{outcome === 'return' ? 'Return for clarification' : outcome === 'approve' ? 'Approve' : 'Decline'}
    </label>)}</div></fieldset>
    <fieldset disabled={locked || !view} className={styles.form}><legend>Human decision details</legend>
      {draft.outcome !== 'return' && <div className="field"><label htmlFor="staff-offer">Offer considered</label><select id="staff-offer" aria-invalid={Boolean(errors.offerVersionId)} aria-describedby={errors.offerVersionId ? "staff-offer-error" : undefined} value={draft.offerId} onChange={e => update({ offerId: e.target.value, exceptions: {} })}><option value="">Choose a checked offer</option>{view?.offers.filter(o => o.offer.available).map(o => <option key={o.offer.id} value={o.offer.id}>{o.offer.label}</option>)}</select>{errors.offerVersionId && <p className="field-error" id="staff-offer-error">{errors.offerVersionId}</p>}</div>}
      <div className="field"><label htmlFor="staff-rationale">{draft.outcome === 'return' ? 'Clarification needed and next step' : 'Decision rationale'}</label><textarea id="staff-rationale" aria-invalid={Boolean(errors.rationale)} aria-describedby={errors.rationale ? "staff-rationale-error" : undefined} required maxLength={2000} value={draft.rationale} onChange={e => update({ rationale: e.target.value })}/>{errors.rationale && <p className="field-error" id="staff-rationale-error">{errors.rationale}</p>}</div>
      {departs && <div className="field"><label htmlFor="staff-departure">Reason for departing from the recommendation</label><textarea id="staff-departure" aria-invalid={Boolean(errors.departureReason)} aria-describedby={errors.departureReason ? "staff-departure-error" : undefined} required maxLength={2000} value={draft.departureReason} onChange={e => update({ departureReason: e.target.value })}/>{errors.departureReason && <p className="field-error" id="staff-departure-error">{errors.departureReason}</p>}</div>}
      {draft.outcome === 'approve' && chosen?.checked?.policyChecks.filter(p => !p.passed).map(p => <div key={p.policyId} className="field"><p>{p.policyId}: {p.detail}</p>{p.overridable && chosen.outcomes.includes('approve') ? <><label htmlFor={`exception-${p.policyId}`}>Authorized exception reason — {p.policyId}</label><textarea id={`exception-${p.policyId}`} required maxLength={2000} value={draft.exceptions[p.policyId] ?? ''} onChange={e => update({ exceptions: { ...draft.exceptions, [p.policyId]: e.target.value } })}/></> : <Notice tone="warning">This check cannot be overridden by this reviewer.</Notice>}</div>)}
      <div className="field"><label htmlFor="staff-review-date">Next review date</label><input id="staff-review-date" aria-invalid={Boolean(errors.reviewDate)} aria-describedby={errors.reviewDate ? "staff-review-date-error" : undefined} type="date" required min={view?.periodEnd} value={draft.reviewDate} onChange={e => update({ reviewDate: e.target.value })}/>{errors.reviewDate && <p className="field-error" id="staff-review-date-error">{errors.reviewDate}</p>}</div>
      <div className="actions"><Button disabled={!allowed || !draft.outcome} onClick={prepare}>Prepare exact preview</Button></div>
    </fieldset>
    {preview && <section className={styles.preview}><h3>Exact explanation preview <Badge>Deterministic template</Badge></h3><p>Preview only. No decision has been recorded.</p><p className={styles.text}>{preview.explanation}</p>{preview.terms && <details><summary>Read the exact terms</summary><pre>{preview.terms}</pre></details>}
      {expired && <Notice tone="warning">Preview expired. Prepare and review a new preview before a new recording.</Notice>}
      <label className={styles.choice}><input type="checkbox" checked={reviewed} disabled={locked || expired} onChange={e => setReviewed(e.target.checked)}/>I reviewed this exact explanation and terms.</label>
      <Button disabled={locked || expired || !reviewed} onClick={record}>Record decision</Button>
    </section>}
  </div></section>;
}
