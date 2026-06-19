import { persist, STORAGE_KEYS } from '../../lib/persist';
import { getSupabase } from './client';
import { isBackendConfigured } from './config';

/**
 * ============================================================================
 *  REPOSITORY / SERVICE LAYER  (Phase 13)
 * ============================================================================
 *
 * A thin, typed persistence boundary the rest of the app can target instead of
 * reaching into localStorage directly. Two implementations satisfy one
 * interface:
 *
 *   - LocalRepository : reads/writes the existing namespaced localStorage. This
 *     is the DEFAULT and the offline-first source of truth.
 *   - CloudRepository : wraps the local repo and, when Supabase is configured,
 *     also pushes/pulls user-scoped rows. With no backend it is never
 *     constructed, so behaviour is unchanged.
 *
 * The point of this layer is that stores depend on an INTERFACE, not on storage
 * mechanics — so swapping local-only for cloud-backed is a factory change, not
 * a rewrite. Today `getRepository()` returns the local repo (no backend), which
 * is the honest state of this build.
 */

export type DomainKey = keyof typeof STORAGE_KEYS; // 'transactions' | 'budgets' | 'settings' | 'importHistory'

export interface Repository {
  /** Read a domain blob; returns fallback when absent. */
  read<T>(domain: DomainKey, fallback: T): Promise<T>;
  /** Write a domain blob. */
  write<T>(domain: DomainKey, value: T): Promise<void>;
  /** Whether this repository is backed by the cloud. */
  readonly cloud: boolean;
}

// --- local-only (default) ----------------------------------------------------
class LocalRepository implements Repository {
  readonly cloud = false;
  async read<T>(domain: DomainKey, fallback: T): Promise<T> {
    return persist.read<T>(STORAGE_KEYS[domain], fallback);
  }
  async write<T>(domain: DomainKey, value: T): Promise<void> {
    persist.write(STORAGE_KEYS[domain], value);
  }
}

// --- cloud-mirrored (only when configured) ----------------------------------
/**
 * Mirrors the JSON-blob domains (budgets, settings) to the matching single-row
 * Supabase tables, and keeps local as the offline cache. List domains
 * (transactions/clients/invoices/notifications) are synced by the dedicated
 * sync engine (./sync.ts) which understands per-row merge; this repository
 * focuses on the simple blob domains and always falls back to local on error.
 */
class CloudRepository implements Repository {
  readonly cloud = true;
  private local = new LocalRepository();

  async read<T>(domain: DomainKey, fallback: T): Promise<T> {
    // Local is the immediate source (offline-first); cloud refresh happens via
    // sync.ts. This keeps reads instant and resilient when offline.
    return this.local.read<T>(domain, fallback);
  }

  async write<T>(domain: DomainKey, value: T): Promise<void> {
    // Always write local first so the app never loses data if the network fails.
    await this.local.write(domain, value);
    if (domain !== 'budgets' && domain !== 'settings') return; // blob domains only
    try {
      const supabase = await getSupabase();
      if (!supabase) return;
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) return;
      const table = domain === 'budgets' ? 'budgets' : 'settings';
      const column = domain === 'budgets' ? 'caps' : 'data';
      const { error } = await supabase.from(table).upsert({ user_id: userId, [column]: value });
      if (error) console.warn(`[CloudRepository] Upsert failed for ${domain}:`, error.message);
    } catch (err: unknown) {
      console.warn('[CloudRepository] Remote write failed for', domain, '— local data preserved:', err);
    }
  }
}

let repo: Repository | null = null;
export function getRepository(): Repository {
  if (repo) return repo;
  repo = isBackendConfigured() ? new CloudRepository() : new LocalRepository();
  return repo;
}

/** For tests / config changes. */
export function resetRepository() {
  repo = null;
}
