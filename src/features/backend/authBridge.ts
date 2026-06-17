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
  // Supabase signs in by email; if the identifier isn't an email we still try,
  // and surface a friendly error if it fails.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: identifier.trim().toLowerCase(),
    password,
  });
  if (error) return { configured: true, ok: false, message: 'Those credentials are incorrect.' };
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
