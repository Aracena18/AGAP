import { Link } from 'react-router-dom';
import { dateLabel } from '../../domain/format';
import type { CaseRecord, ScenarioResult } from '../../domain/types';
import { Money } from '../../shared/ui';
import styles from './comparison.module.css';

export default function CashMovements({ record, scenario }: { record: CaseRecord; scenario: ScenarioResult }) {
  const opening = record.facts.find(fact => fact.category === 'opening')!;
  function sourceLink(sourceId: string) {
    const source = record.sources.find(item => item.id === sourceId)!;
    return <Link className={styles.sourceLink} to={`/applications/${record.id}/evidence#source-${sourceId}`}>{source.title}</Link>;
  }
  const changedDays = scenario.dailyBalances.filter(day => day.movements.length > 0 || day.date === record.periodEnd);
  return <details className={styles.movements} open id="cash-movements">
    <summary>Dated cash movements <span className="small subtle">Source-linked values behind the chart</span></summary>
    <div className="table-scroll" role="region" aria-label="Cash movement table" tabIndex={0}>
      <table>
        <caption>Dated cash movements · selected schedule</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Movement &amp; source</th><th scope="col" className="numeric">Cash in / out</th><th scope="col" className="numeric">End-of-day balance</th></tr></thead>
        <tbody>
          <tr><th scope="row">{dateLabel(record.periodStart)}<span className={styles.cellNote}>Start of day</span></th>
            <td>Opening spendable cash{sourceLink(opening.sourceId!)}</td>
            <td className="numeric">—</td><td className="numeric"><Money value={opening.value!} /></td></tr>
          {changedDays.map(day => <tr key={day.date} className={day.balance < 0 ? styles.shortageRow : ''}>
            <th scope="row">{dateLabel(day.date)}</th>
            <td>{day.movements.length ? <ul className={styles.movementList}>{day.movements.map((movement, index) => <li key={index}>
              {movement.label}{movement.sourceId ? sourceLink(movement.sourceId) : <a className={styles.sourceLink} href="#offer-costs">Fictional offer schedule</a>}
            </li>)}</ul> : 'Closing balance · no movement'}</td>
            <td className="numeric">{day.movements.length ? <ul className={styles.movementAmounts}>{day.movements.map((movement, index) => <li key={index}>
              <Money value={movement.amount} /><span className={styles.cellNote}>{movement.amount < 0 ? 'Out' : 'In'}</span>
            </li>)}</ul> : '—'}</td>
            <td className="numeric"><Money value={day.balance} />{day.balance < 0 && <span className={styles.cellNote}>Shortage</span>}</td>
          </tr>)}
        </tbody>
      </table>
    </div>
    <p className={styles.tableNote}>Days without movements keep the preceding balance. Shortages are checked on every calendar day, including those not listed.</p>
  </details>;
}
