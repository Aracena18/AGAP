import { lazy, Suspense, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { CalendarToday, Description, FindInPage } from '../../shared/icons';
import styles from './WorkflowGallery.module.css';

const steps = [
  { id: 'evidence', title: 'Evidence', text: 'Inspect and clarify the facts.', Icon: FindInPage },
  { id: 'cash-flow', title: 'Cash flow', text: 'Check needs, dates, and costs.', Icon: CalendarToday },
  { id: 'decision', title: 'Human review', text: 'Record the decision and why.', Icon: Description },
];
const query = '(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';
export interface WorkflowFanProps { gallery: RefObject<HTMLOListElement | null>; items: { id: string; window: ReactNode; caption: ReactNode }[] }
function StaticFan({ items }: WorkflowFanProps) {
  return items.map(item => <li key={item.id}><div className={styles.window} data-fan-window>{item.window}</div><div className={styles.caption}>{item.caption}</div></li>);
}
const ScrollFan = lazy(() => import('./WorkflowFanMotion').catch(() => ({ default: StaticFan })));

export default function WorkflowGallery() {
  const gallery = useRef<HTMLOListElement>(null);
  const [animated, setAnimated] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setAnimated(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const items = steps.map((step, index) => ({
    id: step.id,
    window: <>
        <div className={styles.chrome} aria-hidden="true"><span>AGAP</span><span><step.Icon size={16}/>{step.title}</span></div>
        <div className={styles.preview}><step.Icon className={styles.fallback} size={48}/><img src={`${import.meta.env.BASE_URL}landing/${step.id}.webp`} alt="" width="1366" height="850" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true; }}/></div>
    </>,
    caption: <><span aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></>,
  }));
  const props = { gallery, items };
  return <ol ref={gallery} className={styles.fan} data-workflow-fan data-mode={animated ? 'scroll' : 'static'} aria-label="The AGAP review journey">
    {animated ? <Suspense fallback={<StaticFan {...props}/>}><ScrollFan {...props}/></Suspense> : <StaticFan {...props}/>}
  </ol>;
}
