import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';

/**
 * SETTINGS STORE (presentation/UX state only).
 * These preferences capture user intent for the UI. IMPORTANT: they do NOT
 * feed into the locked Safe-to-Spend / budget / transaction calculations in
 * this version — wiring finance preferences into the derivation layer is a
 * deliberate future step (it would require touching locked formulas). For now
 * the store records the user's choices and the app reads presentation-level
 * ones (e.g. default export format).
 */

export interface Settings {
  // Profile
  name: string;
  email: string;
  // Optional profile fields (all optional, never required)
  dateOfBirth: string; // ISO yyyy-mm-dd, '' when unset
  occupation: string;
  city: string;
  gender: string;
  // Appearance
  reduceMotion: boolean;
  denseTables: boolean;
  highContrast: boolean;
  // Finance preferences (recorded; not yet wired to locked formulas)
  currency: string; // ISO 4217 code, e.g. 'INR', 'USD'
  referenceMonth: 'auto' | 'latest';
  safeToSpendBuffer: number; // percent
  budgetWarnings: boolean;
  // Regional preferences (presentation-layer localization)
  country: string; // ISO 3166-1 alpha-2, e.g. 'IN'
  timezone: string; // IANA, e.g. 'Asia/Kolkata'
  dateFormat: 'dmy' | 'mdy' | 'ymd';
  numberFormat: 'en-IN' | 'en-US' | 'en-GB' | 'de-DE';
  // Reporting
  defaultExport: 'xlsx' | 'pdf';
  reportStyle: 'executive' | 'detailed';
  // Import
  autoCategorize: boolean;
  duplicateDetection: boolean;
}

const DEFAULTS: Settings = {
  name: '',
  email: '',
  dateOfBirth: '',
  occupation: '',
  city: '',
  gender: '',
  reduceMotion: false,
  denseTables: false,
  highContrast: false,
  currency: 'INR',
  referenceMonth: 'latest',
  safeToSpendBuffer: 10,
  budgetWarnings: true,
  country: 'IN',
  timezone: 'Asia/Kolkata',
  dateFormat: 'dmy',
  numberFormat: 'en-IN',
  defaultExport: 'xlsx',
  reportStyle: 'executive',
  autoCategorize: true,
  duplicateDetection: true,
};

let state: Settings = hydrateSettings();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** Load persisted settings, merged over defaults so new keys get defaults. */
function hydrateSettings(): Settings {
  const saved = persist.read<Partial<Settings> | null>(STORAGE_KEYS.settings, null);
  const merged = saved ? { ...DEFAULTS, ...saved } : { ...DEFAULTS };
  // Scrub legacy demo identity persisted by earlier builds so it can never
  // resurface in the profile or a backup. The authenticated user is the source
  // of truth for identity.
  if (merged.name.trim().toLowerCase() === 'vikram') merged.name = '';
  if (merged.email.trim().toLowerCase() === 'vikram@example.in') merged.email = '';
  return merged;
}

export const settingsStore = {
  get: () => state,
  set<K extends keyof Settings>(key: K, value: Settings[K]) {
    state = { ...state, [key]: value };
    persist.write(STORAGE_KEYS.settings, state);
    emit();
  },
  reset() {
    state = { ...DEFAULTS };
    persist.write(STORAGE_KEYS.settings, state);
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useSettings(): Settings {
  return useSyncExternalStore(settingsStore.subscribe, settingsStore.get, settingsStore.get);
}
