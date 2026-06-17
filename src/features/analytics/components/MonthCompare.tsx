import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMoneyFull } from '../../import/format';
import type { MonthComparison } from '../derive';

function ChangeChip({ pct, invert }: { pct: number | null; invert?: boolean }) {
  if (pct == null) return <span className="font-mono text-[0.72rem] text-faint">new</span>;
  const up = pct > 2;
  const down = pct < -2;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  // For spending, up is bad (loss-toned); invert flips that for income/net.
  const good = invert ? up : down;
  const bad = invert ? down : up;
  const tone = good ? 'text-gain' : bad ? 'text-loss' : 'text-muted';
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[0.72rem] ${tone}`}>
      <Icon size={11} strokeWidth={2} />
      {pct > 0 ? '+' : ''}
      {Math.round(pct)}%
    </span>
  );
}

interface RowProps {
  label: string;
  prev: number;
  cur: number;
  prevLabel: string;
  curLabel: string;
  max: number;
  pct: number | null;
  invertTone?: boolean;
  tone: string;
}

function CompareRow({ label, prev, cur, prevLabel, curLabel, max, pct, invertTone, tone }: RowProps) {
  const pPrev = max > 0 ? Math.min(Math.abs(prev) / max, 1) * 100 : 0;
  const pCur = max > 0 ? Math.min(Math.abs(cur) / max, 1) * 100 : 0;
  return (
    <div className="py-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.86rem] text-soft">{label}</span>
        <ChangeChip pct={pct} invert={invertTone} />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-3">
          <span className="w-9 flex-none font-mono text-[0.64rem] uppercase tracking-wider text-faint">
            {prevLabel}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-elevated">
            <div className="absolute inset-y-0 left-0 rounded-full bg-hairline-strong" style={{ width: `${pPrev}%` }} />
          </div>
          <span className="w-24 flex-none text-right font-mono text-[0.74rem] text-muted">
            {formatMoneyFull(prev)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-9 flex-none font-mono text-[0.64rem] uppercase tracking-wider text-brass">
            {curLabel}
          </span>
          <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-elevated">
            <div className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700" style={{ width: `${pCur}%`, background: tone }} />
          </div>
          <span className="w-24 flex-none text-right font-mono text-[0.74rem] text-bright">
            {formatMoneyFull(cur)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function MonthCompare({ comparison }: { comparison: MonthComparison }) {
  const { current, previous } = comparison;
  if (!current) return null;

  // Single-month fallback: still show current values, no comparison rows.
  const prevFlow = previous ?? { inflow: 0, outflow: 0, net: 0, month: current.month };
  const max = Math.max(
    current.inflow,
    current.outflow,
    Math.abs(current.net),
    prevFlow.inflow,
    prevFlow.outflow,
    Math.abs(prevFlow.net),
    1,
  );

  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-serif text-[1.15rem] text-bright">
          {previous ? `${previous.month.label} vs ${current.month.label}` : `${current.month.label} overview`}
        </h3>
        <span className="font-mono text-[0.74rem] text-faint">Month comparison</span>
      </div>
      <div className="flex flex-col divide-y divide-hairline">
        <CompareRow
          label="Income"
          prev={prevFlow.inflow}
          cur={current.inflow}
          prevLabel={prevFlow.month.label}
          curLabel={current.month.label}
          max={max}
          pct={comparison.incomeChangePct}
          invertTone
          tone="var(--em-gain)"
        />
        <CompareRow
          label="Spending"
          prev={prevFlow.outflow}
          cur={current.outflow}
          prevLabel={prevFlow.month.label}
          curLabel={current.month.label}
          max={max}
          pct={comparison.spendChangePct}
          tone="var(--em-loss)"
        />
        <CompareRow
          label="Net savings"
          prev={prevFlow.net}
          cur={current.net}
          prevLabel={prevFlow.month.label}
          curLabel={current.month.label}
          max={max}
          pct={comparison.netChangePct}
          invertTone
          tone="var(--em-brass)"
        />
      </div>
    </div>
  );
}
