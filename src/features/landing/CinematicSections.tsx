import { useRef, useState, useEffect } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  type Variants,
  type MotionValue,
} from 'framer-motion';
import { FileText, Wallet, CalendarClock, LineChart } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;

const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE } },
};

const eyebrow = 'font-mono text-[0.64rem] uppercase tracking-[0.22em] text-brass';

/* A framed product screenshot with a soft brass rim + window chrome. */
function ScreenFrame({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-panel border border-hairline-strong bg-surface ${className ?? ''}`}
      style={{ boxShadow: '0 40px 90px rgba(0,0,0,0.5), inset 0 0 0 1px var(--em-glow-brass)' }}
    >
      <div className="flex items-center gap-2 border-b border-hairline px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-loss/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-watch/50" />
        <span className="h-2.5 w-2.5 rounded-full bg-gain/50" />
      </div>
      <img src={src} alt={alt} loading="lazy" className="block w-full" />
    </div>
  );
}

/* ============================================================
   STICKY SCROLL STORYTELLING
   Left column pins; the right product panel cross-fades through
   screens as the matching feature highlights. The signature move.
   ============================================================ */
const STORY = [
  {
    icon: FileText,
    title: 'Import',
    line: 'Drop in a PDF, CSV or XLSX statement.',
    body: 'Every row is parsed, categorized, de-duplicated against your ledger, and reconciled to the closing balance.',
    src: '/shots/shot-import.png',
  },
  {
    icon: Wallet,
    title: 'Accounts',
    line: 'Watch balances roll forward on their own.',
    body: 'Opening balances live on the account. Current balance is always opening plus the net of its ledger — never double counted.',
    src: '/shots/shot-accounts.png',
  },
  {
    icon: CalendarClock,
    title: 'Transactions',
    line: 'One ledger holds the whole picture.',
    body: 'Inflow, outflow, net flow and current balance read together, so a statement and a screen can never disagree.',
    src: '/shots/shot-transactions.png',
  },
  {
    icon: LineChart,
    title: 'Analytics',
    line: 'See where the money actually goes.',
    body: 'Month-over-month flows, category shifts and forecasts — derived from the same numbers you already trust.',
    src: '/shots/shot-analytics.png',
  },
];

export function StickyStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });
  const [active, setActive] = useState(0);

  useEffect(() => {
    return scrollYProgress.on('change', (v) => {
      // Map scroll progress (0–1) across the panels with light easing at ends.
      const idx = Math.min(STORY.length - 1, Math.floor(v * STORY.length * 0.999));
      setActive(idx);
    });
  }, [scrollYProgress]);

  return (
    <section className="border-t border-hairline">
      <div ref={ref} className="relative" style={{ height: `${STORY.length * 80}vh` }}>
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="mx-auto grid w-full max-w-content grid-cols-1 gap-12 px-6 lg:grid-cols-2 lg:gap-16">
            {/* Left — pinned narrative */}
            <div className="flex flex-col justify-center">
              <div className={`${eyebrow} mb-5`}>Everything, in one place</div>
              <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.7rem]">
                Your whole financial
                <br />
                life, on one ledger.
              </h2>
              <div className="mt-10 flex flex-col gap-1.5">
                {STORY.map((s, i) => {
                  const on = i === active;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => {
                        const el = ref.current;
                        if (!el) return;
                        const top = el.offsetTop + (el.offsetHeight - window.innerHeight) * (i / STORY.length) + 8;
                        window.scrollTo({ top, behavior: 'smooth' });
                      }}
                      className="group relative flex items-start gap-4 rounded-control px-4 py-3.5 text-left transition-colors"
                      style={{ background: on ? 'var(--em-surface)' : 'transparent' }}
                    >
                      {/* active rail */}
                      <span
                        className="absolute left-0 top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-full transition-opacity duration-500"
                        style={{ background: 'var(--em-brass)', opacity: on ? 1 : 0 }}
                      />
                      <span
                        className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-control border transition-colors duration-500"
                        style={{
                          borderColor: on ? 'var(--em-brass-deep)' : 'var(--em-hairline)',
                          background: on ? 'var(--em-glow-brass)' : 'transparent',
                          color: on ? 'var(--em-brass)' : 'var(--em-faint)',
                        }}
                      >
                        <Icon size={17} strokeWidth={1.7} />
                      </span>
                      <div>
                        <div
                          className="text-[1rem] transition-colors duration-500"
                          style={{ color: on ? 'var(--em-bright)' : 'var(--em-muted)' }}
                        >
                          {s.line}
                        </div>
                        <motion.div
                          initial={false}
                          animate={{ height: on ? 'auto' : 0, opacity: on ? 1 : 0 }}
                          transition={{ duration: 0.4, ease: EASE }}
                          className="overflow-hidden"
                        >
                          <p className="pt-1.5 text-[0.86rem] leading-relaxed text-muted">{s.body}</p>
                        </motion.div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right — cross-fading product panel */}
            <div className="relative flex items-center">
              <div className="relative aspect-[1340/920] w-full">
                {STORY.map((s, i) => (
                  <motion.div
                    key={s.title}
                    className="absolute inset-0"
                    initial={false}
                    animate={{
                      opacity: i === active ? 1 : 0,
                      scale: i === active ? 1 : 0.985,
                      y: i === active ? 0 : 10,
                    }}
                    transition={{ duration: 0.9, ease: EASE }}
                    style={{ pointerEvents: i === active ? 'auto' : 'none' }}
                  >
                    <ScreenFrame src={s.src} alt={`${s.title} screen`} />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   BEFORE vs AFTER
   ============================================================ */
function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  return (
    <motion.div
      ref={ref}
      variants={rise}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function BeforeAfter() {
  return (
    <section className="border-t border-hairline py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className={`${eyebrow} mb-5`}>Before / after</div>
          <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
            From scattered to settled.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-panel border border-hairline bg-surface p-7">
              <div className="mb-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-faint">
                Before — five tabs, no answer
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  'Bank app for one account',
                  'A spreadsheet for the rest',
                  'Screenshots of EMIs and bills',
                  'No idea what’s actually left',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[0.92rem] text-muted">
                    <span className="h-1.5 w-1.5 flex-none rounded-full bg-hairline-strong" />
                    <span className="line-through decoration-faint/50">{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal>
            <div
              className="h-full rounded-panel border border-brass-deep bg-surface p-7"
              style={{ boxShadow: 'inset 0 0 0 1px var(--em-glow-brass)' }}
            >
              <div className="mb-5 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-brass">
                After — one reconciled ledger
              </div>
              <ul className="flex flex-col gap-3">
                {[
                  'Every account in a single balance',
                  'Statements imported and reconciled',
                  'Commitments and loans tracked to payoff',
                  'Exactly what’s left, at a glance',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-[0.92rem] text-soft">
                    <span
                      className="flex h-4 w-4 flex-none items-center justify-center rounded-full text-brass"
                      style={{ background: 'color-mix(in srgb, var(--em-brass) 15%, transparent)' }}
                    >
                      <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M1.5 5.2 4 7.5 8.5 2.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   PRODUCT WALKTHROUGH — alternating real screenshots + parallax
   ============================================================ */
const WALK = [
  {
    eyebrow: 'Reconciliation',
    title: 'Import a statement, balance to the rupee.',
    body: 'Upload the PDF your bank gives you. Expense Machine extracts every line, sets the opening balance on the account, and confirms it reconciles to the printed closing balance.',
    src: '/shots/shot-import.png',
  },
  {
    eyebrow: 'Accounts',
    title: 'Every account, one honest total.',
    body: 'Savings, current, credit cards, wallets — each carries its own opening balance, and your current balance is computed from a single source of truth.',
    src: '/shots/shot-accounts.png',
  },
  {
    eyebrow: 'Reports',
    title: 'Cash flow, derived — never duplicated.',
    body: 'Money in, money out and net are read straight from the ledger, so the report can never drift from the transactions behind it.',
    src: '/shots/shot-reports.png',
  },
];

function WalkRow({
  item,
  flip,
}: {
  item: (typeof WALK)[number];
  flip: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], [40, -40]) as MotionValue<number>;
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });

  return (
    <div ref={ref} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
      <motion.div
        variants={rise}
        initial="hidden"
        animate={inView ? 'show' : 'hidden'}
        className={flip ? 'lg:order-2' : ''}
      >
        <div className={`${eyebrow} mb-4`}>{item.eyebrow}</div>
        <h3 className="font-serif text-[1.7rem] leading-tight text-bright sm:text-[2.1rem]">
          {item.title}
        </h3>
        <p className="mt-4 max-w-md text-[0.95rem] leading-relaxed text-muted">{item.body}</p>
      </motion.div>
      <motion.div style={{ y }} className={flip ? 'lg:order-1' : ''}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, ease: EASE }}
        >
          <ScreenFrame src={item.src} alt={item.title} />
        </motion.div>
      </motion.div>
    </div>
  );
}

export function Walkthrough() {
  return (
    <section className="border-t border-hairline py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal className="mx-auto mb-16 max-w-2xl text-center">
          <div className={`${eyebrow} mb-5`}>A closer look</div>
          <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
            See it work, screen by screen.
          </h2>
        </Reveal>
        <div className="flex flex-col gap-24">
          {WALK.map((item, i) => (
            <WalkRow key={item.title} item={item} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

export { ScreenFrame };
