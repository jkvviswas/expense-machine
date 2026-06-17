import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Smooth-scroll to an element id within the page (offset for the sticky nav). */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 72;
  window.scrollTo({ top, behavior: 'smooth' });
}

/**
 * The primary, majestic CTA. A brass fill with a soft inner rim, a slow
 * traveling sheen, and a gentle lift on hover. Used for the page's most
 * important actions (Register / Launch). Keep to one or two per view.
 */
export function MajesticButton({
  children,
  onClick,
  className,
  variant = 'solid',
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'solid' | 'ghost';
}) {
  if (variant === 'ghost') {
    return (
      <motion.button
        type="button"
        onClick={onClick}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.3, ease: EASE }}
        className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-control border border-hairline px-7 py-3.5 text-[0.92rem] text-soft transition-colors hover:border-brass-deep hover:text-bright ${className ?? ''}`}
      >
        {children}
      </motion.button>
    );
  }
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.3, ease: EASE }}
      className={`group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-control bg-brass px-8 py-4 text-[0.96rem] font-medium text-void ${className ?? ''}`}
      style={{ boxShadow: '0 8px 30px var(--em-glow-focal), inset 0 0 0 1px rgba(255,255,255,0.12)' }}
    >
      {/* traveling sheen */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/35 to-transparent transition-transform duration-700 ease-lux group-hover:translate-x-full"
      />
      <span className="relative flex items-center gap-2">{children}</span>
    </motion.button>
  );
}
