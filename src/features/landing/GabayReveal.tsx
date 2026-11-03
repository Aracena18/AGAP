import { Fragment, lazy, Suspense, useEffect, useRef, useState, type MouseEventHandler, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowForward, CompareArrows, FindInPage, CalendarToday, Description } from '../../shared/icons';
import { Button } from '../../shared/ui';
import gabay from '../../../design-library/assets/gabay/gabay-front-display.webp';
import gabaySmall from '../../../design-library/assets/gabay/gabay-front-400.webp';
import gabayMedium from '../../../design-library/assets/gabay/gabay-front-800.webp';
import styles from './LandingPage.module.css';

const features = [
  { title: 'Trace the evidence', text: 'Keep facts connected to their sources, dates, and corrections.', Icon: FindInPage },
  { title: 'See cash-flow timing', text: 'Look beyond a monthly total to when everyday needs fall due.', Icon: CalendarToday },
  { title: 'Compare full costs', text: 'Review available repayment dates alongside the complete loan cost.', Icon: CompareArrows },
  { title: 'Keep decisions human', text: 'Carry the evidence and reasoning into a recorded human review.', Icon: Description },
];
export interface RevealContent { intro: ReactNode; notes: ReactNode; mascot: ReactNode; heading: ReactNode; features: ReactNode[]; featureTitles: string[] }
const AnimatedReveal = lazy(() => import('./RevealMotion'));
const motionQuery = '(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)';

// The desktop loading fallback matches its first frame; static clients never fetch Motion.
function RevealFrame({ content, animated }: { content: RevealContent; animated: boolean }) {
  return <div className={styles.stage}>
    <div className={styles.heroCopy}>{content.intro}</div>
    {animated && <div className={styles.sideNotes} aria-hidden="true">{content.notes}</div>}
    <div className={styles.mascot} style={animated ? { transform: 'translate(-50%, -130px) scale(3.2)' } : undefined}>{content.mascot}</div>
    <div className={styles.gabayHeading} style={animated ? { opacity: 0 } : undefined}>{content.heading}</div>
    <div className={styles.featureGrid} style={animated ? { opacity: 0 } : undefined}>{content.features.map((feature, index) => <div className={styles.feature} key={index}>{feature}</div>)}</div>
  </div>;
}
export default function GabayReveal({ onInstall }: { onInstall: MouseEventHandler<HTMLButtonElement> }) {
  const scene = useRef<HTMLElement>(null);
  const [animated, setAnimated] = useState(() => window.matchMedia(motionQuery).matches);
  useEffect(() => {
    const media = window.matchMedia(motionQuery);
    const update = () => setAnimated(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const content: RevealContent = {
    intro: <><h1>AGAP</h1>
      <div className={styles.supportingCopy}><p className={styles.heroTitle}>Loan reviews with<br className={styles.desktopBreak}/> everyday needs in view.</p>
      <p className={styles.heroDescription}>Connect evidence, household cash flow, repayment options, and a recorded human decision.</p></div>
      <div className={styles.heroActions}><Button id="install-hero" className={styles.installButton} onClick={onInstall}>Install AGAP<ArrowForward size={18}/></Button><Link to="/?section=demo" className={styles.textLink}>See AGAP in action</Link></div></>,
    notes: <><p>Everyday needs<br/>in view</p><p>Human decisions,<br/>supported by evidence</p></>,
    mascot: <img src={gabay} srcSet={`${gabaySmall} 400w, ${gabayMedium} 800w, ${gabay} 1600w`} sizes="(prefers-reduced-motion: reduce) min(80vw, 420px), (min-width: 900px) and (min-height: 700px) min(108.8vw, 1472px), (max-width: 767px) min(80vw, 330px), min(80vw, 420px)" width="1600" height="1600" alt="Gabay, AGAP’s friendly green and yellow firefly, with glowing antennae and translucent wings" fetchPriority="high"/>,
    heading: <><h2 id="gabay" tabIndex={-1}>Meet Gabay.</h2><p>AGAP’s friendly guide.<br/>Everyday needs in view.</p></>,
    features: features.map(({ title, text, Icon }) => <Fragment key={title}><Icon size={24}/><h3>{title}</h3><p>{text}</p></Fragment>),
    featureTitles: features.map(feature => feature.title),
  };
  return <section ref={scene} className={`${styles.scene} ${animated ? styles.animated : styles.staticScene}`} aria-label="Introducing AGAP and Gabay">
    {animated ? <Suspense fallback={<RevealFrame content={content} animated/>}><AnimatedReveal scene={scene} content={content}/></Suspense> : <RevealFrame content={content} animated={false}/>}
  </section>;
}
