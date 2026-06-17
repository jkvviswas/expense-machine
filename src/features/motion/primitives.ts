import { type Variants, type Transition } from 'framer-motion';

/**
 * ============================================================================
 *  MOTION PRIMITIVES  (Phase: premium motion)
 * ============================================================================
 *
 * One easing curve, restrained durations — consistent with the V2 motion rule
 * ("stillness is the default; nothing bounces; nothing is fast"). These shared
 * variants give the whole app a coherent, Linear/Vercel-quality feel without
 * each component reinventing timings.
 */

export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const DUR = {
  fast: 0.32,
  base: 0.55,
  slow: 0.85,
} as const;

export const spring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 32,
  mass: 0.7,
};

/** Container that staggers its children in. */
export const staggerContainer = (stagger = 0.07, delayChildren = 0.04): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren },
  },
});

/** A child item that rises and fades in. */
export const riseItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};

/** A softer fade for large blocks. */
export const fadeItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};

/** Page-to-page transition (used by the route shell). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 10 },
  enter: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DUR.fast, ease: EASE } },
};

/** Scale+fade for modals. */
export const modalVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.fast, ease: EASE } },
  exit: { opacity: 0, y: 14, scale: 0.985, transition: { duration: 0.2, ease: EASE } },
};

/** Slide-in for drawers (from the right). */
export const drawerVariants: Variants = {
  hidden: { x: '100%' },
  show: { x: 0, transition: { duration: DUR.base, ease: EASE } },
  exit: { x: '100%', transition: { duration: DUR.fast, ease: EASE } },
};

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
