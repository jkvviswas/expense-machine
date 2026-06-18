import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Trash2 } from 'lucide-react';
import { CategoryDot } from '../../import/components/CategorySelect';
import type { Category } from '../types';
import { useAllCategories } from '../categories';

interface BulkBarProps {
  count: number;
  onSetCategory: (c: Category) => void;
  onExport: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function BulkBar({ count, onSetCategory, onExport, onDelete, onClear }: BulkBarProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-panel border border-hairline-strong bg-elevated px-5 py-3 shadow-elevated"
        >
          <span className="text-[0.84rem] text-soft">
            <span className="font-mono text-bright">{count}</span> selected
          </span>
          <div className="h-5 w-px bg-hairline" />

          <div className="flex items-center gap-2">
            <span className="text-[0.78rem] text-faint">Set category</span>
            <BulkCategory onPick={onSetCategory} />
          </div>

          <button
            type="button"
            onClick={onExport}
            className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-1.5 text-[0.8rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
          >
            <Download size={14} strokeWidth={1.75} />
            Export selection
          </button>

          <button
            type="button"
            onClick={onDelete}
            className="flex items-center gap-2 rounded-control border border-hairline bg-surface px-3 py-1.5 text-[0.8rem] text-loss transition-colors hover:border-loss/50"
          >
            <Trash2 size={14} strokeWidth={1.75} />
            Delete selected
          </button>

          <button
            type="button"
            onClick={onClear}
            className="text-[0.78rem] text-muted transition-colors hover:text-soft"
          >
            Clear
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function BulkCategory({ onPick }: { onPick: (c: Category) => void }) {
  const [open, setOpen] = useState(false);
  const categories = useAllCategories();
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-control border border-hairline bg-surface px-3 py-1.5 text-[0.8rem] text-soft transition-colors hover:border-brass-deep"
      >
        Choose…
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-full left-0 z-50 mb-2 w-44 overflow-y-auto overflow-x-hidden rounded-control border border-hairline bg-elevated shadow-elevated"
            style={{ maxHeight: 'min(60vh, 340px)' }}
          >
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onPick(c);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[0.82rem] text-soft transition-colors hover:bg-surface"
              >
                <CategoryDot category={c} />
                {c}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
