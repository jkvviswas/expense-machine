import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CopyCheck, ChevronDown, Check } from 'lucide-react';
import { Money } from './Money';
import { formatDate } from '../format';
import type { DuplicateMatch } from '../parsing/duplicates';
import type { ParsedTransaction } from '../types';

interface DuplicateReviewProps {
  /** Incoming transactions flagged as possible duplicates. */
  duplicates: DuplicateMatch[];
  /** Currently-excluded parsed transaction ids. */
  excluded: Set<string>;
  /** Toggle one duplicate's excluded state. */
  onToggle: (parsed: ParsedTransaction) => void;
  /** Exclude all flagged duplicates at once. */
  onSkipAll: () => void;
  /** Keep all (clear exclusions). */
  onKeepAll: () => void;
}

/**
 * A calm, on-brand panel surfacing likely-duplicate transactions detected
 * against the existing ledger. The user decides per-row (or in bulk) whether to
 * skip them before committing the import. Excluded rows are simply not added.
 */
export function DuplicateReview({
  duplicates,
  excluded,
  onToggle,
  onSkipAll,
  onKeepAll,
}: DuplicateReviewProps) {
  const [open, setOpen] = useState(true);
  if (duplicates.length === 0) return null;

  const skipped = duplicates.filter((d) => excluded.has(d.parsed.id)).length;

  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 text-left"
      >
        <CopyCheck size={15} strokeWidth={1.75} className="text-watch" />
        <h3 className="flex-1 font-serif text-[1.05rem] text-bright">
          Possible duplicates
        </h3>
        <span className="font-mono text-[0.72rem] text-muted">
          {skipped}/{duplicates.length} skipped
        </span>
        <ChevronDown
          size={15}
          className={[
            'text-faint transition-transform duration-300',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      <p className="mt-2 text-[0.78rem] leading-snug text-muted">
        {duplicates.length} transaction{duplicates.length > 1 ? 's' : ''} look
        {duplicates.length > 1 ? '' : 's'} like {duplicates.length > 1 ? 'ones' : 'one'}{' '}
        already in your ledger. Skip them to avoid double-counting.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onSkipAll}
          className="rounded-control border border-hairline bg-elevated px-3 py-1.5 text-[0.78rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
        >
          Skip all
        </button>
        <button
          type="button"
          onClick={onKeepAll}
          className="rounded-control border border-hairline px-3 py-1.5 text-[0.78rem] text-muted transition-colors hover:text-soft"
        >
          Keep all
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-2">
              {duplicates.map((d) => {
                const isSkipped = excluded.has(d.parsed.id);
                return (
                  <div
                    key={d.parsed.id}
                    className="flex items-center gap-3 rounded-control border border-hairline bg-elevated px-3 py-2.5"
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(d.parsed)}
                      aria-label={isSkipped ? 'Keep this one' : 'Skip this one'}
                      className={[
                        'flex h-4 w-4 flex-none items-center justify-center rounded border transition-colors',
                        isSkipped
                          ? 'border-brass bg-brass text-void'
                          : 'border-hairline-strong',
                      ].join(' ')}
                    >
                      {isSkipped && <Check size={11} />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-[0.82rem] text-bright">
                          {d.parsed.merchant}
                        </span>
                        <span
                          className="flex-none font-mono text-[0.56rem] uppercase tracking-wider"
                          style={{ color: 'var(--em-watch)' }}
                        >
                          {d.reason === 'exact' ? 'exact match' : 'near match'}
                        </span>
                      </div>
                      <div className="text-[0.7rem] text-faint">
                        {formatDate(d.parsed.date)} · already in ledger as{' '}
                        {formatDate(d.existing.date)}
                      </div>
                    </div>
                    <Money amount={d.parsed.amount} className="text-[0.8rem]" />
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
