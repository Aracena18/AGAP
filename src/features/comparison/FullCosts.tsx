import type { ReactNode } from 'react';
import { dateLabel } from '../../domain/format';
import type { LoanOffer, ScenarioResult } from '../../domain/types';
import { Badge, Money } from '../../shared/ui';
import styles from './comparison.module.css';

export default function FullCosts({ offers, scenarios, selectedId }: { offers: LoanOffer[]; scenarios: ScenarioResult[]; selectedId: string }) {
  const rows: { label: string; value: (offer: LoanOffer, scenario: ScenarioResult) => ReactNode }[] = [
    { label: 'Principal', value: offer => <Money value={offer.principal} /> },
    { label: 'Net amount received', value: offer => <Money value={offer.netReceived} /> },
    { label: 'Fees paid separately', value: offer => <Money value={offer.feesPaidSeparately} /> },
    { label: 'Term', value: offer => `${offer.termMonths} months · ${offer.payments.length} payments` },
    { label: 'Payment day', value: offer => [...new Set(offer.payments.map(payment => Number(payment.date.slice(8))))].map(day => `Day ${day}`).join(', ') },
    { label: 'Payment amount', value: offer => [...new Set(offer.payments.map(payment => payment.amount))].map(amount => <span className={styles.scheduleAmount} key={amount}><Money value={amount} /></span>) },
    { label: 'Total repayment', value: (_offer, scenario) => <strong><Money value={scenario.totalRepayment} /></strong> },
    { label: 'Total financing cost', value: (_offer, scenario) => <strong><Money value={scenario.financingCost} /></strong> },
  ];
  return <section className="panel" id="offer-costs" aria-labelledby="cost-heading">
    <div className="panel-header"><div><h2 id="cost-heading">Compare the full cost</h2><p className="small subtle">Only explicitly available fictional offers are shown.</p></div></div>
    <div className="table-scroll" role="region" aria-label="Full cost comparison table" tabIndex={0}>
      <table className={styles.costTable}>
        <caption className="sr-only">Full offer costs · all scheduled payments</caption>
        <thead><tr><th scope="col">Offer detail</th>{offers.map(offer => <th scope="col" className="numeric" key={offer.id}>
          {offer.label}{offer.id === selectedId && <span className={styles.cellNote}><Badge tone="brand">Viewing</Badge></span>}
        </th>)}</tr></thead>
        <tbody>{rows.map(row => <tr key={row.label}><th scope="row">{row.label}</th>{offers.map(offer => <td className="numeric" key={offer.id}>
          {row.value(offer, scenarios.find(scenario => scenario.offerId === offer.id)!)}
        </td>)}</tr>)}</tbody>
      </table>
    </div>
    <div className={`panel-body ${styles.costNotes}`}>
      <p>Financing cost = all scheduled repayments + fees paid separately − net amount received. Withheld fees are already reflected in net received.</p>
      <details><summary>View all repayment dates and offer terms</summary><div className={styles.offerSchedules}>{offers.map(offer => <section key={offer.id}>
        <h3>{offer.label}</h3><p>{offer.policyNote}</p>
        <ol>{offer.payments.map(payment => <li key={payment.date}><span>{dateLabel(payment.date)}</span><Money value={payment.amount} /></li>)}</ol>
      </section>)}</div></details>
    </div>
  </section>;
}
