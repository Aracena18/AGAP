import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import type { WorkflowFanProps } from './WorkflowGallery';
import styles from './WorkflowGallery.module.css';

function FanItem({ item, index, progress }: { item: WorkflowFanProps['items'][number]; index: number; progress: MotionValue<number> }) {
  const direction = index === 0 ? 1 : index === 2 ? -1 : 0;
  const travel = useTransform(progress, [0, .55, 1], [direction, direction * .18, 0]);
  // Keep the center-stack alignment responsive without measuring card widths on scroll.
  const x = useTransform(travel, value => `calc(${value * 100}% + var(--fan-gap) * ${value})`);
  const y = useTransform(progress, [0, .55, 1], index === 0 ? [14, -22, 24] : index === 2 ? [28, -18, 24] : [0, -15.4, -28]);
  const rotate = useTransform(progress, [0, .55, 1], index === 0 ? [-4, -7, -2] : index === 2 ? [4, 7, 2] : [0, 0, 0]);
  const scale = useTransform(progress, [0, .55, 1], index === 1 ? [1, 1, 1] : [.97, 1, 1]);
  return <li>
    <motion.div className={styles.window} data-fan-window data-scroll-linked style={{ x, y, rotate, scale }}>{item.window}</motion.div>
    <div className={styles.caption}>{item.caption}</div>
  </li>;
}

export default function WorkflowFanMotion({ gallery, items }: WorkflowFanProps) {
  const { scrollYProgress } = useScroll({ target: gallery, offset: ['start 70%', 'start 30%'] });
  return items.map((item, index) => <FanItem key={item.id} item={item} index={index} progress={scrollYProgress}/>);
}
