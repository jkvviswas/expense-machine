import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Search, Check } from 'lucide-react';

/**
 * A reusable searchable dropdown selector, styled to match the existing
 * Settings controls (no new visual language). Used for Country, Currency and
 * Timezone pickers so all three behave identically. Filters a large list as
 * the user types and renders an optional trailing meta per row.
 */
export interface SelectOption {
  value: string;
  /** Primary label shown in the trigger and row. */
  label: string;
  /** Optional leading code/badge (mono). */
  code?: string;
  /** Optional trailing meta (mono, faint), e.g. currency code or tz abbrev. */
  meta?: string;
  /** Extra text matched during search but not displayed. */
  keywords?: string;
}

export function SearchableSelect({
  value,
  options,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  width = 'w-56',
  menuWidth = 'w-72',
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  width?: string;
  menuWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options.slice(0, 200);
    return options
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          o.code?.toLowerCase().includes(q) ||
          o.meta?.toLowerCase().includes(q) ||
          o.keywords?.toLowerCase().includes(q),
      )
      .slice(0, 200);
  }, [query, options]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className={`relative ${width}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-control border border-hairline bg-ground px-3 text-[0.86rem] text-bright transition-colors duration-300 ease-lux hover:border-brass-deep focus:border-brass focus:outline-none"
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown size={15} className={`flex-none text-faint transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute right-0 z-50 mt-1.5 ${menuWidth} overflow-hidden rounded-panel border border-hairline-strong bg-elevated shadow-elevated`}
          >
            <div className="relative border-b border-hairline">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full bg-transparent pl-9 pr-3 text-[0.84rem] text-bright placeholder:text-faint focus:outline-none"
              />
            </div>
            <ul role="listbox" className="max-h-64 overflow-y-auto py-1">
              {filtered.length === 0 && (
                <li className="px-3 py-2.5 text-[0.82rem] text-faint">No matches</li>
              )}
              {filtered.map((o) => {
                const active = o.value === value;
                return (
                  <li key={o.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => {
                        onChange(o.value);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[0.84rem] transition-colors hover:bg-surface ${
                        active ? 'text-bright' : 'text-soft'
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {o.code && <span className="font-mono text-[0.66rem] text-faint">{o.code}</span>}
                        <span className="truncate">{o.label}</span>
                      </span>
                      <span className="flex flex-none items-center gap-2">
                        {o.meta && <span className="font-mono text-[0.66rem] text-faint">{o.meta}</span>}
                        {active && <Check size={13} className="text-brass" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
