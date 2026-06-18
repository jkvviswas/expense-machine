import { getSupabase } from './client';
import { isBackendConfigured } from './config';

/**
 * ============================================================================
 *  SUPABASE AUTH BRIDGE
 * ============================================================================
 *
 * Thin async wrappers over Supabase Auth used by the auth store WHEN a backend
 * is configured (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY present). When no
 * backend is configured every function reports `configured: false` and the
 * store falls back to its offline-first local implementation, preserving the
 * app's "runs fully offline" contract.
 *
 * Maps a Supabase user into the app's existing AuthUser shape so the rest of
 * the app (hook, route guard, profile, header) is unchanged.
 */

export interface BridgeUser {
  id: string;
  name: string;
  username: string;
  email: string;
  createdAt: string;
}

type Result<T> = { configured: false } | { configured: true; ok: true; value: T } | { configured: true; ok: false; message: string };

function mapUser(u: { id: string; email?: string | null; created_at?: string; user_metadata?: Record<string, unknown> }): BridgeUser {
  const meta = u.user_metadata ?? {};
  const email = (u.email ?? '').toLowerCase();
  const name = (meta.name as string) || (meta.full_name as string) || email.split('@')[0] || 'You';
  const username = (meta.username as string) || email.split('@')[0] || 'you';
  return {
    id: u.id,
    name,
    username,
    email,
    createdAt: u.created_at ?? new Date().toISOString(),
  };
}

export function bridgeConfigured(): boolean {
  return isBackendConfigured();
}

export async function bridgeRegister(
  name: string,
  email: string,
  password: string,
  username: string,
): Promise<Result<BridgeUser>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { name: name.trim(), username: username.trim() } },
  });
  if (error) return { configured: true, ok: false, message: error.message };
  if (!data.user) {
    // Email-confirmation flow: no session yet. Tell the caller cleanly.
    return { configured: true, ok: false, message: 'Check your email to confirm your account, then sign in.' };
  }
  return { configured: true, ok: true, value: mapUser(data.user) };
}

export async function bridgeLogin(identifier: string, password: string): Promise<Result<BridgeUser>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const id = identifier.trim().toLowerCase();
  // Supabase authenticates by email. If the identifier isn't an email, guide
  // the user to use their email rather than failing cryptically.
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(id)) {
    return { configured: true, ok: false, message: 'Please sign in with your email address.' };
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email: id, password });
  if (error) return { configured: true, ok: false, message: 'Those credentials are incorrect.' };
  return { configured: true, ok: true, value: mapUser(data.user) };
}

/** Update the signed-in user's display name / username in Supabase metadata. */
export async function bridgeUpdateProfile(
  patch: { name?: string; username?: string; email?: string },
): Promise<Result<BridgeUser>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const attrs: { email?: string; data?: Record<string, unknown> } = {};
  const meta: Record<string, unknown> = {};
  if (patch.name !== undefined) meta.name = patch.name.trim();
  if (patch.username !== undefined) meta.username = patch.username.trim();
  if (Object.keys(meta).length) attrs.data = meta;
  if (patch.email !== undefined) {
    const e = patch.email.trim().toLowerCase();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) attrs.email = e;
  }
  const { data, error } = await supabase.auth.updateUser(attrs);
  if (error) return { configured: true, ok: false, message: error.message };
  if (!data.user) return { configured: true, ok: false, message: 'Could not update profile.' };
  return { configured: true, ok: true, value: mapUser(data.user) };
}

export async function bridgeLogout(): Promise<void> {
  if (!isBackendConfigured()) return;
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/** Returns the currently signed-in Supabase user (for session restore on boot). */
export async function bridgeCurrentUser(): Promise<Result<BridgeUser | null>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const { data } = await supabase.auth.getUser();
  return { configured: true, ok: true, value: data.user ? mapUser(data.user) : null };
}

export async function bridgeRequestPasswordReset(email: string): Promise<Result<null>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
  if (error) return { configured: true, ok: false, message: error.message };
  return { configured: true, ok: true, value: null };
}

/**
 * After a user clicks the reset link in their email, Supabase establishes a
 * temporary "recovery" session by parsing the token in the URL. This can land a
 * moment after page load, so we listen briefly for the auth event before giving
 * up — avoiding a race where the page reads the session too early and wrongly
 * shows "invalid link". Resolves true once a session exists.
 */
export async function bridgeHasRecoverySession(timeoutMs = 4000): Promise<Result<boolean>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };

  const existing = await supabase.auth.getSession();
  if (existing.data.session) return { configured: true, ok: true, value: true };

  return new Promise<Result<boolean>>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      try { sub.data.subscription.unsubscribe(); } catch { /* noop */ }
      clearTimeout(timer);
      resolve({ configured: true, ok: true, value });
    };
    const sub = supabase.auth.onAuthStateChange((event, session) => {
      if (session || event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        finish(!!session || event === 'PASSWORD_RECOVERY');
      }
    });
    const timer = setTimeout(async () => {
      const again = await supabase.auth.getSession();
      finish(!!again.data.session);
    }, timeoutMs);
  });
}

/** Set a new password for the user in the current (recovery) session. */
export async function bridgeUpdatePassword(newPassword: string): Promise<Result<null>> {
  if (!isBackendConfigured()) return { configured: false };
  const supabase = await getSupabase();
  if (!supabase) return { configured: false };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { configured: true, ok: false, message: error.message };
  return { configured: true, ok: true, value: null };
}
