/**
 * ============================================================================
 *  BACKEND ENVIRONMENT CONFIG  (Phase 13)
 * ============================================================================
 *
 * Single source of truth for whether a cloud backend is configured. The app is
 * OFFLINE-FIRST: it runs fully on local persistence and only layers cloud sync
 * on top when these env vars are present at build time.
 *
 *   VITE_SUPABASE_URL       — your project URL
 *   VITE_SUPABASE_ANON_KEY  — the public anon key (safe for the browser when
 *                             Row Level Security is enabled, which the schema
 *                             in db/schema.sql does)
 *
 * HONEST STATUS: this build ships with no backend configured (the sandbox has
 * no Supabase project), so `isBackendConfigured()` is false and the cloud layer
 * stays dormant. Setting the two vars activates it with no other code change.
 */

interface ViteEnv {
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

function env(): ViteEnv {
  return ((import.meta as unknown as { env?: ViteEnv }).env ?? {}) as ViteEnv;
}

export interface BackendConfig {
  url: string;
  anonKey: string;
}

/** Returns the backend config if both vars are present, else null. */
export function backendConfig(): BackendConfig | null {
  const e = env();
  if (e.VITE_SUPABASE_URL && e.VITE_SUPABASE_ANON_KEY) {
    return { url: e.VITE_SUPABASE_URL, anonKey: e.VITE_SUPABASE_ANON_KEY };
  }
  return null;
}

export function isBackendConfigured(): boolean {
  return backendConfig() !== null;
}
