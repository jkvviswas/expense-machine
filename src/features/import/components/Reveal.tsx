import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { motion as tokens } from '../../../styles/tokens';

/**
 * A self-contained staggered reveal. Unlike the shell's PageStage (which
 * orchestrates once on initial mount), this re-runs its entrance every time
 * it mounts — which is exactly what we need for screens that swap inside an
 * AnimatePresence within a single route. Use <Reveal> as the container and
 * <RevealItem> for each staggered child.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: tokens.stagger, delayChildren: 0.04 },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: tokens.durationBase, ease: tokens.ease },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
