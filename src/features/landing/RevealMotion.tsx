import { useRef, useState, type RefObject } from 'react';
import { cubicBezier, motion, useMotionValueEvent, useScroll, useTransform } from 'motion/react';
import type { RevealContent } from './GabayReveal';
import styles from './LandingPage.module.css';

const cameraEase = cubicBezier(0.4, 0, 0.2, 1);
const arrivalEase = cubicBezier(0.16, 1, 0.3, 1);

export default function RevealMotion({ scene, content }: { scene: RefObject<HTMLElement | null>; content: RevealContent }) {
  const { scrollYProgress } = useScroll({ target: scene, offset: ['start start', 'end end'] });
  const [introHidden, setIntroHidden] = useState(false);
  const hidden = useRef(false);
  useMotionValueEvent(scrollYProgress, 'change', progress => {
    const next = progress >= 0.32;
    if (next !== hidden.current) { hidden.current = next; setIntroHidden(next); }
  });
  // Remotion's timing guidance: explicit clamped beats and perceptual scale.
  // Use log space so equal progress changes the apparent size proportionally.
  // Direct scroll values keep navigation and reverse scrolling exact, without spring lag.
  const logScale = useTransform(scrollYProgress, [0.06, 0.78], [Math.log(3.2), 0], { ease: cameraEase });
  const scale = useTransform(() => Math.exp(logScale.get()));
  const y = useTransform(scrollYProgress, [0.06, 0.78], [-130, -180], { ease: cameraEase });
  const introOpacity = useTransform(scrollYProgress, [0.04, 0.32], [1, 0]);
  const introY = useTransform(scrollYProgress, [0.04, 0.32], [0, -48], { ease: cameraEase });
  const headingOpacity = useTransform(scrollYProgress, [0.44, 0.62], [0, 1]);
  const headingY = useTransform(scrollYProgress, [0.44, 0.66], [16, 0], { ease: arrivalEase });
  const firstOpacity = useTransform(scrollYProgress, [0.56, 0.74], [0, 1]);
  const secondOpacity = useTransform(scrollYProgress, [0.65, 0.83], [0, 1]);
  const leftX = useTransform(scrollYProgress, [0.56, 0.8], [24, 0], { ease: arrivalEase });
  const rightX = useTransform(scrollYProgress, [0.56, 0.8], [-24, 0], { ease: arrivalEase });
  return <div className={styles.stage}>
    <motion.div className={styles.heroCopy} inert={introHidden} style={{ opacity: introOpacity, y: introY }}>{content.intro}</motion.div>
    <motion.div className={styles.sideNotes} style={{ opacity: introOpacity }} aria-hidden="true">{content.notes}</motion.div>
    <motion.div className={styles.mascot} style={{ scale, y, x: '-50%' }}>{content.mascot}</motion.div>
    <motion.div className={styles.gabayHeading} style={{ opacity: headingOpacity, y: headingY }}>{content.heading}</motion.div>
    <div className={styles.featureGrid}>{content.features.map((feature, index) => <motion.div key={index} className={styles.feature} style={{ opacity: index % 2 === 0 ? firstOpacity : secondOpacity, x: index < 2 ? leftX : rightX }}>{feature}</motion.div>)}</div>
  </div>;
}
