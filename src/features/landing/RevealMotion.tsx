import { useRef, useState, type RefObject } from 'react';
import { motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import type { RevealContent } from './GabayReveal';
import styles from './LandingPage.module.css';

export default function RevealMotion({ scene, content }: { scene: RefObject<HTMLElement | null>; content: RevealContent }) {
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const [introHidden, setIntroHidden] = useState(false);
  const hidden = useRef(false);
  useMotionValueEvent(scrollYProgress, 'change', progress => {
    const next = progress >= 0.32;
    if (next !== hidden.current) { hidden.current = next; setIntroHidden(next); }
  });
  const scale = useTransform(scrollYProgress, [0, 0.78], [3.2, 1]);
  const y = useTransform(scrollYProgress, [0, 0.78], [-130, -180]);
  const introOpacity = useTransform(scrollYProgress, [0, 0.32], [1, 0]);
  const introY = useTransform(scrollYProgress, [0, 0.32], [0, -32]);
  const detailsOpacity = useTransform(scrollYProgress, [0.42, 0.78], [0, 1]);
  return <div className={styles.stage}>
    <motion.div className={styles.heroCopy} inert={introHidden} style={{ opacity: introOpacity, y: introY }}>{content.intro}</motion.div>
    <motion.div className={styles.sideNotes} style={{ opacity: introOpacity }} aria-hidden="true">{content.notes}</motion.div>
    <motion.div className={styles.mascot} style={{ scale, y, x: '-50%' }}>{content.mascot}</motion.div>
    <motion.div className={styles.gabayHeading} style={{ opacity: detailsOpacity }}>{content.heading}</motion.div>
    <motion.div className={styles.featureGrid} style={{ opacity: detailsOpacity }}>{content.features}</motion.div>
  </div>;
}
