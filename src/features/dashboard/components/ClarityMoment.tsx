import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CountUpMoney } from './CountUpMoney';

interface ClarityMomentProps {
  safe: number;
  remaining?: number;
  income?: number;
  spending?: number;
}

export function ClarityMoment({ safe, remaining }: ClarityMomentProps) {
  const overspent = typeof remaining === 'number' && remaining < 0 && safe === 0;
  const label = overspent ? 'Over budget' : 'Safe to spend';
  const display = overspent ? (remaining ?? 0) : safe;
  const caption = overspent
    ? 'spending has overrun income this month'
    : 'available to spend freely this month';

  const innerRef = useRef<HTMLDivElement>(null);
  const [innerW, setInnerW] = useState(260);
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setInnerW(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const formatStr = (n: number) => {
    const s = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 2 });
    return n < 0 ? `−₹${s}` : `₹${s}`;
  };
  const amtStr = formatStr(display);
  const charCount = amtStr.length;
  const computed = (innerW * 0.78) / (charCount * 0.62);
  const fontSize = Math.min(Math.max(computed, 14), 38);

  return (
    <div className="relative flex flex-col items-center py-2 text-center sm:py-6">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        style={{ width: '140%', height: '140%', background: 'radial-gradient(ellipse at center, var(--em-glow-focal) 0%, transparent 64%)' }}
      />

      <motion.p
        className="relative mb-5 font-mono text-[0.68rem] uppercase tracking-[0.28em]"
        style={{ color: 'var(--em-brass)' }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {label}
      </motion.p>

      <motion.div
        className="relative"
        style={{
          width: 'clamp(240px, 36vw, 380px)', height: 'clamp(240px, 36vw, 380px)',
          borderRadius: '50%', padding: '2.5px',
          background: `conic-gradient(from 0deg, rgba(184,149,79,0.88) 0%, rgba(227,196,137,0.95) 18%, rgba(156,122,60,0.78) 36%, rgba(227,196,137,0.96) 54%, rgba(184,149,79,0.88) 70%, rgba(227,196,137,0.95) 86%, rgba(156,122,60,0.80) 100%)`,
          boxShadow: '0 0 0 1px rgba(184,149,79,0.15), 0 0 28px rgba(156,122,60,0.2), 0 0 56px rgba(156,122,60,0.09)',
          animation: 'em-ring-rotate 22s linear infinite, em-ring-pulse 5s ease-in-out infinite',
        }}
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <div style={{ width: '100%', height: '100%', borderRadius: '50%', animation: 'em-ring-counter 22s linear infinite', background: 'rgba(255,253,248,0.97)', padding: '13px', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div ref={innerRef} style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(ellipse at 38% 32%, rgba(255,253,248,1) 0%, rgba(247,242,233,0.97) 55%, rgba(237,231,219,0.94) 100%)', border: '1px solid rgba(210,201,182,0.5)', boxShadow: 'inset 0 2px 14px rgba(156,122,60,0.07), inset 0 -2px 8px rgba(100,80,40,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box' }}>
            <div className="relative flex flex-col items-center" style={{ padding: '0 8%', width: '100%', textAlign: 'center' }}>
              <span className="font-num whitespace-nowrap leading-none [&_*]:!text-inherit" style={{ fontSize: `${fontSize}px`, color: overspent ? '#B0432F' : '#3F7A52', display: 'block' }}>
                <CountUpMoney amount={display} colorize={false} decimalStyle="inline" />
              </span>
              <span className="leading-snug" style={{ display: 'block', marginTop: '0.55rem', fontSize: `${Math.max(10, fontSize * 0.38)}px`, color: '#6B6356', maxWidth: '72%' }}>
                {caption}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
