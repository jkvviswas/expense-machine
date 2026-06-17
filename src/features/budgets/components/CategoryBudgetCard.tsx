import { motion } from 'framer-motion';
import { Pencil, Trash2 } from 'lucide-react';
import { CategoryDot } from '../../import/components/CategorySelect';
import { formatMoneyFull } from '../../import/format';
import type { CategoryBudget } from '../derive';

interface CategoryBudgetCardProps {
  budget: CategoryBudget;
  onOpen: (c: CategoryBudget) => void;
  onEdit: (c: CategoryBudget) => void;
  onDelete: (c: CategoryBudget) => void;
}

export function CategoryBudgetCard({ budget, onOpen, onEdit, onDelete }: CategoryBudgetCardProps) {
  const { category, cap, spent, remaining, ratio, status } = budget;
  const tone =
    status === 'over'
      ? 'var(--em-loss)'
      : status === 'watch'
        ? 'var(--em-watch)'
        : 'var(--em-brass-deep)';
  const pct = Math.min(ratio, 1) * 100;

  return (
    <div
      onClick={() => onOpen(budget)}
      className="group cursor-pointer rounded-panel border border-hairline bg-surface p-5 transition-colors duration-300 ease-lux hover:border-hairline-strong"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <CategoryDot category={category} />
          <span className="text-[0.95rem] text-bright">{category}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label={`Edit ${category} budget`}
            onClick={(e) => {
              e.stopPropagation();
              onEdit(budget);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted transition-colors duration-300 hover:bg-elevated hover:text-brass"
          >
            <Pencil size={13} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            aria-label={`Delete ${category} budget`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(budget);
            }}
            className="flex h-7 w-7 items-center justify-center rounded-control text-muted transition-colors duration-300 hover:bg-loss/10 hover:text-loss"
          >
            <Trash2 size={13} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-num text-[1.15rem] text-bright">
          {formatMoneyFull(spent)}
        </span>
        <span className="font-mono text-[0.78rem] text-faint">
          of {formatMoneyFull(cap)}
        </span>
      </div>

      <div className="relative h-1.5 overflow-hidden rounded-full bg-elevated">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: tone }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-[0.75rem]">
        <span
          style={{ color: tone }}
          className="font-mono uppercase tracking-wider"
        >
          {status === 'over' ? 'Over budget' : status === 'watch' ? 'Approaching' : 'On track'}
        </span>
        <span className={remaining >= 0 ? 'text-muted' : 'text-loss'}>
          {remaining >= 0
            ? `${formatMoneyFull(remaining)} left`
            : `${formatMoneyFull(Math.abs(remaining))} over`}
        </span>
      </div>
    </div>
  );
}
