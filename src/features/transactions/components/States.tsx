import { motion } from 'framer-motion';
import { Inbox, SearchX } from 'lucide-react';

/** Skeleton rows shown while the ledger loads. One slow brass shimmer, no spinner. */
export function LedgerSkeleton() {
  return (
    <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
      <div className="border-b border-hairline px-5 py-3">
        <div className="h-3 w-24 rounded bg-elevated" />
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border-b border-hairline px-5 py-4 last:border-b-0"
        >
          <div className="h-8 w-8 flex-none rounded-full bg-elevated" />
          <div className="flex-1 space-y-2">
            <motion.div
              className="h-3 w-40 rounded bg-elevated"
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.08 }}
            />
            <div className="h-2.5 w-24 rounded bg-elevated/60" />
          </div>
          <div className="h-3 w-20 rounded bg-elevated" />
          <div className="h-3 w-16 rounded bg-elevated" />
        </div>
      ))}
    </div>
  );
}

/** Empty: no transactions at all (fresh account). */
export function LedgerEmpty({ onImport }: { onImport: () => void }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-panel border border-hairline bg-surface px-6 py-16 text-center">
      <div
        className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-brass-deep"
        style={{ boxShadow: 'inset 0 0 26px var(--em-glow-brass)' }}
      >
        <Inbox size={28} strokeWidth={1.5} className="text-brass" />
      </div>
      <h3 className="mb-2 font-serif text-[1.5rem] text-bright">
        Your ledger is empty
      </h3>
      <p className="mb-7 max-w-sm text-[0.9rem] text-muted">
        Import a bank statement to bring your transactions in. Everything you add
        becomes searchable, categorised and ready to understand.
      </p>
      <button
        type="button"
        onClick={onImport}
        className="rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
      >
        Import a statement
      </button>
    </div>
  );
}

/** Empty: filters/search excluded everything. */
export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex min-h-[30vh] flex-col items-center justify-center rounded-panel border border-hairline bg-surface px-6 py-14 text-center">
      <SearchX size={26} strokeWidth={1.5} className="mb-4 text-faint" />
      <h3 className="mb-1.5 font-serif text-[1.2rem] text-bright">
        No transactions match
      </h3>
      <p className="mb-5 max-w-xs text-[0.86rem] text-muted">
        Try a different search, or clear your filters to see everything again.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="rounded-control border border-hairline px-4 py-2 text-[0.84rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
      >
        Clear filters
      </button>
    </div>
  );
}
