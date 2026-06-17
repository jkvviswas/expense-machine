import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';
import type { Category } from '../types';
import { toneFor } from '../format';
import { useAllCategories } from '../../transactions/categories';

export function CategoryDot({ category }: { category: Category }) {
  return (
    <span
      className="inline-block h-2 w-2 flex-none rounded-full"
      style={{ background: toneFor(category) }}
      aria-hidden
    />
  );
}

export function CategoryPill({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-elevated px-3 py-1 text-[0.78rem] text-soft">
      <CategoryDot category={category} />
      {category}
    </span>
  );
}

interface CategorySelectProps {
  value: Category;
  onChange: (next: Category) => void;
}

/** A calm, dark, editorial dropdown for reassigning a category. */
export function CategorySelect({ value, onChange }: CategorySelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const categories = useAllCategories();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-w-[150px] items-center justify-between gap-2 rounded-control border border-hairline bg-surface px-3 py-1.5 text-left text-[0.82rem] text-soft transition-colors duration-300 ease-lux hover:border-hairline-strong focus:border-brass focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <CategoryDot category={value} />
          {value}
        </span>
        <ChevronDown
          size={14}
          className={`text-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 right-0 top-full z-20 mt-1.5 overflow-hidden rounded-control border border-hairline bg-elevated shadow-elevated"
          >
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[0.82rem] text-soft transition-colors hover:bg-surface"
              >
                <span className="flex items-center gap-2">
                  <CategoryDot category={c} />
                  {c}
                </span>
                {c === value && <Check size={14} className="text-brass" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
