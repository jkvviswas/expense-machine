import { useNavigate } from 'react-router-dom';
import { ArrowRight, Trash2 } from 'lucide-react';
import { Money } from '../../import/components/Money';
import { CategoryDot } from '../../import/components/CategorySelect';
import { formatDate } from '../../import/format';
import { deleteTransactionWithUndo } from '../../transactions/actions';
import type { Transaction } from '../../transactions/types';

export function RecentActivity({ items }: { items: Transaction[] }) {
  const navigate = useNavigate();
  return (
    <div className="em-lift rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-serif text-[1.15rem] text-bright">Recent activity</h3>
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="flex items-center gap-1.5 text-[0.78rem] text-brass transition-colors hover:text-brass-bright"
        >
          View all
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="flex flex-col">
        {items.map((t, i) => (
          <div
            key={t.id}
            className={[
              'group flex items-center justify-between py-2.5',
              i < items.length - 1 ? 'border-b border-hairline' : '',
            ].join(' ')}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[0.88rem] text-bright">
                <CategoryDot category={t.category} />
                <span className="truncate">{t.merchant}</span>
              </div>
              <div className="ml-4 text-[0.72rem] text-faint">
                {formatDate(t.date)} · {t.category}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Money amount={t.amount} className="text-[0.86rem]" />
              <button
                type="button"
                aria-label={`Delete ${t.merchant}`}
                onClick={() => deleteTransactionWithUndo(t)}
                className="flex h-7 w-7 items-center justify-center rounded-control text-faint opacity-0 transition-all hover:bg-loss/10 hover:text-loss group-hover:opacity-100"
              >
                <Trash2 size={13} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
