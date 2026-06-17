import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { Money } from '../../import/components/Money';
import { CategorySelect, CategoryDot } from '../../import/components/CategorySelect';
import { confidenceBand, formatDate, formatMoneyFull } from '../../import/format';
import { accountById } from '../data';
import { transactionsStore } from '../store';
import type { Category, Transaction } from '../types';

interface DetailDrawerProps {
  transaction: Transaction | null;
  onClose: () => void;
  onChangeCategory: (id: string, next: Category) => void;
  onDelete: (t: Transaction) => void;
}

export function DetailDrawer({
  transaction,
  onClose,
  onChangeCategory,
  onDelete,
}: DetailDrawerProps) {
  const t = transaction;
  const acct = t ? accountById(t.accountId) : undefined;
  const band = t?.confidence != null ? confidenceBand(t.confidence) : null;

  const [notes, setNotes] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Seed the notes field whenever a new transaction opens.
  useEffect(() => {
    setNotes(t?.notes ?? '');
    setConfirmDelete(false);
  }, [t?.id]);

  const saveNotes = () => {
    if (t && notes !== (t.notes ?? '')) {
      transactionsStore.patch(t.id, { notes: notes.trim() || undefined });
    }
  };

  return (
    <AnimatePresence>
      {t && (
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-hairline bg-surface"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* header */}
            <div className="flex items-center justify-between border-b border-hairline px-6 py-4">
              <span className="font-mono text-[0.66rem] uppercase tracking-[0.18em] text-faint">
                Transaction
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
              {/* hero: merchant + amount */}
              <div className="mb-7">
                <div className="mb-1 flex items-center gap-2">
                  <CategoryDot category={t.category} />
                  <h3 className="font-serif text-[1.6rem] leading-tight text-bright">
                    {t.merchant}
                  </h3>
                </div>
                <p className="text-[0.82rem] text-muted">{t.description}</p>
                <div className="mt-4">
                  <Money amount={t.amount} className="text-[2rem]" />
                </div>
              </div>

              <Field label="Date">{formatDate(t.date)}</Field>

              {t.isSystemGenerated && (
                <div className="my-2 inline-flex items-center gap-1.5 rounded-full border border-brass-deep/40 bg-brass/[0.08] px-2.5 py-1 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-brass">
                  Opening Balance · System entry
                </div>
              )}

              <Field label="Category">
                {t.isSystemGenerated ? (
                  <span className="flex items-center gap-2 text-soft">
                    <CategoryDot category={t.category} /> {t.category}
                  </span>
                ) : (
                  <CategorySelect
                    value={t.category}
                    onChange={(next) => onChangeCategory(t.id, next)}
                  />
                )}
              </Field>

              <Field label="Account">
                {acct ? (
                  <span>
                    <span className="text-bright">{acct.label}</span>{' '}
                    <span className="font-mono text-faint">{acct.mask}</span>
                  </span>
                ) : (
                  t.accountId
                )}
              </Field>

              <Field label="Payment method">{t.paymentMethod}</Field>

              {t.referenceNo && <Field label="Reference no.">{t.referenceNo}</Field>}
              {t.upiRef && <Field label="UPI reference">{t.upiRef}</Field>}
              {t.transactionId && t.transactionId !== t.referenceNo && (
                <Field label="Transaction ID">{t.transactionId}</Field>
              )}
              {t.runningBalance != null && (
                <Field label="Balance after">{formatMoneyFull(t.runningBalance)}</Field>
              )}

              {band && (
                <Field label="Category confidence">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: band.tone }}
                    />
                    <span style={{ color: band.tone }}>{band.label}</span>
                    <span className="font-mono text-faint">
                      {Math.round((t.confidence ?? 0) * 100)}%
                    </span>
                    {t.edited && (
                      <span className="font-mono text-[0.62rem] uppercase tracking-wider text-muted">
                        · edited
                      </span>
                    )}
                  </span>
                </Field>
              )}

              <Field label="Notes" last>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder={t.isSystemGenerated ? 'System entry — not editable' : 'Add a note…'}
                  rows={2}
                  readOnly={t.isSystemGenerated}
                  className="w-full resize-none rounded-control border border-hairline bg-ground px-3 py-2 text-[0.86rem] text-bright placeholder:text-faint transition-colors focus:border-brass focus:outline-none read-only:opacity-60"
                />
              </Field>
            </div>

            {/* footer: delete with inline confirmation */}
            <div className="border-t border-hairline px-6 py-4">
              {confirmDelete ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[0.82rem] text-soft">Delete this transaction?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="rounded-control px-3 py-1.5 text-[0.8rem] text-muted transition-colors hover:text-soft"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => { onDelete(t); onClose(); }}
                      className="flex items-center gap-2 rounded-control bg-loss/15 px-3 py-1.5 text-[0.8rem] font-medium text-loss transition-colors hover:bg-loss/25"
                    >
                      <Trash2 size={14} strokeWidth={1.9} />
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-2 text-[0.84rem] text-muted transition-colors hover:text-loss"
                >
                  <Trash2 size={15} strokeWidth={1.75} />
                  Delete transaction
                </button>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={`py-3.5 ${last ? '' : 'border-b border-hairline'}`}>
      <div className="mb-1.5 font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
        {label}
      </div>
      <div className="text-[0.92rem] text-soft">{children}</div>
    </div>
  );
}
