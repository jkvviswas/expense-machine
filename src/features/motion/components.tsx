import { motion, type HTMLMotionProps } from 'framer-motion';
import { type ReactNode } from 'react';
import { staggerContainer, riseItem, spring } from './primitives';

/** Shimmer skeleton block. Width/height/className via props. */
export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={`em-skeleton ${className}`} style={style} aria-hidden />;
}

/** A spring-press button wrapper (use for primary CTAs). */
export function SpringButton({
  children,
  className = '',
  ...rest
}: HTMLMotionProps<'button'> & { children: ReactNode }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      whileHover={{ y: -1 }}
      transition={spring}
      className={className}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

/** Staggered container — children should be <StaggerItem>. */
export function Stagger({
  children,
  className = '',
  stagger = 0.07,
  delay = 0.04,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  return (
    <motion.div
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      animate="show"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** A single staggered child that rises in. */
export function StaggerItem({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={riseItem} className={className}>
      {children}
    </motion.div>
  );
}
