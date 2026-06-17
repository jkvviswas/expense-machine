import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { motion as tokens } from '../../styles/tokens';

/**
 * PageStage wraps every routed view. It provides:
 *  - the single ambient halo (one source of light per V2)
 *  - the orchestrated staggered entrance (stillness after)
 * Widgets/pages render as direct children and inherit the stagger
 * if they use <StageItem>.
 */
export function PageStage({ children }: { children: ReactNode }) {
  return (
    <div className="em-halo relative">
      <motion.div
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: {
            transition: { staggerChildren: tokens.stagger, delayChildren: 0.05 },
          },
        }}
        className="relative z-[1] mx-auto w-full max-w-content px-5 py-6 sm:px-8 sm:py-10 lg:px-12"
      >
        {children}
      </motion.div>
    </div>
  );
}

/** A single staggered element within a PageStage. */
export function StageItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
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
