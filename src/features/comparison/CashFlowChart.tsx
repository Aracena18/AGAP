import { useId } from 'react';
import { dateLabel, money } from '../../domain/format';
import type { LoanOffer, ScenarioResult } from '../../domain/types';
import styles from './comparison.module.css';

export default function CashFlowChart({ scenario, offer, opening, periodStart }: {
  scenario: ScenarioResult; offer: LoanOffer; opening: number; periodStart: string;
}) {
  const id = useId();
  const days = scenario.dailyBalances;
  const values = [opening, ...days.map(day => day.balance), 0];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = Math.max(maximum - minimum, 100);
  const floor = minimum - spread * 0.16;
  const ceiling = maximum + spread * 0.15;
  const left = 88;
  const right = 620;
  const top = 26;
  const bottom = 266;
  const x = (index: number) => left + index / days.length * (right - left);
  const y = (value: number) => bottom - (value - floor) / (ceiling - floor) * (bottom - top);
  const path = `M${x(0)},${y(opening)} ${days.map((day, index) => `H${x(index + 1)} V${y(day.balance)}`).join(' ')}`;
  const lowestIndex = opening === scenario.lowestBalance ? 0 : days.findIndex(day => day.balance === scenario.lowestBalance) + 1;
  const lowestDate = lowestIndex === 0 ? periodStart : days[lowestIndex - 1].date;
  const tickIndices = [...new Set([0, Math.floor(days.length / 4), Math.floor(days.length / 2), Math.floor(days.length * 3 / 4), days.length - 1])];
  return <svg className={styles.chart} viewBox="0 0 860 330" role="img" aria-labelledby={`${id}-title ${id}-description`}>
    <title id={`${id}-title`}>{offer.label} cash balance</title>
    <desc id={`${id}-description`}>
      {`Opening cash ${money(opening)}. Lowest balance ${money(scenario.lowestBalance)}, first reached ${dateLabel(lowestDate)}. Closing cash ${money(scenario.closingBalance)}. The dated movements table below gives the source-linked values.`}
    </desc>
    {minimum < 0 && <rect x={left} y={y(0)} width={right - left} height={bottom - y(0)} className={styles.shortageArea} />}
    {[maximum, 0, ...(minimum < 0 ? [minimum] : [])].filter((value, index, items) => items.indexOf(value) === index).map(value => <g key={value}>
      <line x1={left} x2={right} y1={y(value)} y2={y(value)} className={value === 0 ? styles.zeroLine : styles.gridLine} />
      <text x={left - 12} y={y(value) + 4} textAnchor="end" className={styles.axisText}>{money(value)}</text>
    </g>)}
    {tickIndices.map(index => <text key={index} x={x(index + 1)} y={bottom + 28} textAnchor="middle" className={styles.axisText}>
      {dateLabel(days[index].date).replace(', 2026', '').replace(/, \d{4}$/, '')}
    </text>)}
    <path d={path} className={styles.balanceLine} />
    <circle cx={x(lowestIndex)} cy={y(scenario.lowestBalance)} r="5" className={scenario.lowestBalance < 0 ? styles.shortageDot : styles.balanceDot} />
    <text x={Math.max(left + 8, x(lowestIndex) - 16)} y={y(scenario.lowestBalance) + 23} className={styles.minimumLabel}>
      Lowest {money(scenario.lowestBalance)}
    </text>
    <circle cx={right} cy={y(scenario.closingBalance)} r="4" className={styles.balanceDot} />
    <text x={right + 16} y={y(scenario.closingBalance) - 6} className={styles.lineLabel}>{offer.label}</text>
    <text x={right + 16} y={y(scenario.closingBalance) + 17} className={styles.axisText}>Closing {money(scenario.closingBalance)}</text>
    <text x={left} y="323" className={styles.axisText}>Calendar dates · PHP · steps show the balance after each day’s movements</text>
  </svg>;
}
