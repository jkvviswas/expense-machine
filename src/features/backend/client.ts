import type { SupabaseClient } from '@supabase/supabase-js';
import { backendConfig } from './config';

/**
 * ============================================================================
 *  SUPABASE CLIENT FACTORY  (Phase 13)
 * ============================================================================
 *
 * Creates (once) a Supabase client when the backend is configured. The
 * @supabase/supabase-js import is DYNAMIC so it is code-split into its own
 * chunk and never loaded when the app runs offline-only — keeping the default
 * bundle unchanged for users without a backend.
 *
 * Returns null when no backend is configured; every caller treats null as
 * "stay local", which is the offline-first contract.
 */

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabase(): Promise<SupabaseClient | null> {
  if (clientPromise) return clientPromise;
  const cfg = backendConfig();
  if (!cfg) {
    clientPromise = Promise.resolve(null);
    return clientPromise;
  }
  clientPromise = import('@supabase/supabase-js')
    .then(({ createClient }) =>
      createClient(cfg.url, cfg.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Detect the recovery/confirmation token Supabase appends to the URL
          // (e.g. on password-reset links) and establish the session from it.
          detectSessionInUrl: true,
          flowType: 'implicit',
        },
      }),
    )
    .catch((err: unknown) => {
      console.error('[Supabase] Failed to initialise client:', err);
      return null;
    });
  return clientPromise;
}

/** Reset the memoised client (used after sign-out or config change). */
export function resetSupabase() {
  clientPromise = null;
}
