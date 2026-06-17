import { motion, AnimatePresence } from 'framer-motion';
import { X, Pencil } from 'lucide-react';
import { Money } from '../../import/components/Money';
import { CategoryDot } from '../../import/components/CategorySelect';
import { formatDate, formatMoneyFull } from '../../import/format';
import type { CategoryBudget } from '../derive';
import { suggestionFor } from '../derive';
import type { Transaction } from '../../transactions/types';

interface BudgetDetailProps {
  budget: CategoryBudget | null;
  transactions: Transaction[];
  onClose: () => void;
  onEdit: (b: CategoryBudget) => void;
}

export function BudgetDetail({ budget, transactions, onClose, onEdit }: BudgetDetailProps) {
  const b = budget;
  const tone =
    b?.status === 'over'
      ? 'var(--em-loss)'
      : b?.status === 'watch'
        ? 'var(--em-watch)'
        : 'var(--em-gain)';

  return (
    <AnimatePresence>
      {b && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.aside
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[440px] flex-col border-l border-hairline bg-surface"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-faint">
                Budget detail
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:text-bright"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {/* header */}
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <CategoryDot category={b.category} />
                    <h3 className="font-serif text-[1.6rem] leading-tight text-bright">
                      {b.category}
                    </h3>
                  </div>
                  <p className="text-[0.82rem] text-muted">
                    {formatMoneyFull(b.spent)} of {formatMoneyFull(b.cap)} this month
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onEdit(b)}
                  className="flex items-center gap-1.5 rounded-control border border-hairline px-3 py-1.5 text-[0.78rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
                >
                  <Pencil size={12} strokeWidth={1.75} />
                  Edit
                </button>
              </div>

              {/* performance bar */}
              <div className="mb-6 rounded-panel border border-hairline bg-ground p-5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
                    Performance
                  </span>
                  <span className="font-mono text-[0.8rem]" style={{ color: tone }}>
                    {Math.round(b.ratio * 100)}% used
                  </span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-elevated">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: tone }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(b.ratio, 1) * 100}%` }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p className="mt-3 text-[0.82rem] leading-snug text-soft">
                  {suggestionFor(b)}
                </p>
              </div>

              {/* related transactions */}
              <div className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
                This month&rsquo;s {b.category.toLowerCase()} ({transactions.length})
              </div>
              <div className="flex flex-col">
                {transactions.length === 0 ? (
                  <p className="py-6 text-center text-[0.84rem] text-faint">
                    No spending in this category yet this month.
                  </p>
                ) : (
                  transactions.map((t, i) => (
                    <div
                      key={t.id}
                      className={[
                        'flex items-center justify-between py-2.5',
                        i < transactions.length - 1 ? 'border-b border-hairline' : '',
                      ].join(' ')}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[0.86rem] text-bright">{t.merchant}</div>
                        <div className="text-[0.72rem] text-faint">
                          {formatDate(t.date)} · {t.description}
                        </div>
                      </div>
                      <Money amount={t.amount} className="text-[0.84rem]" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
