import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward, ExpandMore, CompareArrows, FindInPage } from '../../shared/icons';
import { assessCase } from '../../domain/assessment';
import { dateLabel } from '../../domain/format';
import type { CaseRecord } from '../../domain/types';
import { Badge, Money, Notice } from '../../shared/ui';
import CashFlowChart from './CashFlowChart';
import FullCosts from './FullCosts';
import CashMovements from './CashMovements';
import RecommendationForm from './RecommendationForm';
import styles from './comparison.module.css';

export default function ComparisonPage({ record }: { record: CaseRecord }) {
  const [selectedId, setSelectedId] = useState(record.recommendation?.offerId ?? '');
  const assessment = assessCase(record);
  const evidencePath = `/applications/${record.id}/evidence`;
  const heading = <div className="page-heading">
    <div><h1>Repayment comparison</h1><p>See what remains each month, and when cash is needed.</p></div>
    <Badge>Fictional offers &amp; policies</Badge>
  </div>;

  if (assessment.status === 'incomplete') {
    return <div className="stack">
      {heading}
      <section className={`panel ${styles.incomplete}`} aria-labelledby="incomplete-heading">
        <FindInPage size={32} aria-hidden="true" />
        <h2 id="incomplete-heading">Evidence needs clarification</h2>
        <p>A complete comparison needs the following information. Missing or conflicting values remain unavailable.</p>
        <ul>{assessment.issues.map((issue, index) => <li key={`${issue.factId}-${index}`}>{issue.message}</li>)}</ul>
        <Link className={styles.primaryLink} to={evidencePath}>Review evidence <ArrowForward size={20} aria-hidden="true" /></Link>
      </section>
    </div>;
  }

  const scenario = assessment.scenarios.find(item => item.offerId === selectedId) ?? assessment.scenarios[0];
  const offers = record.offers.filter(offer => assessment.scenarios.some(item => item.offerId === offer.id));
  const offer = offers.find(item => item.id === scenario.offerId)!;
  const opening = record.facts.find(fact => fact.category === 'opening')!;
  const firstLowestDay = scenario.dailyBalances.find(day => day.balance === scenario.lowestBalance)?.date ?? record.periodStart;
  const overallShortfall = assessment.scenarios.every(item => item.monthlyRemaining < 0);

  return <div className="stack">
    {heading}
    <fieldset>
      <legend className={styles.legend}><CompareArrows size={20} aria-hidden="true" /> Choose a schedule to examine</legend>
      <div className={styles.options}>
        {offers.map(item => <label className={`${styles.option} ${item.id === scenario.offerId ? styles.selected : ''}`} key={item.id}>
          <input type="radio" name="comparison-offer" value={item.id} checked={item.id === scenario.offerId} onChange={() => setSelectedId(item.id)} />
          <span><strong>{item.label}</strong><span className={styles.optionDetail}>First payment {dateLabel(item.payments[0].date)} · {item.termMonths} months</span></span>
        </label>)}
      </div>
    </fieldset>
    <div className={styles.metrics} aria-live="polite">
      <section className={`panel ${styles.metric}`} aria-labelledby="monthly-heading">
        <h2 id="monthly-heading">Monthly remaining</h2>
        <Money value={scenario.monthlyRemaining} className={`${styles.amount} ${scenario.monthlyRemaining < 0 ? styles.negative : ''}`} />
        <p>After essentials, existing obligations and this schedule’s payments.</p>
      </section>
      <section className={`panel ${styles.metric}`} aria-labelledby="lowest-heading">
        <h2 id="lowest-heading">Lowest dated cash balance</h2>
        <Money value={scenario.lowestBalance} className={`${styles.amount} ${scenario.lowestBalance < 0 ? styles.negative : ''}`} />
        <p>First reached {dateLabel(firstLowestDay)}. Includes opening cash.</p>
      </section>
    </div>
    {overallShortfall
      ? <Notice tone="danger"><strong>Income does not cover the recorded monthly outgoings.</strong> Changing the repayment date cannot remove this monthly shortfall. Discuss the circumstances and explicitly available options with the member.</Notice>
      : scenario.monthlyRemaining >= 0 && scenario.lowestBalance < 0
        ? <Notice tone="warning"><strong>The monthly total does not show the timing gap.</strong> Cash falls below zero before payday under this schedule. Compare the explicitly available payment dates.</Notice>
        : <Notice>A nonnegative modeled balance is not a guarantee of affordability. Review unreported expenses and changes in the member’s circumstances.</Notice>}
    <section className="panel" aria-labelledby="cash-heading">
      <div className="panel-header"><div><h2 id="cash-heading">Cash through the repayment cycle</h2><p className="small subtle">{dateLabel(record.periodStart)}–{dateLabel(record.periodEnd)} · end-of-day balances</p></div></div>
      <div className={`panel-body ${styles.chartBody}`}>
        <div className={styles.chartContext}>
          <p>Opening spendable cash <Money value={opening.value!} /></p>
          <p>Closing cash <Money value={scenario.closingBalance} /></p>
          <button type="button" className={styles.textLink} onClick={() => { const details = document.getElementById('cash-movements') as HTMLDetailsElement | null; if (details) { details.open = true; details.scrollIntoView({ block: 'start' }); } }}>View dated movements</button>
        </div>
        <div className={styles.chartScroll} role="region" aria-label="Cash balance chart" tabIndex={0}><CashFlowChart scenario={scenario} offer={offer} opening={opening.value!} periodStart={record.periodStart} /></div>
      </div>
      <CashMovements record={record} scenario={scenario} />
    </section>
    <FullCosts offers={offers} scenarios={assessment.scenarios} selectedId={offer.id} />
    <RecommendationForm key={offer.id} record={record} offer={offer} />
    <details className={`panel ${styles.assumptionDetails}`}>
      <summary className="panel-header"><h2>Calculation assumptions &amp; demo policy</h2><ExpandMore size={20} aria-hidden="true" /></summary>
      <div className={`panel-body ${styles.assumptions}`}>
        <Link to={evidencePath}>Review sources</Link>
        {assessment.warnings.map(warning => <p key={warning}>{warning}</p>)}
        <p>Opening cash is excluded from monthly remaining. Obligations already deducted from take-home pay are shown in evidence and are not deducted again. Separate fees are charged on the first scheduled payment date.</p>
        <p>The modeled period is one repayment cycle. Full-term costs use every payment in the recorded offer schedule.</p>
        <ul className={styles.policyList}>{scenario.policyChecks.map(check => <li key={check.policyId}>
          <Badge tone={check.passed ? 'neutral' : 'warning'}>{check.passed ? 'Meets demo check' : 'Does not meet demo check'}</Badge><span>{check.detail}</span>
        </li>)}</ul>
      </div>
    </details>
  </div>;
}
