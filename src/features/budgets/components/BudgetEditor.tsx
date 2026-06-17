import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { CategorySelect } from '../../import/components/CategorySelect';
import { CATEGORIES, type Category } from '../../transactions/types';

interface BudgetEditorProps {
  open: boolean;
  /** When editing an existing budget, the category is fixed. */
  initialCategory?: Category | null;
  initialAmount?: number;
  /** Categories that already have a budget (to steer new ones to empties). */
  takenCategories: Category[];
  onClose: () => void;
  onSave: (category: Category, amount: number) => void;
  onRemove?: (category: Category) => void;
}

export function BudgetEditor({
  open,
  initialCategory,
  initialAmount,
  takenCategories,
  onClose,
  onSave,
  onRemove,
}: BudgetEditorProps) {
  const isEditing = initialCategory != null;
  const firstFree = CATEGORIES.find((c) => c !== 'Income' && !takenCategories.includes(c)) ?? 'Food';

  const [category, setCategory] = useState<Category>(initialCategory ?? firstFree);
  const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : '');

  useEffect(() => {
    if (open) {
      setCategory(initialCategory ?? firstFree);
      setAmount(initialAmount ? String(initialAmount) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCategory, initialAmount]);

  const valid = amount.trim() !== '' && Number(amount) > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[60] bg-void/75 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
          />
          <motion.div
            className="fixed left-1/2 top-1/2 z-[70] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-panel border border-hairline-strong bg-surface p-7 shadow-elevated"
            initial={{ opacity: 0, scale: 0.96, y: '-46%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.96, y: '-46%' }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-serif text-[1.4rem] text-bright">
                {isEditing ? `Edit ${category} budget` : 'New budget'}
              </h3>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:text-bright"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* category */}
            <label className="mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
              Category
            </label>
            {isEditing ? (
              <div className="mb-5 rounded-control border border-hairline bg-ground px-3 py-2.5 text-[0.9rem] text-soft">
                {category}
              </div>
            ) : (
              <div className="mb-5">
                <CategorySelect value={category} onChange={setCategory} />
              </div>
            )}

            {/* amount */}
            <label className="mb-2 block font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint">
              Monthly limit (₹)
            </label>
            <div className="relative mb-7">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-muted">
                ₹
              </span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="12,000"
                autoFocus
                className="h-11 w-full rounded-control border border-hairline bg-ground pl-8 pr-3 font-mono text-[0.95rem] text-bright placeholder:text-faint transition-colors duration-300 ease-lux focus:border-brass focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!valid}
                onClick={() => valid && onSave(category, Number(amount))}
                className="flex-1 rounded-control bg-brass px-5 py-2.5 text-[0.88rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isEditing ? 'Save changes' : 'Create budget'}
              </button>
              {isEditing && onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(category)}
                  className="rounded-control border border-hairline px-4 py-2.5 text-[0.84rem] text-loss transition-colors hover:border-loss"
                >
                  Remove
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
