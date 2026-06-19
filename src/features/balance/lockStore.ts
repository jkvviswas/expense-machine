import { useSyncExternalStore } from 'react';
import { persist, STORAGE_KEYS } from '../../lib/persist';

/**
 * ============================================================================
 *  BALANCE PRIVACY (Balance Lock)
 * ============================================================================
 *
 * Optional privacy mode for the dashboard's Current Balance figure ONLY. When
 * enabled, the user sets a 4-digit PIN; the balance renders as •••••••• until
 * unlocked with the PIN. The *unlocked* state lives in memory only, so it
 * resets on refresh and logout, and auto-hides after an inactivity timeout.
 *
 * This never locks Transactions, Reports, or Analytics — it only masks the
 * single Current Balance number. The PIN is a salted hash (demo-grade, like the
 * app's auth) — privacy from over-the-shoulder viewing, not cryptographic
 * security.
 */

interface LockConfig {
  enabled: boolean;
  salt: string;
  pinHash: string;
}

const INACTIVITY_MS = 60_000; // re-hide after 60s of no activity

function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}
function randomSalt(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}
function hashPin(pin: string, salt: string): string {
  return hash(`${salt}::${pin}::balance`);
}

let config: LockConfig = persist.read<LockConfig>(STORAGE_KEYS.balanceLock, {
  enabled: false,
  salt: '',
  pinHash: '',
});

// In-memory only — never persisted, so refresh/logout re-hides the balance.
let unlocked = false;
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const save = () => persist.write(STORAGE_KEYS.balanceLock, config);

function armInactivity() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    unlocked = false;
    emit();
  }, INACTIVITY_MS);
}

export const balanceLockStore = {
  isEnabled(): boolean {
    return config.enabled;
  },
  /** True when the balance should be masked (enabled AND not currently unlocked). */
  isLocked(): boolean {
    return config.enabled && !unlocked;
  },
  /** Enable lock with a fresh 4-digit PIN. */
  enable(pin: string): boolean {
    if (!/^\d{4}$/.test(pin)) return false;
    const salt = randomSalt();
    config = { enabled: true, salt, pinHash: hashPin(pin, salt) };
    unlocked = false;
    save();
    emit();
    return true;
  },
  /** Disable lock (requires the current PIN). */
  disable(pin: string): boolean {
    if (!this.verify(pin)) return false;
    config = { enabled: false, salt: '', pinHash: '' };
    unlocked = false;
    save();
    emit();
    return true;
  },
  verify(pin: string): boolean {
    if (!config.enabled) return true;
    return config.pinHash === hashPin(pin, config.salt);
  },
  /** Attempt to reveal the balance with a PIN. */
  unlock(pin: string): boolean {
    if (!this.verify(pin)) return false;
    unlocked = true;
    armInactivity();
    emit();
    return true;
  },
  /** Re-hide immediately (used on logout). */
  lock() {
    unlocked = false;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    emit();
  },
  /** Extend the inactivity window on user activity while unlocked. */
  touch() {
    if (unlocked) armInactivity();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Reactive lock state: { enabled, locked }. */
export function useBalanceLock(): { enabled: boolean; locked: boolean } {
  return useSyncExternalStore(
    balanceLockStore.subscribe,
    () => snapshot(),
    () => snapshot(),
  );
}

let cached = { enabled: false, locked: false };
function snapshot() {
  const next = { enabled: balanceLockStore.isEnabled(), locked: balanceLockStore.isLocked() };
  if (next.enabled !== cached.enabled || next.locked !== cached.locked) cached = next;
  return cached;
}
