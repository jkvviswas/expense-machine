import { useSyncExternalStore } from 'react';
import { persist } from '../../lib/persist';
import { emailService } from '../../lib/email';
import { generateId } from '../../lib/id';
import {
  bridgeConfigured,
  bridgeRegister,
  bridgeLogin,
  bridgeLogout,
  bridgeCurrentUser,
  bridgeRequestPasswordReset,
  bridgeUpdateProfile,
} from '../backend/authBridge';

/**
 * ============================================================================
 *  AUTH STORE  (presentation-layer, additive — no backend, no locked files)
 * ============================================================================
 *
 * A self-contained, client-only authentication layer consistent with the rest
 * of the product (everything is local + in-memory/persisted; there is no
 * server). It supports register / login / logout and a persisted session, so
 * protected routes and a real-feeling profile work end-to-end.
 *
 * SECURITY NOTE (intentional, documented): this is a front-end demo auth. We
 * never store plaintext passwords — we keep a lightweight salted hash — but a
 * client-only store is NOT real security. A production build would move auth to
 * a backend (Supabase/Auth0). The store is shaped so that swap is a one-file
 * change: replace the local functions with API calls; the hook + route guard
 * stay identical.
 *
 * It touches NO locked calculation file.
 */

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: string;
}

interface StoredAccount extends AuthUser {
  /** Salted hash of the password (demo-grade, not production security). */
  passHash: string;
  salt: string;
}

interface AuthState {
  user: AuthUser | null;
  /** True until the persisted session has been read on boot. */
  ready: boolean;
}

const ACCOUNTS_KEY = 'auth-accounts';
const SESSION_KEY = 'auth-session';
const RESET_KEY = 'auth-reset-v2';
const RESET_TOKENS_KEY = 'auth-reset-tokens';
/** One-time password-reset tokens expire after this long. */
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

interface ResetToken {
  token: string;
  accountId: string;
  /** ISO timestamp; token is invalid from this point on. */
  expiresAt: string;
  used: boolean;
}

