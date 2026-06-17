import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

export interface Option<T extends string> {
  value: T;
  label: string;
}

interface FilterSelectProps<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (v: T) => void;
  /** When the value is not the first (default) option, show it as active. */
  defaultValue: T;
}

export function FilterSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  defaultValue,
}: FilterSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = value !== defaultValue;
  const current = options.find((o) => o.value === value);

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
        className={[
          'flex items-center gap-2 rounded-control border px-3 py-2 text-[0.82rem] transition-colors duration-300 ease-lux',
          active
            ? 'border-brass-deep bg-brass-deep/20 text-brass'
            : 'border-hairline text-soft hover:border-hairline-strong',
        ].join(' ')}
      >
        <span className="text-faint">{label}:</span>
        <span>{current?.label ?? 'All'}</span>
        <ChevronDown
          size={13}
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-full z-30 mt-1.5 max-h-72 min-w-[180px] overflow-y-auto rounded-control border border-hairline bg-elevated py-1 shadow-elevated"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-[0.82rem] text-soft transition-colors hover:bg-surface"
              >
                {o.label}
                {o.value === value && <Check size={13} className="text-brass" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
