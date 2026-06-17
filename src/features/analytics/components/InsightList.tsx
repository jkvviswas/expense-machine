import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Insight } from '../derive';

export function TrendChip({
  direction,
  changePct,
}: {
  direction: 'up' | 'down' | 'flat';
  changePct: number | null;
}) {
  const Icon = direction === 'up' ? TrendingUp : direction === 'down' ? TrendingDown : Minus;
  // For spending, "up" is loss-toned, "down" is gain-toned.
  const tone =
    direction === 'up' ? 'text-loss' : direction === 'down' ? 'text-gain' : 'text-muted';
  const label =
    changePct == null ? 'new' : `${changePct > 0 ? '+' : ''}${Math.round(changePct)}%`;
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[0.74rem] ${tone}`}>
      <Icon size={12} strokeWidth={2} />
      {label}
    </span>
  );
}

export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <div className="rounded-panel border border-hairline bg-surface p-6">
      <h3 className="mb-4 font-serif text-[1.15rem] text-bright">Financial insights</h3>
      <div className="flex flex-col gap-3.5">
        {insights.map((ins) => {
          const dot =
            ins.tone === 'gain'
              ? 'var(--em-gain)'
              : ins.tone === 'loss'
                ? 'var(--em-loss)'
                : 'var(--em-brass)';
          return (
            <div key={ins.id} className="flex items-start gap-3">
              <span
                className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full"
                style={{ background: dot }}
              />
              <p className="text-[0.88rem] leading-snug text-soft">{ins.text}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
