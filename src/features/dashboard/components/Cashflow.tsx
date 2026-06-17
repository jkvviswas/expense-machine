import { useMemo, useState } from 'react';
import { formatMoneyFull } from '../../import/format';
import type { CashPoint } from '../derive';

/**
 * 30-day cashflow. Works purely from the locked CashPoint series ({date, net}
 * cumulative). We derive daily movement (net deltas) for context, draw a true
 * zero baseline, light gridlines, a date axis, peak/trough + latest markers,
 * and a hover crosshair with a tooltip. Presentation only — no data shape or
 * calculation is changed.
 */
export function Cashflow({ series }: { series: CashPoint[] }) {
  const W = 560;
  const H = 168;
  const padX = 8;
  const padTop = 14;
  const padBot = 26; // room for the date axis

  const [hover, setHover] = useState<number | null>(null);

  const model = useMemo(() => {
    if (series.length < 2) return null;
    const nets = series.map((p) => p.net);
    const min = Math.min(...nets, 0);
    const max = Math.max(...nets, 0);
    const span = max - min || 1;

    const x = (i: number) => padX + (i / (series.length - 1)) * (W - padX * 2);
    const y = (v: number) => padTop + (1 - (v - min) / span) * (H - padTop - padBot);
    const yZero = y(0);

    const pts = series.map((p, i) => ({ x: x(i), y: y(p.net), ...p }));
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const area = `${line} L${pts[pts.length - 1].x.toFixed(1)},${yZero.toFixed(1)} L${pts[0].x.toFixed(1)},${yZero.toFixed(1)} Z`;

    const deltas = series.map((p, i) => (i === 0 ? p.net : p.net - series[i - 1].net));
    const last = pts[pts.length - 1];
    const peakIdx = nets.indexOf(Math.max(...nets));
    const troughIdx = nets.indexOf(Math.min(...nets));

    return { pts, line, area, yZero, last, deltas, min, max, peakIdx, troughIdx };
  }, [series]);

  const fmtDay = (iso: string) =>
    new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

  const lastNet = model ? model.last.net : 0;

  return (
    <div className="em-lift rounded-panel border border-hairline bg-surface p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="font-serif text-[1.15rem] text-bright">30-day cashflow</h3>
        <span className="font-num text-[0.82rem] text-soft">
          Net so far{' '}
          <span className={lastNet >= 0 ? 'text-gain' : 'text-loss'}>{formatMoneyFull(lastNet)}</span>
        </span>
      </div>
      <p className="mb-3 text-[0.74rem] leading-snug text-muted">
        Running balance — income minus spending, added up day by day from the start of the window.
      </p>

      {!model ? (
        <div className="flex h-[168px] items-center justify-center text-[0.82rem] text-muted">
          Not enough activity yet to chart.
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            style={{ height: H }}
            onMouseLeave={() => setHover(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const rx = ((e.clientX - rect.left) / rect.width) * W;
              let best = 0;
              let bestD = Infinity;
              model.pts.forEach((p, i) => {
                const d = Math.abs(p.x - rx);
                if (d < bestD) { bestD = d; best = i; }
              });
              setHover(best);
            }}
          >
            <defs>
              <linearGradient id="cf-wash" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--em-brass)" stopOpacity="0.16" />
                <stop offset="100%" stopColor="var(--em-brass)" stopOpacity="0" />
              </linearGradient>
            </defs>

            {[0, 0.5, 1].map((t) => {
              const gy = padTop + t * (H - padTop - padBot);
              return (
                <line key={t} x1={padX} y1={gy} x2={W - padX} y2={gy}
                  stroke="var(--em-hairline)" strokeWidth="1" strokeOpacity={t === 0.5 ? 0.4 : 0.7} />
              );
            })}

            <line x1={padX} y1={model.yZero} x2={W - padX} y2={model.yZero}
              stroke="var(--em-hairline-strong)" strokeWidth="1" strokeDasharray="2 3" />
            <text x={W - padX} y={model.yZero - 4} textAnchor="end"
              className="font-mono" fontSize="8.5" fill="var(--em-faint)"
              style={{ letterSpacing: '0.06em' }}>
              ₹0 START
            </text>

            <path d={model.area} fill="url(#cf-wash)" />
            <path d={model.line} fill="none" stroke="var(--em-brass)" strokeWidth="1.75"
              strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />

            {[model.peakIdx, model.troughIdx].map((idx, k) => (
              idx >= 0 && idx !== model.pts.length - 1 ? (
                <circle key={k} cx={model.pts[idx].x} cy={model.pts[idx].y} r="2.5"
                  fill="var(--em-ground)" stroke="var(--em-brass-deep)" strokeWidth="1.25" />
              ) : null
            ))}

            <circle cx={model.last.x} cy={model.last.y} r="3.5"
              fill="var(--em-brass)" stroke="var(--em-ground)" strokeWidth="1.5" />

            {hover !== null && (
              <g>
                <line x1={model.pts[hover].x} y1={padTop} x2={model.pts[hover].x} y2={H - padBot}
                  stroke="var(--em-hairline-strong)" strokeWidth="1" />
                <circle cx={model.pts[hover].x} cy={model.pts[hover].y} r="7"
                  fill="var(--em-brass)" fillOpacity="0.16" />
                <circle cx={model.pts[hover].x} cy={model.pts[hover].y} r="4"
                  fill="var(--em-brass-bright)" stroke="var(--em-ground)" strokeWidth="1.5" />
              </g>
            )}

            {[0, Math.floor((series.length - 1) / 2), series.length - 1].map((idx, k) => (
              <text key={k} x={Math.min(Math.max(model.pts[idx].x, 18), W - 18)} y={H - 8}
                textAnchor={k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}
                className="font-mono" fontSize="9" fill="var(--em-faint)"
                style={{ letterSpacing: '0.04em' }}>
                {fmtDay(series[idx].date).toUpperCase()}
              </text>
            ))}
          </svg>

          {hover !== null && (() => {
            // Anchor the tooltip to the hovered point but push it clear so it
            // never covers the point. Horizontally: sit on the side that has
            // room (left half → tooltip to the right, right half → to the left).
            // Vertically: above the point when the point is low, below when the
            // point is high — so the plotted dot stays visible at all times.
            const px = (model.pts[hover].x / W) * 100; // % across
            const pyFrac = model.pts[hover].y / H; // 0 (top) … 1 (bottom)
            const onRightHalf = px > 55;
            const pointIsHigh = pyFrac < 0.4; // near the top of the plot
            return (
              <div
                className="pointer-events-none absolute z-10 rounded-control border border-hairline-strong bg-elevated px-3 py-2 shadow-elevated"
                style={{
                  left: `${px}%`,
                  top: `${pyFrac * 100}%`,
                  // shift off the point: opposite horizontal side + vertical clear
                  transform: `translate(${onRightHalf ? 'calc(-100% - 14px)' : '14px'}, ${pointIsHigh ? '12px' : 'calc(-100% - 12px)'})`,
                }}
              >
                <div className="font-mono text-[0.58rem] uppercase tracking-[0.12em] text-faint">
                  {fmtDay(series[hover].date)}
                </div>
                <div className="mt-0.5 font-num text-[0.82rem] text-bright">
                  {formatMoneyFull(series[hover].net)}
                </div>
                <div className="font-num text-[0.66rem]">
                  <span className={model.deltas[hover] >= 0 ? 'text-gain' : 'text-loss'}>
                    {model.deltas[hover] >= 0 ? '+' : ''}{formatMoneyFull(model.deltas[hover])}
                  </span>
                  <span className="text-faint"> that day</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
