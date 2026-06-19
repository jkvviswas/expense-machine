import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CountUpMoney } from './CountUpMoney';
import { formatMoneyCompact } from '../../../lib/money';

function TrendBadge({ net, prevNet }: { net: number; prevNet: number }) {
  if (prevNet === 0) return null;
  const pct = Math.abs(((net - prevNet) / Math.abs(prevNet)) * 100);
  if (pct < 0.5) return null;
  const up = net > prevNet;
  return (
    <div
      className="mb-2.5 flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.64rem] font-medium tracking-wide"
      style={{
        background: up ? 'rgba(47,125,91,0.08)' : 'rgba(196,107,88,0.08)',
        borderColor: up ? 'rgba(47,125,91,0.28)' : 'rgba(196,107,88,0.28)',
        color: up ? 'var(--em-gain)' : 'var(--em-loss)',
      }}
    >
      {up ? '↑' : '↓'} {pct.toFixed(1)}% vs last month
    </div>
  );
}

export function NetPositionMoment({
  net,
  prevNet = 0,
  onBreakdown,
}: {
  net: number;
  prevNet?: number;
  onBreakdown?: () => void;
}) {
  const positive = net >= 0;

  const innerRef = useRef<HTMLDivElement>(null);
  const [innerW, setInnerW] = useState(260);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInnerW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const amtStr = formatMoneyCompact(net);
  const fontSize = Math.min(Math.max((innerW * 0.78) / (amtStr.length * 0.62), 14), 38);

  return (
    <div className="relative flex flex-col items-center py-2 text-center sm:py-6">
      {/* Ambient blue halo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{
          width: '150%',
          height: '150%',
          background: 'radial-gradient(ellipse at center, var(--em-glow-focal) 0%, transparent 62%)',
        }}
      />

      <motion.p
        className="relative mb-5 font-mono text-[0.67rem] uppercase tracking-[0.26em]"
        style={{ color: 'var(--em-brass)' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        Net this month
      </motion.p>

      {/* Luxury gold outer ring */}
      <motion.div
        style={{
          width: 'clamp(240px, 36vw, 380px)',
          height: 'clamp(240px, 36vw, 380px)',
          borderRadius: '50%',
          padding: '2.5px',
          background: `conic-gradient(
            from 0deg,
            rgba(138,106,47,0.84) 0%,
            rgba(200,160,70,0.96) 20%,
            rgba(228,195,120,0.90) 40%,
            rgba(200,160,70,0.96) 60%,
            rgba(138,106,47,0.84) 78%,
            rgba(228,195,120,0.90) 90%,
            rgba(138,106,47,0.84) 100%
          )`,
          boxShadow: [
            '0 0 0 1px rgba(138,106,47,0.14)',
            '0 0 28px rgba(138,106,47,0.22)',
            '0 0 56px rgba(138,106,47,0.09)',
          ].join(', '),
          animation: 'em-ring-rotate 22s linear infinite, em-ring-pulse-gold 5s ease-in-out infinite',
        }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Cloudy Sky middle ring */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            animation: 'em-ring-counter 22s linear infinite',
            background: 'var(--em-elevated)',
            padding: '12px',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Inner surface circle */}
          <div
            ref={innerRef}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'var(--em-surface)',
              border: '1px solid var(--em-hairline)',
              boxShadow: [
                'inset 0 2px 12px rgba(40,114,161,0.06)',
                'inset 0 -1px 6px rgba(16,33,43,0.04)',
              ].join(', '),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="relative flex flex-col items-center"
              style={{ padding: '0 8%', width: '100%', textAlign: 'center' }}
            >
              <TrendBadge net={net} prevNet={prevNet} />

              <span
                className="font-num whitespace-nowrap leading-none"
                style={{
                  fontSize: `${fontSize}px`,
                  color: positive ? 'var(--em-gain)' : 'var(--em-loss)',
                  display: 'block',
                }}
              >
                <CountUpMoney amount={net} colorize={false} decimalStyle="inline" />
              </span>

              <span
                style={{
                  display: 'block',
                  marginTop: '0.55rem',
                  fontSize: `${Math.max(10, fontSize * 0.38)}px`,
                  color: 'var(--em-muted)',
                  maxWidth: '72%',
                  lineHeight: 1.4,
                }}
              >
                {positive ? 'more came in than went out this month' : 'more went out than came in this month'}
              </span>

              {onBreakdown && (
                <button
                  type="button"
                  onClick={onBreakdown}
                  style={{
                    marginTop: '0.8rem',
                    border: '1px solid var(--em-brass-deep)',
                    borderRadius: '999px',
                    padding: '3px 12px',
                    fontSize: `${Math.max(9, fontSize * 0.3)}px`,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                    color: 'var(--em-brass)',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'var(--em-glow-brass)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                  }}
                >
                  View breakdown
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      <style>{`
        @keyframes em-ring-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes em-ring-counter {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @keyframes em-ring-pulse-gold {
          0%, 100% { box-shadow: 0 0 0 1px rgba(138,106,47,0.14), 0 0 28px rgba(138,106,47,0.22), 0 0 56px rgba(138,106,47,0.09); }
          50%       { box-shadow: 0 0 0 1px rgba(138,106,47,0.22), 0 0 40px rgba(138,106,47,0.34), 0 0 80px rgba(138,106,47,0.14); }
        }
      `}</style>
    </div>
  );
}
