import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { useResolvedTheme } from '../theme/store';
import { setThemeMode } from '../theme/ThemeProvider';

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * A small, premium light/dark switch for the landing navbar. Reuses the app's
 * existing theme store (View-Transitions cross-fade, persisted preference) — no
 * new colors, no new palette. The knob slides between a sun and a moon.
 */
export function ThemeToggle() {
  const resolved = useResolvedTheme();
  const dark = resolved === 'dark';

  return (
    <button
      type="button"
      onClick={() => setThemeMode(dark ? 'light' : 'dark')}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="relative flex h-8 w-[58px] items-center rounded-focal border border-hairline bg-surface px-1 transition-colors hover:border-brass-deep"
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="flex h-6 w-6 items-center justify-center rounded-full bg-brass text-void"
        style={{ marginLeft: dark ? 0 : 'auto' }}
      >
        <motion.span
          key={dark ? 'moon' : 'sun'}
          initial={{ opacity: 0, rotate: -30 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {dark ? <Moon size={13} strokeWidth={2} /> : <Sun size={13} strokeWidth={2} />}
        </motion.span>
      </motion.span>
    </button>
  );
}
