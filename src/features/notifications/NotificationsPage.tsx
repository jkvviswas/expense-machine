import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Wallet,
  TrendingDown,
  Upload,
  FileText,
  Info,
  Check,
  X,
  CheckCheck,
} from 'lucide-react';
import { PageStage, StageItem } from '../../components/layout/PageStage';
import {
  notificationsStore,
  useNotifications,
  type AppNotification,
  type NotificationKind,
  type NotificationTone,
} from './store';
import { runAlertEngine } from './engine';

const kindIcon: Record<NotificationKind, typeof Bell> = {
  budget: Wallet,
  expense: TrendingDown,
  import: Upload,
  report: FileText,
  system: Info,
};

const toneColor: Record<NotificationTone, string> = {
  info: 'var(--em-muted)',
  watch: 'var(--em-watch)',
  alert: 'var(--em-loss)',
  good: 'var(--em-gain)',
};

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function NotificationsPage() {
  const notifications = useNotifications();

  // Recompute alerts whenever the page is opened (ledger/budgets may have changed).
  useEffect(() => {
    runAlertEngine();
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <PageStage>
      <StageItem className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
            Notifications
          </p>
          <h2 className="font-serif text-[2.2rem] leading-tight text-bright">
            Your alerts
          </h2>
          <p className="mt-1 text-[0.9rem] text-muted">
            {unread > 0
              ? `${unread} unread · ${notifications.length} total`
              : `All caught up · ${notifications.length} total`}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => notificationsStore.markAllRead()}
              className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3.5 py-2 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
            >
              <CheckCheck size={15} strokeWidth={1.75} /> Mark all read
            </button>
            <button
              type="button"
              onClick={() => notificationsStore.clearAll()}
              className="flex items-center gap-2 rounded-control border border-hairline px-3.5 py-2 text-[0.82rem] text-muted transition-colors hover:text-soft"
            >
              Clear all
            </button>
          </div>
        )}
      </StageItem>

      <StageItem>
        {notifications.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {notifications.map((n) => (
                <NotificationRow key={n.id} n={n} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </StageItem>
    </PageStage>
  );
}

function NotificationRow({ n }: { n: AppNotification }) {
  const Icon = kindIcon[n.kind];
  const tone = toneColor[n.tone];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={[
        'group flex items-start gap-4 rounded-panel border bg-surface p-5 transition-colors',
        n.read ? 'border-hairline' : 'border-hairline-strong',
      ].join(' ')}
    >
      {/* tone rule + icon */}
      <span
        className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-control border border-hairline bg-elevated"
        style={{ color: tone }}
      >
        <Icon size={16} strokeWidth={1.75} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          {!n.read && (
            <span
              className="h-1.5 w-1.5 flex-none rounded-full"
              style={{ background: 'var(--em-brass)' }}
            />
          )}
          <h3 className="text-[0.95rem] text-bright">{n.title}</h3>
          <span className="ml-auto flex-none font-mono text-[0.66rem] text-faint">
            {timeAgo(n.at)}
          </span>
        </div>
        <p className="mt-1 text-[0.84rem] leading-snug text-muted">{n.body}</p>
      </div>

      {/* actions */}
      <div className="flex flex-none items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
        {!n.read && (
          <button
            type="button"
            aria-label="Mark read"
            onClick={() => notificationsStore.markRead(n.id)}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-bright"
          >
            <Check size={14} />
          </button>
        )}
        <button
          type="button"
          aria-label="Dismiss"
          onClick={() => notificationsStore.dismiss(n.id)}
          className="flex h-7 w-7 items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-loss"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center text-center">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--em-glow-ambient), transparent 60%)' }}
        />
        <Bell size={28} strokeWidth={1.5} className="text-faint" />
      </div>
      <h3 className="font-serif text-[1.3rem] text-bright">Nothing needs you</h3>
      <p className="mt-2 max-w-sm text-[0.88rem] text-muted">
        Budget alerts and large-expense flags will appear here as they happen.
      </p>
    </div>
  );
}
