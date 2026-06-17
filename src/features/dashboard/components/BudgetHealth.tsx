import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatMoneyFull } from '../../import/format';
import type { BudgetRow } from '../derive';

export function BudgetHealth({ rows }: { rows: BudgetRow[] }) {
  const navigate = useNavigate();
  return (
    <div className="em-lift rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-serif text-[1.15rem] text-bright">Budget health</h3>
        <button
          type="button"
          onClick={() => navigate('/budgets')}
          className="flex items-center gap-1.5 text-[0.78rem] text-brass transition-colors hover:text-brass-bright"
        >
          Manage
          <ArrowRight size={13} />
        </button>
      </div>
      <div className="flex flex-col gap-4">
        {rows.map((r) => {
          const over = r.ratio >= 1;
          const near = r.ratio >= 0.8 && r.ratio < 1;
          const barTone = over
            ? 'var(--em-loss)'
            : near
              ? 'var(--em-watch)'
              : 'var(--em-brass-deep)';
          return (
            <div key={r.category}>
              <div className="mb-1.5 flex items-center justify-between text-[0.82rem]">
                <span className="text-soft">{r.category}</span>
                <span className="font-mono text-[0.76rem] text-muted">
                  {formatMoneyFull(r.spent)}{' '}
                  <span className="text-faint">/ {formatMoneyFull(r.cap)}</span>
                </span>
              </div>
              <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ background: barTone }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(r.ratio, 1) * 100}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
