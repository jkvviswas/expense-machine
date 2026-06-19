import { useSyncExternalStore } from 'react';
import { persist } from '../../lib/persist';
import { generateId } from '../../lib/id';

/**
 * ============================================================================
 *  NOTIFICATIONS STORE  (presentation-layer, additive)
 * ============================================================================
 *
 * Holds the user's notifications (budget alerts, large-expense flags, import &
 * report status) with persisted read/dismiss state. The alert ENGINE
 * (./engine.ts) derives alerts from the ledger + budgets and feeds them here;
 * this store owns lifecycle (seen/dismissed) only.
 *
 * Persistence stores a compact record of which generated alert ids have been
 * read or dismissed, plus any manually-added notifications (e.g. import done),
 * so state survives refreshes without re-alerting on every load.
 */

export type NotificationKind = 'budget' | 'expense' | 'import' | 'report' | 'system';
export type NotificationTone = 'info' | 'watch' | 'alert' | 'good';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  tone: NotificationTone;
  title: string;
  body: string;
  /** ISO timestamp. */
  at: string;
  read: boolean;
}

interface PersistShape {
  /** Manually-added (event) notifications. */
  events: AppNotification[];
  /** ids the user has read. */
  read: string[];
  /** ids the user has dismissed (suppressed even if re-generated). */
  dismissed: string[];
}

const KEY = 'notifications';

let persisted: PersistShape = load();
// Derived (engine-generated) notifications, recomputed on demand.
let generated: AppNotification[] = [];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function load(): PersistShape {
  return persist.read<PersistShape>(KEY, { events: [], read: [], dismissed: [] });
}
function save() {
  persist.write(KEY, persisted);
}

/** Merge generated + event notifications, applying read/dismissed state. */
function merged(): AppNotification[] {
  const readSet = new Set(persisted.read);
  const dismissedSet = new Set(persisted.dismissed);
  const all = [...generated, ...persisted.events]
    .filter((n) => !dismissedSet.has(n.id))
    .map((n) => ({ ...n, read: readSet.has(n.id) || n.read }));
  // Newest first.
  return all.sort((a, b) => (a.at < b.at ? 1 : -1));
}

let snapshot: AppNotification[] = merged();
function recompute() {
  snapshot = merged();
  emit();
}

export const notificationsStore = {
  get(): AppNotification[] {
    return snapshot;
  },

  unreadCount(): number {
    return snapshot.filter((n) => !n.read).length;
  },

  /** Replace the engine-generated set (called by the alert engine). */
  setGenerated(next: AppNotification[]) {
    generated = next;
    recompute();
  },

  /** Add an event notification (import complete, report exported, etc.). */
  addEvent(n: Omit<AppNotification, 'id' | 'at' | 'read'> & { id?: string }) {
    const item: AppNotification = {
      id: n.id ?? generateId('evt'),
      kind: n.kind,
      tone: n.tone,
      title: n.title,
      body: n.body,
      at: new Date().toISOString(),
      read: false,
    };
    persisted.events = [item, ...persisted.events].slice(0, 50);
    save();
    recompute();
  },

  markRead(id: string) {
    if (!persisted.read.includes(id)) {
      persisted.read.push(id);
      save();
      recompute();
    }
  },

  markAllRead() {
    const ids = snapshot.map((n) => n.id);
    persisted.read = Array.from(new Set([...persisted.read, ...ids]));
    save();
    recompute();
  },

  dismiss(id: string) {
    if (!persisted.dismissed.includes(id)) {
      persisted.dismissed.push(id);
      // Also drop from events if it was one.
      persisted.events = persisted.events.filter((e) => e.id !== id);
      save();
      recompute();
    }
  },

  clearAll() {
    persisted = { events: [], read: snapshot.map((n) => n.id), dismissed: snapshot.map((n) => n.id) };
    save();
    recompute();
  },

  reset() {
    persisted = { events: [], read: [], dismissed: [] };
    save();
    recompute();
  },

  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(notificationsStore.subscribe, notificationsStore.get, notificationsStore.get);
}

export function useUnreadCount(): number {
  return useSyncExternalStore(
    notificationsStore.subscribe,
    () => snapshot.filter((n) => !n.read).length,
    () => 0,
  );
}
