import { useRef, useState, type RefObject } from 'react';
import { cubicBezier, motion, useMotionValueEvent, useScroll, useTransform, type MotionValue } from 'motion/react';
import type { RevealContent } from './GabayReveal';
import { BrandMark } from './BrandMark';
import { story } from './story';
import Turnaround from './Turnaround';
import styles from './LandingPage.module.css';

const cameraEase = cubicBezier(0.4, 0, 0.2, 1);
const arrivalEase = cubicBezier(0.16, 1, 0.3, 1);

function Feature({ index, current, progress, children }: { index: number; current: number; progress: MotionValue<number>; children: React.ReactNode }) {
  const beat = story[index];
  const last = index === story.length - 1;
  const range = last ? [beat.enter - .025, beat.enter, 1] : [beat.enter - .025, beat.enter, beat.exit, beat.exit + .025];
  const opacity = useTransform(progress, range, last ? [0, 1, 1] : [0, 1, 1, 0]);
  const y = useTransform(progress, range, last ? [12, 0, 0] : [12, 0, 0, -12], { ease: arrivalEase });
  return <motion.div className={styles.feature} aria-hidden={current !== index} inert={current !== index} style={{ opacity, y }}>{children}</motion.div>;
}

export default function RevealMotion({ scene, content }: { scene: RefObject<HTMLElement | null>; content: RevealContent }) {
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const [phase, setPhase] = useState({ introHidden: false, controlsReady: false, feature: 0 });
  const phaseRef = useRef(phase);
  useMotionValueEvent(scrollYProgress, 'change', progress => {
    const next = { introHidden: progress >= .16, controlsReady: progress >= .23, feature: progress < .43 ? 0 : progress < .63 ? 1 : progress < .82 ? 2 : 3 };
    if (next.introHidden !== phaseRef.current.introHidden || next.controlsReady !== phaseRef.current.controlsReady || next.feature !== phaseRef.current.feature) {
      phaseRef.current = next; setPhase(next);
    }
  });
  // Remotion-guided clamped beats; proportional scaling stays exactly attached to scroll.
  const logScale = useTransform(scrollYProgress, [.015, .235], [Math.log(3.2), Math.log(1.08)], { ease: cameraEase });
  const scale = useTransform(() => Math.exp(logScale.get()));
  const y = useTransform(scrollYProgress, [.015, .235], [-130, -220], { ease: cameraEase });
  const x = useTransform(scrollYProgress, [.015, .235], ['-50%', '-6%'], { ease: cameraEase });
  const introOpacity = useTransform(scrollYProgress, [.01, .16], [1, 0]);
  const introY = useTransform(scrollYProgress, [.01, .16], [0, -48], { ease: cameraEase });
  const headingOpacity = useTransform(scrollYProgress, [.16, .23], [0, 1]);
  const headingY = useTransform(scrollYProgress, [.16, .24], [16, 0], { ease: arrivalEase });
  const angle = useTransform(scrollYProgress, [0, .34, .42, .49, .59, .67, .77, .84, .90, .98, 1], [0, 0, 45, 90, 90, 180, 180, 270, 315, 360, 360], { ease: cameraEase });
  function visit(index: number) {
    const element = scene.current;
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + (element.offsetHeight - window.innerHeight) * story[index].anchor, behavior: 'smooth' });
  }
  return <div className={styles.stage}>
    {phase.introHidden && <h1 className="sr-only">AGAP</h1>}
    <motion.div className={styles.heroCopy} inert={phase.introHidden} style={{ opacity: introOpacity, y: introY }}>{content.intro}</motion.div>
    <motion.div className={styles.sideNotes} style={{ opacity: introOpacity }} aria-hidden="true">{content.notes}</motion.div>
    <motion.div className={styles.gabayWorld} style={{ opacity: headingOpacity }} aria-hidden="true"><BrandMark className={styles.worldMark}/><div className={styles.orbit}/></motion.div>
    <motion.div className={styles.mascot} style={{ scale, y, x }}><Turnaround angle={angle} fallback={content.mascot}/></motion.div>
    <motion.div className={styles.gabayHeading} style={{ opacity: headingOpacity, y: headingY }}>{content.heading}</motion.div>
    <div className={styles.featureGrid}>{content.features.map((feature, index) => <Feature key={index} index={index} current={phase.feature} progress={scrollYProgress}>{feature}</Feature>)}</div>
    <motion.ol className={styles.storyNavigation} aria-label="Explore AGAP features" aria-hidden={!phase.controlsReady} inert={!phase.controlsReady} style={{ opacity: headingOpacity }}>
      {content.featureTitles.map((title, index) => <li key={title}><button type="button" aria-label={`Show feature ${index + 1}: ${title}`} aria-current={phase.feature === index ? 'step' : undefined} onClick={() => visit(index)}>{index + 1}</button></li>)}
    </motion.ol>
  </div>;
}
