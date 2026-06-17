import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Search, X, ArrowRight, Receipt, Users, Wallet, FileText, LayoutDashboard } from 'lucide-react';
import { useLedger } from '../../features/transactions/store';
import { useClients } from '../../features/clients/store';
import { useBudgets } from '../../features/budgets/store';
import { formatMoneyFull } from '../../features/import/format';

/**
 * Global search — a real command-palette over the user's data. Matches across
 * transaction merchant/narration/amount/category/notes, clients, budgets and
 * top-level pages. Partial + light typo tolerance, keyboard navigation,
 * Enter-to-open, and a clear button. Opens from the header search field and as
 * a modal overlay so results never disrupt the page layout.
 */

interface Result {
  id: string;
  group: 'Transactions' | 'Clients' | 'Budgets' | 'Pages';
  icon: typeof Receipt;
  title: string;
  subtitle: string;
  to: string;
}

// Tiny subsequence/partial matcher with a light typo allowance (single
// transposition or missing char tolerated via subsequence match).
function matches(haystack: string, q: string): boolean {
  const h = haystack.toLowerCase();
  const needle = q.toLowerCase().trim();
  if (!needle) return false;
  if (h.includes(needle)) return true;
  // subsequence fallback (typo/partial tolerance)
  let i = 0;
  for (const ch of h) {
    if (ch === needle[i]) i++;
    if (i === needle.length) return true;
  }
  return false;
}

const PAGES: Result[] = [
  { id: 'p-dash', group: 'Pages', icon: LayoutDashboard, title: 'Dashboard', subtitle: 'Your financial command center', to: '/' },
  { id: 'p-txn', group: 'Pages', icon: Receipt, title: 'Transactions', subtitle: 'The full ledger', to: '/transactions' },
  { id: 'p-budgets', group: 'Pages', icon: Wallet, title: 'Budgets', subtitle: 'Monthly category caps', to: '/budgets' },
  { id: 'p-reports', group: 'Pages', icon: FileText, title: 'Reports', subtitle: 'Executive summaries', to: '/reports' },
  { id: 'p-analytics', group: 'Pages', icon: FileText, title: 'Analytics', subtitle: 'Financial intelligence', to: '/analytics' },
  { id: 'p-clients', group: 'Pages', icon: Users, title: 'Clients', subtitle: 'The people you do business with', to: '/clients' },
];

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const ledger = useLedger();
  const clients = useClients();
  const budgets = useBudgets();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim();
    if (!q) return [];
    const out: Result[] = [];
    const amountQ = q.replace(/[₹,\s]/g, '');
    const isNum = /^\d+(\.\d+)?$/.test(amountQ);

    // Transactions
    const txns = ledger ?? [];
    for (const t of txns) {
      const hit =
        matches(t.merchant, q) ||
        matches(t.description, q) ||
        matches(t.category, q) ||
        (t.notes ? matches(t.notes, q) : false) ||
        (t.referenceNo ? matches(t.referenceNo, q) : false) ||
        (t.upiRef ? matches(t.upiRef, q) : false) ||
        (t.transactionId ? matches(t.transactionId, q) : false) ||
        (isNum && Math.abs(t.amount) === Number(amountQ));
      if (hit) {
        out.push({
          id: `t-${t.id}`,
          group: 'Transactions',
          icon: Receipt,
          title: t.merchant,
          subtitle: `${t.category} · ${formatMoneyFull(t.amount)}`,
          to: '/transactions',
        });
      }
      if (out.filter((r) => r.group === 'Transactions').length >= 6) break;
    }

    // Clients
    for (const c of clients.clients) {
      if (matches(c.name, q) || (c.company ? matches(c.company, q) : false)) {
        out.push({ id: `c-${c.id}`, group: 'Clients', icon: Users, title: c.name, subtitle: c.company || 'Client', to: '/clients' });
      }
    }

    // Budgets (category caps)
    for (const [cat, cap] of Object.entries(budgets)) {
      if (matches(cat, q)) {
        out.push({ id: `b-${cat}`, group: 'Budgets', icon: Wallet, title: cat, subtitle: `Cap ${formatMoneyFull(cap)}`, to: '/budgets' });
      }
    }

    // Pages
    for (const p of PAGES) {
      if (matches(p.title, q) || matches(p.subtitle, q)) out.push(p);
    }

    return out.slice(0, 20);
  }, [query, ledger, clients, budgets]);

  useEffect(() => {
    setActive(0);
  }, [results.length]);

  if (!open) return null;

  const go = (r: Result) => {
    navigate(r.to);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-void/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-panel border border-hairline-strong bg-elevated shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center border-b border-hairline">
          <Search size={17} className="pointer-events-none absolute left-4 text-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search transactions, clients, budgets…"
            className="h-14 w-full bg-transparent pl-12 pr-12 text-[0.95rem] text-bright placeholder:text-faint focus:outline-none"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              className="absolute right-4 text-faint transition-colors hover:text-bright"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {query && results.length === 0 && (
          <div className="px-4 py-8 text-center text-[0.88rem] text-muted">No matches for “{query}”.</div>
        )}

        {results.length > 0 && (
          <ul className="max-h-[52vh] overflow-y-auto py-2">
            {results.map((r, i) => {
              const Icon = r.icon;
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(r)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === active ? 'bg-surface' : ''}`}
                  >
                    <span className="flex h-8 w-8 flex-none items-center justify-center rounded-control border border-hairline bg-ground text-brass">
                      <Icon size={15} strokeWidth={1.7} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9rem] text-bright">{r.title}</span>
                      <span className="block truncate text-[0.76rem] text-muted">{r.subtitle}</span>
                    </span>
                    <span className="flex-none font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">{r.group}</span>
                    {i === active && <ArrowRight size={14} className="flex-none text-brass" />}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex items-center gap-4 border-t border-hairline px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.1em] text-faint">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>Esc Close</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
