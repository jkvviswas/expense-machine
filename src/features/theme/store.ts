import { useSyncExternalStore } from 'react';
import { persist } from '../../lib/persist';

/**
 * ============================================================================
 *  THEME STORE  (presentation-layer, additive)
 * ============================================================================
 *
 * Manages the user's appearance preference — 'light' | 'dark' | 'system' —
 * persisted across sessions. 'system' tracks the OS preference live. The
 * RESOLVED theme ('light' | 'dark') is what the provider writes to
 * <html data-theme>, driving the CSS variable palettes in index.css.
 *
 * This is pure presentation: it touches no locked file and no calculation.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const KEY = 'theme';

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let mode: ThemeMode = load();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): ThemeMode {
  const v = persist.read<ThemeMode | null>(KEY, null);
  return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark';
}

export function resolveTheme(m: ThemeMode = mode): ResolvedTheme {
  if (m === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return m;
}

export const themeStore = {
  getMode: (): ThemeMode => mode,
  getResolved: (): ResolvedTheme => resolveTheme(mode),
  set(next: ThemeMode) {
    mode = next;
    persist.write(KEY, next);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    // Re-emit when the OS preference changes while in 'system' mode.
    let mql: MediaQueryList | null = null;
    const onSystem = () => {
      if (mode === 'system') emit();
    };
    if (typeof window !== 'undefined' && window.matchMedia) {
      mql = window.matchMedia('(prefers-color-scheme: dark)');
      mql.addEventListener?.('change', onSystem);
    }
    return () => {
      listeners.delete(l);
      mql?.removeEventListener?.('change', onSystem);
    };
  },
};

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getMode, themeStore.getMode);
}

export function useResolvedTheme(): ResolvedTheme {
  return useSyncExternalStore(themeStore.subscribe, themeStore.getResolved, themeStore.getResolved);
}
