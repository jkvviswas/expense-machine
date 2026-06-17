import { motion } from 'framer-motion';
import { formatMoneyFull } from '../../import/format';
import type { BudgetOverview as Overview } from '../derive';

export function BudgetOverview({ overview }: { overview: Overview }) {
  const { totalBudget, totalSpent, remaining, healthScore, overCount } = overview;

  const scoreTone =
    healthScore >= 75 ? 'var(--em-gain)' : healthScore >= 50 ? 'var(--em-watch)' : 'var(--em-loss)';
  const scoreLabel =
    healthScore >= 75 ? 'Healthy' : healthScore >= 50 ? 'Watchful' : 'Strained';

  return (
    <div className="grid gap-px overflow-hidden rounded-panel border border-hairline bg-hairline lg:grid-cols-[1fr_1fr_1fr_1.1fr]">
      <Cell label="Monthly budget">
        <span className="text-bright">{formatMoneyFull(totalBudget)}</span>
      </Cell>
      <Cell label="Spent so far">
        <span className="text-loss">{formatMoneyFull(totalSpent)}</span>
      </Cell>
      <Cell label="Remaining">
        <span className="text-gain">{formatMoneyFull(remaining)}</span>
      </Cell>

      {/* Budget health — restrained, no chart */}
      <div className="relative bg-surface px-6 py-4">
        <div className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
          Budget health
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-num text-[1.5rem] " style={{ color: scoreTone }}>
            {healthScore}
          </span>
          <span className="text-[0.8rem]" style={{ color: scoreTone }}>
            {scoreLabel}
          </span>
          {overCount > 0 && (
            <span className="ml-auto text-[0.72rem] text-loss">
              {overCount} over budget
            </span>
          )}
        </div>
        {/* thin discipline bar */}
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-elevated">
          <motion.div
            className="h-full rounded-full"
            style={{ background: scoreTone }}
            initial={{ width: 0 }}
            animate={{ width: `${healthScore}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-6 py-4">
      <div className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] text-faint">
        {label}
      </div>
      <div className="font-num text-[1.5rem] ">{children}</div>
    </div>
  );
}
