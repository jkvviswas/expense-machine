import { useEffect, type ReactNode } from 'react';
import { themeStore, useResolvedTheme, type ThemeMode } from './store';

/**
 * Applies the resolved theme to <html data-theme> and keeps it in sync with the
 * store. The actual color change is a CSS-variable swap; index.css tweens the
 * broad surfaces. When the View Transitions API is available, the swap is
 * wrapped in a document transition for a polished cross-fade.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const resolved = useResolvedTheme();

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
  }, [resolved]);

  return <>{children}</>;
}

/** Apply theme to <html> immediately (used at boot before React paints). */
export function applyThemeAtBoot() {
  const root = document.documentElement;
  root.setAttribute('data-theme', themeStore.getResolved());
}

/**
 * Change theme mode with an animated transition where supported. We use the
 * View Transitions API so the whole document cross-fades; otherwise the CSS
 * variable tween in index.css handles it gracefully.
 */
export function setThemeMode(next: ThemeMode) {
  const prefersReduced =
    typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void> };
  };

  if (!prefersReduced && typeof doc.startViewTransition === 'function') {
    doc.startViewTransition(() => {
      themeStore.set(next);
      document.documentElement.setAttribute('data-theme', themeStore.getResolved());
    });
  } else {
    themeStore.set(next);
    document.documentElement.setAttribute('data-theme', themeStore.getResolved());
  }
}
