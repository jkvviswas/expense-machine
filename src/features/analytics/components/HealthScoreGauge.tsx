import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { HealthScore } from '../intelligence';

export function HealthScoreGauge({ health }: { health: HealthScore }) {
  const { score, label, components, trend } = health;
  const R = 64;
  const C = 2 * Math.PI * R;
  const tone =
    score >= 70 ? 'var(--em-gain)' : score >= 50 ? 'var(--em-brass)' : 'var(--em-loss)';
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendTone = trend === 'up' ? 'text-gain' : trend === 'down' ? 'text-loss' : 'text-muted';

  return (
    <div className="relative overflow-hidden rounded-panel border border-hairline bg-surface p-6">
      {/* halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-10 -top-10 h-48 w-48 rounded-full"
        style={{ background: 'radial-gradient(circle, var(--em-glow-brass), transparent 70%)' }}
      />
      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        {/* gauge */}
        <div className="relative flex-none">
          <svg width="160" height="160" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--em-elevated)" strokeWidth="8" />
            <motion.circle
              cx="80" cy="80" r={R} fill="none" stroke={tone} strokeWidth="8" strokeLinecap="round"
              transform="rotate(-90 80 80)"
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (score / 100) * C }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-num text-[2.6rem] leading-none  text-bright">{score}</span>
            <span className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-faint">/ 100</span>
          </div>
        </div>

        {/* label + components */}
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="font-serif text-[1.5rem] leading-tight text-bright">{label}</h3>
          </div>
          <div className={`mb-4 flex items-center gap-1.5 text-[0.8rem] ${trendTone}`}>
            <TrendIcon size={13} strokeWidth={2} />
            {trend === 'up' ? 'Improving vs last month' : trend === 'down' ? 'Softening vs last month' : 'Holding steady'}
          </div>
          <div className="flex flex-col gap-2.5">
            {components.map((c) => (
              <div key={c.label} className="flex items-center gap-3">
                <span className="w-32 flex-none text-[0.78rem] text-muted">{c.label}</span>
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-elevated">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'var(--em-brass-deep)' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(c.value * 100)}%` }}
                    transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <span className="w-8 flex-none text-right font-mono text-[0.72rem] text-faint">
                  {Math.round(c.value * 100)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
