import type { ReactNode } from 'react';
import styles from './MemberApp.module.css';

/** Optional decoration; every instruction remains real, readable HTML. */
export function MemberGuide({ children, reassuring = false }: { children: ReactNode; reassuring?: boolean }) {
  return <div className={styles.guide}>
    <img src={`${import.meta.env.BASE_URL}workspace/${reassuring ? 'gabay-reassuring' : 'gabay-guiding'}.webp`} alt="" width={320} height={320} decoding="async"/>
    <p>{children}</p>
  </div>;
}

/** This shows intake progress only, never evidence readiness or a lending outcome. */
export function ApplicationJourney({ step }: { step: 'details' | 'review' | 'sent' }) {
  const current = step === 'details' ? 0 : step === 'review' ? 1 : 2;
  const labels = ['Details', 'Review', step === 'sent' ? 'Sent' : 'Send'];
  return <ol className={styles.journey} aria-label="Application steps">
    {labels.map((label, index) => <li key={index} aria-current={index === current ? 'step' : undefined} data-complete={index < current}>
      <span className={styles.stepNumber} aria-hidden="true">{index + 1}</span>
      <span>{label}</span>{index < current && <span className="sr-only"> completed</span>}
    </li>)}
  </ol>;
}
