import { useEffect, useRef, useState } from 'react';
import { CalendarToday, Description, FindInPage } from '../../shared/icons';
import styles from './WorkflowGallery.module.css';

const steps = [
  { id: 'evidence', title: 'Evidence', text: 'Inspect and clarify the facts.', Icon: FindInPage },
  { id: 'cash-flow', title: 'Cash flow', text: 'Check needs, dates, and costs.', Icon: CalendarToday },
  { id: 'decision', title: 'Human review', text: 'Record the decision and why.', Icon: Description },
];
const query = '(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';
type Phase = 'waiting' | 'opening' | 'settled' | 'static';

export default function WorkflowGallery() {
  const gallery = useRef<HTMLOListElement>(null);
  const played = useRef(false);
  const [phase, setPhase] = useState<Phase>(() => 'IntersectionObserver' in window && window.matchMedia(query).matches ? 'waiting' : 'static');
  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setPhase(media.matches && 'IntersectionObserver' in window ? played.current ? 'settled' : 'waiting' : 'static');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (phase !== 'waiting' || !gallery.current) return;
    let cancelled = false;
    const element = gallery.current;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      void Promise.allSettled(Array.from(element.querySelectorAll('img'), image => image.decode())).then(() => {
        if (!cancelled) { played.current = true; setPhase('opening'); }
      });
    }, { threshold: .25 });
    observer.observe(element);
    return () => { cancelled = true; observer.disconnect(); };
  }, [phase]);
  return <ol ref={gallery} className={styles.fan} data-workflow-fan data-phase={phase} aria-label="The AGAP review journey">
    {steps.map((step, index) => <li key={step.id}>
      <div className={styles.window} onAnimationEnd={index === 2 ? () => setPhase('settled') : undefined}>
        <div className={styles.chrome} aria-hidden="true"><span>AGAP</span><span><step.Icon size={16}/>{step.title}</span></div>
        <div className={styles.preview}><step.Icon className={styles.fallback} size={48}/><img src={`${import.meta.env.BASE_URL}landing/${step.id}.webp`} alt="" width="1366" height="850" loading="lazy" decoding="async" onError={event => { event.currentTarget.hidden = true; }}/></div>
      </div>
      <div className={styles.caption}><span aria-hidden="true">{index + 1}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></div>
    </li>)}
  </ol>;
}