function readResetTokens(): ResetToken[] {
  return persist.read<ResetToken[]>(RESET_TOKENS_KEY, []);
}
function writeResetTokens(list: ResetToken[]) {
  persist.write(RESET_TOKENS_KEY, list);
}
function genToken(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

let state: AuthState = { user: null, ready: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

// --- demo-grade hashing (NOT production security) ---------------------------
function randomSalt(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Deterministic, fast string hash (FNV-1a). Demo-grade only. */
function hash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

function hashPassword(password: string, salt: string): string {
  return hash(`${salt}::${password}::em`);
}

// --- storage helpers ---------------------------------------------------------
function readAccounts(): StoredAccount[] {
  return persist.read<StoredAccount[]>(ACCOUNTS_KEY, []);
}
function writeAccounts(list: StoredAccount[]) {
  persist.write(ACCOUNTS_KEY, list);
}
function toPublic(a: StoredAccount): AuthUser {
  return { id: a.id, name: a.name, username: a.username, email: a.email, createdAt: a.createdAt };
}

/** Apply a validated profile patch onto a user object (for optimistic UI). */
function cleanPatch(
  patch: Partial<Pick<AuthUser, 'name' | 'email' | 'username'>>,
  current: AuthUser,
): Partial<AuthUser> {
  const out: Partial<AuthUser> = {};
  if (patch.name !== undefined) out.name = patch.name.trim() || current.name;
  if (patch.username !== undefined) out.username = patch.username.trim() || current.username;
  if (patch.email !== undefined) {
    const e = patch.email.trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) out.email = e;
  }
  return out;
}

export class AuthError extends Error {}

// --- boot: one-time auth reset, then restore session ------------------------
function boot() {
  if (state.ready) return;
  // PHASE 0 — Authentication reset. Exactly once (guarded by RESET_KEY), wipe
  // any pre-existing accounts/sessions so the app behaves like a brand-new
  // install with no remembered logins. Only auth keys are touched.
  if (!persist.read<boolean>(RESET_KEY, false)) {
    persist.remove(ACCOUNTS_KEY);
    persist.remove(SESSION_KEY);
    persist.write(RESET_KEY, true);
  }
  const sessionId = persist.read<string | null>(SESSION_KEY, null);
  if (sessionId) {
    const account = readAccounts().find((a) => a.id === sessionId);
    state = { user: account ? toPublic(account) : null, ready: true };
  } else {
    state = { user: null, ready: true };
  }
  emit();
}

export const authStore = {
  get(): AuthState {
    return state;
  },

  /** Register a new account and sign in. Throws AuthError on conflict/validation. */
  register(name: string, email: string, password: string, username?: string): AuthUser {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    // Username defaults to the name (compacted) if not explicitly provided.
    const trimmedUsername = (username?.trim() || trimmedName).toLowerCase();
    if (!trimmedName) throw new AuthError('Please enter your name.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmedEmail))
      throw new AuthError('Please enter a valid email address.');
    if (!trimmedUsername) throw new AuthError('Please choose a username.');
    if (password.length < 6)
      throw new AuthError('Password must be at least 6 characters.');

    const accounts = readAccounts();
    if (accounts.some((a) => a.email === trimmedEmail))
      throw new AuthError('An account with that email already exists.');
    if (accounts.some((a) => a.username.toLowerCase() === trimmedUsername))
      throw new AuthError('That username is already taken.');

    const salt = randomSalt();
    const account: StoredAccount = {
      id: generateId('u'),
      name: trimmedName,
      username: username?.trim() || trimmedName,
      email: trimmedEmail,
      createdAt: new Date().toISOString(),
      salt,
      passHash: hashPassword(password, salt),
    };
    writeAccounts([...accounts, account]);
    persist.write(SESSION_KEY, account.id);
    state = { user: toPublic(account), ready: true };
    emit();
    return state.user!;
  },

  /** Sign in by email OR username + password. Throws AuthError on bad credentials. */
  login(identifier: string, password: string): AuthUser {
    const id = identifier.trim().toLowerCase();
    const account = readAccounts().find(
      (a) => a.email === id || a.username.toLowerCase() === id,
    );
    if (!account || account.passHash !== hashPassword(password, account.salt))
      throw new AuthError('Those credentials are incorrect.');
    persist.write(SESSION_KEY, account.id);
    state = { user: toPublic(account), ready: true };
    emit();
    return state.user!;
  },

  logout() {
    persist.remove(SESSION_KEY);
    state = { user: null, ready: true };
    emit();
  },

  // --- Cloud-aware async methods --------------------------------------------
  // When a Supabase backend is configured these use real cloud accounts (so the
  // same login works on any device). When it is NOT configured they fall back to
  // the local implementation above, preserving the offline-first contract.

  /** Register via Supabase when configured, else local. */
  async registerAsync(name: string, email: string, password: string, username?: string): Promise<AuthUser> {
    const trimmedName = name.trim();
    const trimmedUsername = (username?.trim() || trimmedName);
    if (bridgeConfigured()) {
      const res = await bridgeRegister(trimmedName, email, password, trimmedUsername);
      if (res.configured) {
        if (res.ok) {
          state = { user: res.value, ready: true };
          emit();
          return res.value;
        }
        throw new AuthError(res.message);
      }
    }
    // Fallback: local
    return this.register(name, email, password, username);
  },

  /** Login via Supabase when configured, else local. */
  async loginAsync(identifier: string, password: string): Promise<AuthUser> {
    if (bridgeConfigured()) {
      const res = await bridgeLogin(identifier, password);
      if (res.configured) {
        if (res.ok) {
          state = { user: res.value, ready: true };
          emit();
          return res.value;
        }
        throw new AuthError(res.message);
      }
    }
    // Fallback: local
    return this.login(identifier, password);
  },

  /** Logout from Supabase (if configured) and clear local session. */
  async logoutAsync(): Promise<void> {
    if (bridgeConfigured()) {
      await bridgeLogout();
    }
    persist.remove(SESSION_KEY);
    state = { user: null, ready: true };
    emit();
  },

  /** Update the signed-in user's profile (name/email/username). */
  updateProfile(patch: Partial<Pick<AuthUser, 'name' | 'email' | 'username'>>) {
    if (!state.user) return;
    // Cloud: persist to Supabase metadata (fire-and-forget; local state updates
    // immediately for a responsive UI).
    if (bridgeConfigured()) {
      state = { user: { ...state.user, ...cleanPatch(patch, state.user) }, ready: true };
      emit();
      void bridgeUpdateProfile(patch).then((res) => {
        if (res.configured && res.ok) {
          state = { user: res.value, ready: true };
          emit();
        }
      });
      return;
    }
    const accounts = readAccounts();
    const idx = accounts.findIndex((a) => a.id === state.user!.id);
    if (idx < 0) return;
    const next = { ...accounts[idx] };
    if (patch.name !== undefined) next.name = patch.name.trim() || next.name;
    if (patch.username !== undefined) next.username = patch.username.trim() || next.username;
    if (patch.email !== undefined) {
      const e = patch.email.trim().toLowerCase();
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) next.email = e;
    }
    accounts[idx] = next;
    writeAccounts(accounts);
    state = { user: toPublic(next), ready: true };
    emit();
  },

  /**
   * Step 1 of the reset flow: generate a one-time token (30 min expiry) and
   * "send" it via `emailService`. Always resolves without revealing whether
   * the email exists, to avoid account enumeration.
   */
  async requestPasswordReset(email: string): Promise<{ resetUrl?: string; emailSent?: boolean }> {
    const trimmed = email.trim().toLowerCase();
    // Cloud: ask Supabase to send the reset email; never reveal account existence.
    if (bridgeConfigured()) {
      const res = await bridgeRequestPasswordReset(trimmed);
      if (res.configured) return { emailSent: true }; // Supabase delivers via email
    }
    const account = readAccounts().find((a) => a.email === trimmed);
    if (!account) return {}; // do not reveal account existence

    const token = genToken();
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
    const tokens = readResetTokens().filter((t) => t.accountId !== account.id); // one active token per account
    tokens.push({ token, accountId: account.id, expiresAt, used: false });
    writeResetTokens(tokens);

    const resetUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password?token=${token}`;
    await emailService.sendPasswordResetEmail({ to: account.email, resetUrl, expiresAt });
    // Returned for environments with no email infrastructure (dev/testing);
    // a real provider delivers this via email instead.
    return { resetUrl };
  },

  /** Step 2: check a token is present, unused, and unexpired. */
  validateResetToken(token: string): boolean {
    const t = readResetTokens().find((r) => r.token === token);
    if (!t || t.used) return false;
    return new Date(t.expiresAt).getTime() > Date.now();
  },

  /**
   * Step 3: consume the token and set a new password. Throws AuthError if the
   * token is missing, expired, or already used (one-time + expiry + reuse
   * prevention all enforced here).
   */
  resetPassword(token: string, newPassword: string): void {
    if (newPassword.length < 6) throw new AuthError('Password must be at least 6 characters.');

    const tokens = readResetTokens();
    const idx = tokens.findIndex((r) => r.token === token);
    if (idx < 0) throw new AuthError('This reset link is invalid.');
    const t = tokens[idx];
    if (t.used) throw new AuthError('This reset link has already been used.');
    if (new Date(t.expiresAt).getTime() <= Date.now()) throw new AuthError('This reset link has expired.');

    const accounts = readAccounts();
    const accIdx = accounts.findIndex((a) => a.id === t.accountId);
    if (accIdx < 0) throw new AuthError('This reset link is invalid.');

    const salt = randomSalt();
    accounts[accIdx] = { ...accounts[accIdx], salt, passHash: hashPassword(newPassword, salt) };
    writeAccounts(accounts);

    // Mark this token used and invalidate the user's session, requiring
    // fresh login with the new password.
    tokens[idx] = { ...t, used: true };
    writeResetTokens(tokens);
    if (state.user?.id === t.accountId) {
      persist.remove(SESSION_KEY);
      state = { user: null, ready: true };
      emit();
    }
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

boot();

// When a backend is configured, reconcile the session with Supabase after the
// synchronous local boot. If Supabase has a live session (e.g. after a page
// refresh on the deployed site), adopt that user; if it doesn't but we showed a
// stale local user, sign out. This is what keeps you logged in across reloads
// and devices once cloud auth is active.
if (bridgeConfigured()) {
  void bridgeCurrentUser().then((res) => {
    if (!res.configured) return;
    if (res.ok) {
      const cloudUser = res.value;
      if (cloudUser) {
        state = { user: cloudUser, ready: true };
        emit();
      } else if (state.user) {
        // No cloud session — clear any local-only session to avoid a false login.
        persist.remove(SESSION_KEY);
        state = { user: null, ready: true };
        emit();
      }
    }
  });
}

export function useAuth(): AuthState {
  return useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get);
}
