import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const EASE = [0.22, 1, 0.36, 1] as const;

/* One incoming particle: starts at a point on a ring and collides into center. */
interface Atom {
  angle: number;
  dist: number;
  size: number;
  delay: number;
}

function makeAtoms(n: number): Atom[] {
  return Array.from({ length: n }, (_, i) => ({
    angle: (i / n) * Math.PI * 2 + Math.random() * 0.6,
    dist: 360 + Math.random() * 360,
    size: 1.5 + Math.random() * 4,
    // Spread emission across most of the gather window so atoms keep streaming
    // in like a slow indrawn breath rather than a single quick burst.
    delay: Math.random() * 2.2,
  }));
}

/**
 * A full-screen cinematic transition. Particles stream in from the edges and
 * collide at a glowing core while a percentage counts to 100; the core then
 * expands to fill the screen and we navigate. Used when entering the app from
 * the landing page so the jump feels like crossing a threshold, not a page load.
 */
export function PortalTransition({
  open,
  to,
  label = 'Preparing your ledger',
  onCancel,
}: {
  open: boolean;
  to: string;
  label?: string;
  onCancel?: () => void;
}) {
  const navigate = useNavigate();
  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<'gather' | 'expand'>('gather');
  const atoms = useRef(makeAtoms(72));
  const reduce = useRef(
    typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (!open) {
      setPct(0);
      setPhase('gather');
      atoms.current = makeAtoms(72);
      return;
    }
    // Reduced motion: skip straight through.
    if (reduce.current) {
      const t = setTimeout(() => navigate(to), 300);
      return () => clearTimeout(t);
    }
    let raf = 0;
    const start = performance.now();
    const DURATION = 2800; // gather + count — slow, ceremonial (was a flash before)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION);
      // ease-out cubic for a luxurious, decelerating settle
      const eased = 1 - Math.pow(1 - t, 2.6);
      setPct(Math.round(eased * 100));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setPhase('expand');
        setTimeout(() => navigate(to), 950);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, to, navigate]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          style={{ background: 'rgba(8,6,3,0.92)', backdropFilter: 'blur(6px)' }}
          onClick={onCancel}
        >
          {/* particle field */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {phase === 'gather' &&
              atoms.current.map((a, i) => {
                const x0 = Math.cos(a.angle) * a.dist;
                const y0 = Math.sin(a.angle) * a.dist;
                return (
                  <motion.span
                    key={i}
                    className="absolute rounded-full"
                    style={{
                      width: a.size,
                      height: a.size,
                      background: 'var(--em-brass-bright)',
                      boxShadow: '0 0 8px var(--em-brass), 0 0 16px var(--em-glow-focal)',
                    }}
                    initial={{ x: x0, y: y0, opacity: 0 }}
                    animate={{ x: 0, y: 0, opacity: [0, 0.9, 1, 0.85, 0] }}
                    transition={{
                      duration: 2.9, // slower, drifting inward (was a flash)
                      delay: a.delay,
                      ease: [0.4, 0, 0.2, 1],
                      times: [0, 0.25, 0.6, 0.85, 1],
                    }}
                  />
                );
              })}
          </div>

          {/* concentric pulse rings around the core — quiet, luxurious */}
          {phase === 'gather' &&
            [0, 1, 2].map((r) => (
              <motion.div
                key={r}
                aria-hidden
                className="absolute rounded-full border"
                style={{ borderColor: 'var(--em-brass-deep)' }}
                initial={{ width: 60, height: 60, opacity: 0 }}
                animate={{ width: [60, 360], height: [60, 360], opacity: [0, 0.35, 0] }}
                transition={{ duration: 3, repeat: Infinity, delay: r * 1, ease: 'easeOut' }}
              />
            ))}

          {/* glowing core that becomes the portal */}
          <motion.div
            className="relative flex items-center justify-center rounded-full"
            initial={{ width: 8, height: 8, opacity: 0.6 }}
            animate={
              phase === 'expand'
                ? { width: 2600, height: 2600, opacity: 1 }
                : { width: [108, 132, 120], height: [108, 132, 120], opacity: 1 }
            }
            transition={{
              duration: phase === 'expand' ? 0.95 : 2.4,
              ease: EASE,
              repeat: phase === 'expand' ? 0 : Infinity,
              repeatType: 'reverse',
            }}
            style={{
              background:
                phase === 'expand'
                  ? 'radial-gradient(circle, var(--em-ground) 30%, var(--em-brass) 100%)'
                  : 'radial-gradient(circle, var(--em-brass-bright) 0%, var(--em-brass-deep) 58%, transparent 74%)',
              boxShadow: '0 0 80px var(--em-glow-focal), 0 0 30px var(--em-brass)',
            }}
          />


          {/* percentage + label — fade out as the portal expands.
              Fixed light colors (the overlay is always dark, regardless of theme). */}
          <motion.div
            className="absolute bottom-[16%] left-1/2 w-[min(440px,84vw)] -translate-x-1/2 text-center"
            animate={{ opacity: phase === 'expand' ? 0 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-3 flex items-baseline justify-center gap-1.5">
              <span
                className="font-num text-[2.8rem] font-medium tabular-nums"
                style={{ color: '#F4ECDD', textShadow: '0 0 22px rgba(214,176,90,0.55)' }}
              >
                {pct}
              </span>
              <span className="font-mono text-[1rem]" style={{ color: '#EAC870' }}>%</span>
            </div>
            <div
              className="h-[4px] w-full overflow-hidden rounded-full"
              style={{ background: 'rgba(244,236,221,0.14)' }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  width: `${pct}%`,
                  background: 'linear-gradient(90deg, #B38A3A, #EAC870)',
                  boxShadow: '0 0 12px rgba(234,200,112,0.7)',
                }}
              />
            </div>
            <p
              className="mt-3.5 font-mono text-[0.66rem] uppercase tracking-[0.22em]"
              style={{ color: 'rgba(244,236,221,0.66)' }}
            >
              {label}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
