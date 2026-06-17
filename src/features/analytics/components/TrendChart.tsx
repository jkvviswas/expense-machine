import { useId } from 'react';

interface TrendChartProps {
  /** Numeric series, oldest → newest. */
  values: number[];
  /** Optional labels under each point. */
  labels?: string[];
  height?: number;
  /** Show dots on each vertex. */
  dots?: boolean;
}

/**
 * A restrained area + line chart. Brass stroke, faint wash, hairline baseline,
 * no gridlines or axes. Per Design System V2 chart rules — the data is the
 * drama, the chrome disappears.
 */
export function TrendChart({ values, labels, height = 140, dots = true }: TrendChartProps) {
  const gid = useId().replace(/:/g, '');
  const W = 600;
  const H = height;
  const pad = 10;
  const labelSpace = labels ? 18 : 0;

  if (values.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-[0.82rem] text-faint"
        style={{ height: H }}
      >
        Not enough data to chart yet.
      </div>
    );
  }

  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const span = max - min || 1;
  const innerH = H - pad * 2 - labelSpace;

  const x = (i: number) => pad + (i / (values.length - 1)) * (W - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * innerH;

  const pts = values.map((v, i) => [x(i), y(v)] as const);
  const line = pts.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const baseY = pad + innerH;
  const area = `${line} L${x(values.length - 1).toFixed(1)},${baseY} L${x(0).toFixed(1)},${baseY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`wash-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--em-brass)" stopOpacity="0.13" />
          <stop offset="100%" stopColor="var(--em-brass)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={pad} y1={baseY} x2={W - pad} y2={baseY} stroke="var(--em-hairline)" strokeWidth="1" />
      <path d={area} fill={`url(#wash-${gid})`} />
      <path
        d={line}
        fill="none"
        stroke="var(--em-brass)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {dots &&
        pts.map(([px, py], i) => (
          <circle key={i} cx={px} cy={py} r="2.5" fill="var(--em-ground)" stroke="var(--em-brass)" strokeWidth="1.5" />
        ))}
      {labels &&
        labels.map((l, i) => (
          <text
            key={i}
            x={x(i)}
            y={H - 4}
            textAnchor="middle"
            fontSize="9"
            fontFamily="IBM Plex Mono, monospace"
            fill="var(--em-faint)"
          >
            {l}
          </text>
        ))}
    </svg>
  );
}

interface ComparisonBarProps {
  value: number;
  max: number;
  tone?: string;
}

/** A single elegant horizontal comparison bar. */
export function ComparisonBar({ value, max, tone = 'var(--em-brass-deep)' }: ComparisonBarProps) {
  const pct = max > 0 ? Math.min(value / max, 1) * 100 : 0;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-elevated">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
        style={{ width: `${pct}%`, background: tone }}
      />
    </div>
  );
}
