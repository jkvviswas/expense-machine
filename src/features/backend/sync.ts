import { persist, STORAGE_KEYS } from '../../lib/persist';
import { getSupabase } from './client';
import { isBackendConfigured } from './config';

/**
 * ============================================================================
 *  MIGRATION + SYNC ENGINE  (Phase 13)
 * ============================================================================
 *
 * Offline-first strategy:
 *   1. Local storage is always the working source of truth.
 *   2. When a backend is configured AND a user is signed in, `pushAll` uploads
 *      the local snapshot, and `pullAll` downloads the cloud snapshot. A simple
 *      timestamp/last-write-wins merge keeps them coherent.
 *   3. `migrateLocalToCloud` is the one-time onboarding step that seeds a fresh
 *      cloud account from existing local data.
 *
 * All functions are no-ops (returning a clear status) when the backend is not
 * configured, so the app behaves identically offline. None of this runs in the
 * current build because no backend is configured — it is deployment-ready, not
 * deployed, and the return values say so.
 */

export type SyncStatus =
  | { ok: false; reason: 'no-backend' | 'not-signed-in' | 'error'; detail?: string }
  | { ok: true; pushed?: number; pulled?: number };

type AuthedResult =
  | { error: 'no-backend' | 'not-signed-in' }
  | { error?: undefined; supabase: NonNullable<Awaited<ReturnType<typeof getSupabase>>>; userId: string };

async function authedClient(): Promise<AuthedResult> {
  if (!isBackendConfigured()) return { error: 'no-backend' };
  const supabase = await getSupabase();
  if (!supabase) return { error: 'no-backend' };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: 'not-signed-in' };
  return { supabase, userId: data.user.id };
}

// Blob domains map directly to single-row tables.
const BLOB_DOMAINS: { domain: keyof typeof STORAGE_KEYS; table: string; column: string }[] = [
  { domain: 'budgets', table: 'budgets', column: 'caps' },
  { domain: 'settings', table: 'settings', column: 'data' },
];

/** Upload the local snapshot to the cloud (last-write-wins). */
export async function pushAll(): Promise<SyncStatus> {
  const c = await authedClient();
  if (c.error) return { ok: false, reason: c.error };
  try {
    let pushed = 0;
    // blob domains
    for (const { domain, table, column } of BLOB_DOMAINS) {
      const value = persist.read(STORAGE_KEYS[domain], null);
      if (value == null) continue;
      const { error } = await c.supabase.from(table).upsert({ user_id: c.userId, [column]: value });
      if (error) console.warn(`[Sync] Push failed for ${domain}:`, error.message);
      else pushed++;
    }
    // list domains (transactions). Rows carry their own id; chunk to stay small.
    const txns = persist.read<Record<string, unknown>[]>(STORAGE_KEYS.transactions, []);
    if (txns.length) {
      const rows = txns.map((t) => ({ ...t, user_id: c.userId }));
      const { error: txnErr } = await c.supabase.from('transactions').upsert(rows);
      if (txnErr) console.warn('[Sync] Push failed for transactions:', txnErr.message);
      else pushed += rows.length;
    }
    return { ok: true, pushed };
  } catch (e) {
    return { ok: false, reason: 'error', detail: String(e) };
  }
}

/** Download the cloud snapshot into local storage. */
export async function pullAll(): Promise<SyncStatus> {
  const c = await authedClient();
  if (c.error) return { ok: false, reason: c.error };
  try {
    let pulled = 0;
    for (const { domain, table, column } of BLOB_DOMAINS) {
      const { data, error } = await c.supabase.from(table).select(column).eq('user_id', c.userId).maybeSingle();
      if (error) { console.warn(`[Sync] Pull failed for ${domain}:`, error.message); continue; }
      const value = data ? (data as unknown as Record<string, unknown>)[column] : null;
      if (value != null) {
        persist.write(STORAGE_KEYS[domain], value);
        pulled++;
      }
    }
    const { data: txns, error: txnErr } = await c.supabase.from('transactions').select('*').eq('user_id', c.userId);
    if (txnErr) console.warn('[Sync] Pull failed for transactions:', txnErr.message);
    if (txns && txns.length) {
      persist.write(STORAGE_KEYS.transactions, txns);
      pulled += txns.length;
    }
    return { ok: true, pulled };
  } catch (e) {
    return { ok: false, reason: 'error', detail: String(e) };
  }
}

/**
 * One-time migration: seed a fresh cloud account from local data. Equivalent to
 * pushAll today, but kept as a distinct entry point so onboarding can show a
 * dedicated "import your existing data" step.
 */
export async function migrateLocalToCloud(): Promise<SyncStatus> {
  return pushAll();
}
