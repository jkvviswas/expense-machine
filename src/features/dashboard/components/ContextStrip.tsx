import { formatMoneyFull } from '../../import/format';

interface ContextStripProps {
  income: number;
  spending: number;
  upcoming: number;
  remaining: number;
}

/**
 * Executive metric row — sits ABOVE the hero as supporting evidence for
 * Safe to Spend. Four compact briefing cards on one subtle glass surface,
 * separated by thin brass dividers. No strong glow; calm and expensive.
 * (Pure presentation — values are passed in unchanged from derive.ts.)
 */
export function ContextStrip({ income, spending, upcoming, remaining }: ContextStripProps) {
  const cells = [
    { label: 'Money in', value: income, tone: 'gain' as const, sign: false },
    { label: 'Money out', value: spending, tone: 'loss' as const, sign: true },
    { label: 'Upcoming', value: upcoming, tone: 'watch' as const, sign: true },
    { label: 'Remaining', value: remaining, tone: 'neutral' as const, sign: false },
  ];
  return (
    <div
      className="grid grid-cols-2 overflow-hidden rounded-panel border border-hairline lg:grid-cols-4"
      style={{
        // extremely subtle glass: a faint warm wash over the surface, no glow
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0)) , var(--em-surface)',
      }}
    >
      {cells.map((c, i) => {
        const toneClass =
          c.tone === 'gain'
            ? 'text-gain'
            : c.tone === 'loss'
              ? 'text-loss'
              : c.tone === 'watch'
                ? 'text-watch'
                : 'text-bright';
        const display = c.sign ? -Math.abs(c.value) : c.value;
        return (
          <div
            key={c.label}
            className={[
              'relative px-6 py-5',
              // thin brass divider between cells (not after the last in a row)
              i % 2 !== 0 ? '' : '',
            ].join(' ')}
            style={{
              borderLeft: i === 0 ? 'none' : '1px solid var(--em-hairline)',
            }}
          >
            {/* hairline brass tick above the divider for a premium seam */}
            {i !== 0 && (
              <span
                className="absolute left-0 top-1/2 hidden h-8 w-px -translate-y-1/2 lg:block"
                style={{
                  background:
                    'linear-gradient(180deg, transparent, var(--em-brass-deep), transparent)',
                  opacity: 0.5,
                }}
                aria-hidden
              />
            )}
            <div className="mb-2 font-mono text-[0.65rem] uppercase tracking-[0.13em] text-muted">
              {c.label}
            </div>
            <div className={`font-num text-[1.2rem] ${toneClass}`}>
              {formatMoneyFull(display)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
