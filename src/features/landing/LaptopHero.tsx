import { useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { ArrowRight, ShieldCheck, EyeOff, HardDrive } from 'lucide-react';
import { MajesticButton, scrollToId } from './MajesticButton';

const EASE = [0.22, 1, 0.36, 1] as const;

const heroStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.1 } },
};
const heroRise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: EASE } },
};

/**
 * Premium, asymmetric hero. A faint constellation arc sweeps behind a
 * left-weighted headline and CTAs; the real dashboard floats below with depth
 * and a slow parallax drift — the product itself is the showcase (no device
 * frame). Composition is intentionally off-center to feel designed, not
 * defaulted.
 */
export function LaptopHero({
  onEnterApp,
  onRegister,
}: {
  onEnterApp: () => void;
  onRegister: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  // Slow parallax drift + settle for the floating product.
  const shotY = useSpring(useTransform(scrollYProgress, [0, 1], [0, -60]), {
    stiffness: 40,
    damping: 22,
  });
  const glowY = useSpring(useTransform(scrollYProgress, [0, 1], [0, 160]), {
    stiffness: 30,
    damping: 22,
  });

  return (
    <section ref={ref} className="relative overflow-hidden px-6 pt-16 sm:pt-24">
      {/* ---- ambient field: constellation arc + drifting glow ---- */}
      <motion.div aria-hidden style={{ y: glowY }} className="pointer-events-none absolute inset-0">
        {/* sweeping arc */}
        <svg
          className="absolute -right-[10%] -top-[18%] h-[820px] w-[1100px] opacity-[0.5]"
          viewBox="0 0 1100 820"
          fill="none"
        >
          <defs>
            <linearGradient id="arc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--em-brass)" stopOpacity="0" />
              <stop offset="55%" stopColor="var(--em-brass)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--em-brass-bright)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="560" cy="430" r="520" stroke="url(#arc)" strokeWidth="1.2" />
          <circle cx="560" cy="430" r="640" stroke="url(#arc)" strokeWidth="0.8" />
        </svg>
        {/* a few quiet stars along the arc */}
        {[
          [78, 30], [60, 18], [92, 46], [48, 60], [70, 8], [86, 64],
        ].map(([l, t], i) => (
          <motion.span
            key={i}
            className="absolute h-1 w-1 rounded-full bg-brass"
            style={{ left: `${l}%`, top: `${t}%` }}
            animate={{ opacity: [0.2, 0.8, 0.2] }}
            transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: i * 0.6 }}
          />
        ))}
        {/* warm focal glow, lower-left of the arc */}
        <div
          className="absolute left-[8%] top-[34%] h-[460px] w-[460px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--em-glow-focal) 0%, transparent 64%)' }}
        />
      </motion.div>

      <div className="relative mx-auto max-w-content">
        {/* ---- headline block: left-weighted, asymmetric ---- */}
        <motion.div
          variants={heroStagger}
          initial="hidden"
          animate="show"
          className="max-w-2xl pt-6 sm:pt-10"
        >
          <motion.div
            variants={heroRise}
            className="mb-6 inline-flex items-center gap-2 rounded-focal border border-hairline bg-surface px-4 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-brass backdrop-blur-sm"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-brass" />
            A Financial Operating System
          </motion.div>
          <motion.h1
            variants={heroRise}
            className="font-serif text-[2.7rem] leading-[1.02] tracking-tight text-bright sm:text-[4.4rem]"
          >
            Your financial life.
            <br />
            <span className="text-brass">Finally</span> in one place.
          </motion.h1>
          <motion.p
            variants={heroRise}
            className="mt-7 max-w-lg text-[1.02rem] leading-relaxed text-muted"
          >
            Import bank statements. Track accounts. Manage commitments. Monitor
            loans. All powered by a single reconciled financial ledger.
          </motion.p>
          <motion.div variants={heroRise} className="mt-9 flex flex-wrap items-center gap-3">
            <MajesticButton onClick={onRegister}>
              Open your account
              <ArrowRight size={16} />
            </MajesticButton>
            <MajesticButton variant="ghost" onClick={onEnterApp}>
              Take the tour
            </MajesticButton>
          </motion.div>
          {/* trust badges */}
          <motion.div
            variants={heroRise}
            className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-faint"
          >
            <span className="flex items-center gap-2"><ShieldCheck size={13} className="text-brass-deep" /> Bank-level security</span>
            <span className="flex items-center gap-2"><EyeOff size={13} className="text-brass-deep" /> 100% private</span>
            <span className="flex items-center gap-2"><HardDrive size={13} className="text-brass-deep" /> Local-first · no data leaves your device</span>
          </motion.div>
        </motion.div>

        {/* ---- floating product: offset right, depth, parallax ---- */}
        <motion.div
          style={{ y: shotY }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.3, ease: EASE, delay: 0.55 }}
          className="relative z-10 mx-auto mt-14 w-full max-w-5xl pb-8 sm:-mt-4 sm:ml-auto sm:mr-0 sm:mt-10 lg:max-w-[62%] lg:translate-x-[6%]"
        >
          {/* layered depth: a soft echo behind the screenshot */}
          <div
            aria-hidden
            className="absolute -inset-x-6 -top-6 bottom-10 rounded-panel"
            style={{ background: 'var(--em-glow-brass)', filter: 'blur(40px)' }}
          />
          <FloatingShot />
        </motion.div>
      </div>
    </section>
  );
}

/* The real dashboard, floating — a slow vertical bob gives it life + depth. */
function FloatingShot() {
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
      className="relative overflow-hidden rounded-panel border border-hairline-strong bg-surface"
      style={{ boxShadow: '0 60px 120px rgba(0,0,0,0.5), inset 0 0 0 1px var(--em-glow-brass)' }}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-loss/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-watch/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-gain/50" />
        <span className="ml-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-faint">
          Expense Machine · Dashboard
        </span>
      </div>
      <img
        src="/shots/shot-dashboard.png"
        alt="Expense Machine dashboard"
        loading="eager"
        className="block w-full"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(115deg, rgba(255,255,255,0.05) 0%, transparent 38%)' }}
      />
    </motion.div>
  );
}

export { scrollToId };
