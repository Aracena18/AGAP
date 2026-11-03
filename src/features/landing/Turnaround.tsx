import { useEffect, useState, type ReactNode } from 'react';
import { motion, useTransform, type MotionValue } from 'motion/react';
import front from '../../../design-library/assets/gabay/gabay-front-display.webp';
import quarterRight from '../../../design-library/assets/gabay/turnaround/gabay-three-quarter-right.webp';
import right from '../../../design-library/assets/gabay/turnaround/gabay-profile-right.webp';
import back from '../../../design-library/assets/gabay/turnaround/gabay-back.webp';
import left from '../../../design-library/assets/gabay/turnaround/gabay-profile-left.webp';
import quarterLeft from '../../../design-library/assets/gabay/turnaround/gabay-three-quarter-left.webp';
import styles from './LandingPage.module.css';

const views = [
  { src: front, angle: 0 }, { src: quarterRight, angle: 45 },
  { src: right, angle: 90 }, { src: back, angle: 180 },
  { src: left, angle: 270 }, { src: quarterLeft, angle: 315 },
  { src: front, angle: 360 },
];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function View({ index, angle }: { index: number; angle: MotionValue<number> }) {
  const view = views[index];
  const opacity = useTransform(angle, value => {
    // Short blends around each midpoint avoid long double silhouettes.
    const enter = index === 0 ? 1 : clamp((value - (views[index - 1].angle + view.angle) / 2 + 6) / 12);
    const exit = index === views.length - 1 ? 1 : clamp(((view.angle + views[index + 1].angle) / 2 + 6 - value) / 12);
    return Math.min(enter, exit);
  });
  const rotateY = useTransform(angle, value => Math.max(-10, Math.min(10, (value - view.angle) * .18)));
  return <motion.img src={view.src} data-angle={view.angle} width="1600" height="1600" alt="" decoding="async" style={{ opacity, rotateY }}/>;
}

export default function Turnaround({ angle, fallback }: { angle: MotionValue<number>; fallback: ReactNode }) {
  const [ready, setReady] = useState(false);
  // Only mounted on the motion-enabled desktop. Defer the extra artwork until paint.
  useEffect(() => {
    let cancelled = false;
    const preload = () => {
      void Promise.all([...new Set(views.map(view => view.src))].map(src => {
        const image = new Image(); image.decoding = 'async'; image.fetchPriority = 'low'; image.src = src;
        return image.decode();
      })).then(() => { if (!cancelled) setReady(true); }).catch(() => { /* Keep the front view when any turn asset is unavailable. */ });
    };
    const idle = window.setTimeout(preload, 700);
    return () => { cancelled = true; window.clearTimeout(idle); };
  }, []);
  if (!ready) return fallback;
  return <div className={styles.turntable} role="img" aria-label="Gabay, AGAP’s friendly green and yellow firefly, turning through front, side, and back views">
    {views.map((view, index) => <View key={view.angle} index={index} angle={angle}/>)}
  </div>;
}
