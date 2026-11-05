import type { z } from 'zod';
import type { OfferSchema } from '../../../packages/contracts/src/common';
import type { WorkflowAssessment } from '../../../packages/contracts/src/workflow';
import { Money, Notice } from '../../shared/ui';
import styles from './pilot.module.css';
import { dateLabel } from '../../domain/format';

/** Display saved server figures only; never sum payments or infer a missing zero. */
export function PrincipalTerms({offer,assessment}:{offer:z.output<typeof OfferSchema>;assessment:z.output<typeof WorkflowAssessment>|null}){
  const checked=assessment?.status==='complete'?assessment.scenarios.find(s=>s.offerId===offer.id):undefined;
  return <section className="stack" aria-label="Saved loan terms"><h3>{offer.label}</h3>
    <dl className={styles.summary}><div><dt>Principal</dt><dd><Money value={offer.principalCentavos}/></dd></div><div><dt>Net amount received</dt><dd><Money value={offer.netReceivedCentavos}/></dd></div><div><dt>Separate fees</dt><dd><Money value={offer.feesPaidSeparatelyCentavos}/></dd></div><div><dt>Full contractual repayment</dt><dd>{checked?<Money value={checked.totalRepaymentCentavos}/>: 'Unavailable'}</dd></div><div><dt>Full financing cost</dt><dd>{checked?<Money value={checked.financingCostCentavos}/>: 'Unavailable'}</dd></div></dl>
    {assessment&&<p>Household horizon: {dateLabel(assessment.periodStart)} to {dateLabel(assessment.periodEnd)} · {assessment.engineVersion}.</p>}
    {assessment?.stale&&<Notice tone="warning">This saved assessment needs renewed review. Its original values are preserved.</Notice>}
    {checked&&<><dl className={styles.summary}><div><dt>Lowest dated cash balance</dt><dd><Money value={checked.lowestBalanceCentavos}/></dd></div><div><dt>Horizon net remaining</dt><dd><Money value={checked.horizonNetCentavos}/></dd></div></dl>
      <ul>{checked.months.map(month=><li key={month.month}>Remaining in modeled dates of {month.month}: <Money value={month.remainingCentavos}/></li>)}</ul>
      {checked.shortageDates.length>0&&<Notice tone="warning">Modeled cash shortages: {checked.shortageDates.map(dateLabel).join(', ')}.</Notice>}
    </>}
    <div className="table-scroll" role="region" tabIndex={0} aria-label="Exact contractual repayment dates"><table><caption>Saved contractual schedule</caption><thead><tr><th scope="col">Date</th><th scope="col" className="numeric">Amount</th></tr></thead><tbody>{offer.payments.map((payment,index)=><tr key={index}><td>{dateLabel(payment.date)}</td><td className="numeric"><Money value={payment.amountCentavos}/></td></tr>)}</tbody></table></div>
  </section>;
}
