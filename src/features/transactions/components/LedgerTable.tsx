import { Check, Trash2 } from 'lucide-react';
import { Money } from '../../import/components/Money';
import { CategoryDot } from '../../import/components/CategorySelect';
import { formatDate } from '../../import/format';
import { accountById } from '../data';
import { txnType, type Transaction } from '../types';

interface LedgerTableProps {
  transactions: Transaction[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  onOpen: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}

export function LedgerTable({
  transactions,
  selected,
  onToggle,
  onToggleAll,
  allSelected,
  onOpen,
  onDelete,
}: LedgerTableProps) {
  return (
    <div className="overflow-hidden rounded-panel border border-hairline bg-surface">
      {/* header */}
      <div className="grid grid-cols-[28px_84px_1fr_130px_140px_120px_36px] items-center gap-3 border-b border-hairline px-5 py-3">
        <button
          type="button"
          onClick={onToggleAll}
          aria-label="Select all"
          className={[
            'flex h-4 w-4 items-center justify-center rounded border transition-colors',
            allSelected ? 'border-brass bg-brass text-void' : 'border-hairline-strong',
          ].join(' ')}
        >
          {allSelected && <Check size={11} />}
        </button>
        <HeaderCell>Date</HeaderCell>
        <HeaderCell>Merchant</HeaderCell>
        <HeaderCell>Category</HeaderCell>
        <HeaderCell>Account</HeaderCell>
        <HeaderCell className="text-right">Amount</HeaderCell>
        <HeaderCell className="text-right"> </HeaderCell>
      </div>

      {/* rows */}
      <div className="max-h-[560px] overflow-y-auto">
        {transactions.map((t) => {
          const acct = accountById(t.accountId);
          const isSel = selected.has(t.id);
          const type = txnType(t);
          return (
            <div
              key={t.id}
              className={[
                'group grid cursor-pointer grid-cols-[28px_84px_1fr_130px_140px_120px_36px] items-center gap-3 border-b border-hairline px-5 py-3.5 transition-colors',
                isSel ? 'bg-elevated' : 'hover:bg-elevated/50',
              ].join(' ')}
              onClick={() => onOpen(t)}
            >
              <button
                type="button"
                aria-label={`Select ${t.merchant}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(t.id);
                }}
                className={[
                  'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                  isSel ? 'border-brass bg-brass text-void' : 'border-hairline-strong',
                ].join(' ')}
              >
                {isSel && <Check size={11} />}
              </button>

              <span className="font-mono text-[0.78rem] text-muted">
                {formatDate(t.date)}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[0.9rem] text-bright">
                    {t.merchant}
                  </span>
                  <span
                    className={[
                      'flex-none rounded-full px-1.5 py-0.5 font-mono text-[0.56rem] uppercase tracking-wider',
                      type === 'income'
                        ? 'bg-gain/10 text-gain'
                        : 'bg-loss/10 text-loss',
                    ].join(' ')}
                  >
                    {type}
                  </span>
                </div>
                <div className="truncate text-[0.72rem] text-faint">
                  {t.description}
                </div>
              </div>

              <span className="flex items-center gap-2 text-[0.82rem] text-soft">
                <CategoryDot category={t.category} />
                <span className="truncate">{t.category}</span>
              </span>

              <span className="truncate text-[0.8rem] text-muted">
                {acct?.label ?? t.accountId}
              </span>

              <Money amount={t.amount} className="text-right text-[0.88rem]" />

              <button
                type="button"
                aria-label={`Delete ${t.merchant}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(t);
                }}
                className="flex h-7 w-7 items-center justify-center rounded-control text-faint opacity-0 transition-all hover:bg-loss/10 hover:text-loss group-hover:opacity-100"
              >
                <Trash2 size={14} strokeWidth={1.75} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HeaderCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint ${className}`}
    >
      {children}
    </span>
  );
}
