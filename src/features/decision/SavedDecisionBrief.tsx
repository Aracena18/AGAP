import { CheckedRemaining } from '../../shared/ui/CheckedRemaining';
import { Badge, Button, Money } from '../../shared/ui';
import { dateLabel } from '../../domain/format';
import type { SavedBrief } from './staff-gateway';
import { recordedInstant } from './staff-gateway';
import styles from './StaffDecisionPage.module.css';
export function SavedDecisionBrief({ brief, historical }: { brief: SavedBrief; historical: boolean }) {
  return <section className={`panel ${styles.saved}`}>
    <div className="panel-header no-print"><h2>Saved decision brief</h2><Button variant="secondary" onClick={() => window.print()}>Print selected saved brief</Button></div>
    <article aria-label="Saved decision brief" className={`panel-body ${styles.brief}`}>
      <header><p className="eyebrow">AGAP · Saved member explanation</p><h2>{brief.memberName}</h2><p>Application {brief.applicationId} · Decision {brief.id}</p>
        <p>Recorded {recordedInstant(brief.recordedAt)} · Input version {brief.inputVersion}</p><Badge>{brief.outcome === 'return' ? 'Returned for clarification' : brief.outcome === 'approve' ? 'Approved decision' : 'Declined decision'}</Badge>
        {historical && <p>Historical decision. This brief preserves the selected saved version.</p>}</header>
      <Badge>{brief.origin === 'template' ? 'Deterministic template' : 'Reviewed manual explanation'}</Badge><p className={styles.text}>{brief.explanation}</p>
      <p>Assessed horizon: {dateLabel(brief.periodStart)}–{dateLabel(brief.periodEnd)}. Checked figures apply to this horizon; they do not guarantee future affordability.</p>
      {brief.considered ? <section><h3>Considered offer — {brief.considered.offer.label}</h3><dl className={styles.figures}>
        <div><dt>Principal</dt><dd><Money value={brief.considered.offer.principalCentavos}/></dd></div>
        <div><dt>Net proceeds</dt><dd><Money value={brief.considered.offer.netReceivedCentavos}/></dd></div>
        <div><dt>Separately paid fees</dt><dd><Money value={brief.considered.offer.feesPaidSeparatelyCentavos}/></dd></div>
        <div><dt>Total repayment</dt><dd><Money value={brief.considered.checked.totalRepaymentCentavos}/></dd></div>
        <div><dt>Financing cost</dt><dd><Money value={brief.considered.checked.financingCostCentavos}/></dd></div>
        <CheckedRemaining scenario={brief.considered.checked}/>
        <div><dt>Lowest dated balance</dt><dd><Money value={brief.considered.checked.lowestBalanceCentavos}/></dd></div>
      </dl><p>Term: {brief.considered.offer.termMonths} months.</p>
      {brief.considered.checked.shortageDates.length > 0 && <p>Modeled shortage dates: {brief.considered.checked.shortageDates.map(dateLabel).join('; ')}.</p>}
      {brief.considered.checked.policyChecks.filter(p => !p.passed).map(p => <p key={p.policyId}>Concern {p.policyId}: {p.detail}</p>)}
      <table><caption>Saved payment schedule</caption><thead><tr><th scope="col">Due date</th><th scope="col">Amount</th></tr></thead><tbody>{brief.considered.offer.payments.map((p, i) => <tr key={`${p.date}-${i}`}><td>{dateLabel(p.date)}</td><td><Money value={p.amountCentavos}/></td></tr>)}</tbody></table></section> : <p>Complete considered-offer figures unavailable in this saved record.</p>}
      <section><h3>Saved source references</h3>{brief.sources.length ? <ul>{brief.sources.map(s => <li key={`${s.sourceId}-${s.sourceVersion}`}>Source {s.sourceId}, version {s.sourceVersion} · Verification: {s.verification}. Fact effective dates: {s.effectiveDates.length ? s.effectiveDates.map(dateLabel).join('; ') : 'Unavailable'}. Original source title/date and inspection are unavailable in this projection.</li>)}</ul> : <p>No source references preserved in this record.</p>}</section>
      <p>Recorded reviewer identifier: {brief.reviewerId}. Next review: {dateLabel(brief.reviewDate)}.</p>
      <p>{brief.document ? `Saved terms version: ${brief.document.id}.` : 'No acceptance document belongs to this outcome.'} This printout is a view of saved content. It does not release funds or replace the exact saved acceptance document.</p>
    </article>
  </section>;
}
