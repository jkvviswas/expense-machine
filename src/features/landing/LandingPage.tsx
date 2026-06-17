import { useRef } from 'react';
import {
  motion,
  useInView,
  useMotionValue,
  animate,
  type Variants,
} from 'framer-motion';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  FileText,
  Wallet,
  CalendarClock,
  Landmark,
  LineChart,
  ChevronDown,
} from 'lucide-react';
import { BrandMark } from '../../components/primitives/BrandMark';
import { BeforeAfter, Walkthrough, ScreenFrame } from './CinematicSections';
import { EverythingVideo } from './EverythingVideo';
import { LaptopHero } from './LaptopHero';
import { PortalTransition } from './PortalTransition';
import { MajesticButton, scrollToId } from './MajesticButton';
import { Reviews, Terms } from './ExtraSections';
import { ThemeToggle } from './ThemeToggle';

const EASE = [0.22, 1, 0.36, 1] as const;

/* Shared reveal: gentle fade + rise, no bounce, no scale gimmicks. */
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.06 } },
};

/* A section that reveals its children once, on first scroll into view.
   Falls back to visible if motion is reduced or IO never fires. */
function Reveal({
  children,
  className,
  variants = rise,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = usePrefersReducedMotion();
  const show = inView || reduce;
  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial={reduce ? 'show' : 'hidden'}
      animate={show ? 'show' : 'hidden'}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* Respect the OS reduced-motion setting. */
function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduce(mq.matches);
    const on = () => setReduce(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduce;
}

/* Count-up that runs once when scrolled into view. */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20% 0px' });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState('0');
  useEffect(() => {
    if (!inView) return;
    const controls = animate(mv, to, {
      duration: 2,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v).toLocaleString('en-IN')),
    });
    return controls.stop;
  }, [inView, to, mv]);
  return (
    <span ref={ref} className="font-num">
      {display}
      {suffix}
    </span>
  );
}

const eyebrow =
  'font-mono text-[0.64rem] uppercase tracking-[0.22em] text-brass';

export function LandingPage() {
  // Portal transition state: when set, the cinematic overlay plays then navigates.
  const [portalTo, setPortalTo] = useState<string | null>(null);
  const launch = (to: string) => setPortalTo(to);

  return (
    <div className="em-grain em-theme-tween relative min-h-screen bg-ground text-bright" style={{ overflowX: 'clip' }}>
      <PortalTransition
        open={portalTo !== null}
        to={portalTo ?? '/login'}
        onCancel={() => setPortalTo(null)}
      />
      {/* ---------------- NAV ---------------- */}
      <header
        className="sticky top-0 z-40 border-b border-hairline backdrop-blur-md"
        style={{ background: 'color-mix(in srgb, var(--em-ground) 82%, transparent)' }}
      >
        <div className="relative flex h-[68px] w-full items-center justify-between px-6 sm:px-10">
          {/* far left — brand (glyph only on small screens to save room) */}
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to top"
            className="flex-none"
          >
            <span className="sm:hidden"><BrandMark glyphOnly size={28} /></span>
            <span className="hidden sm:block"><BrandMark size={30} /></span>
          </button>

          {/* center — section links (absolutely centered, never shifts the extremes) */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-7 md:flex">
            {[
              ['Solution', 'solution'],
              ['Features', 'features'],
              ['Reviews', 'reviews'],
              ['Terms', 'terms'],
              ['FAQ', 'faq'],
            ].map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollToId(id)}
                className="text-[0.86rem] text-muted transition-colors hover:text-bright"
              >
                {label}
              </button>
            ))}
          </nav>

          {/* far right — theme, sign in, register */}
          <div className="flex flex-none items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => launch('/login')}
              className="rounded-control border border-hairline px-4 py-2 text-[0.82rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => launch('/login')}
              className="rounded-control bg-brass px-4 py-2 text-[0.82rem] font-medium text-void transition-colors hover:bg-brass-bright"
            >
              Register
            </button>
          </div>
        </div>
      </header>

      {/* ---------------- LAPTOP HERO (scroll-opens, dives into story) ---------------- */}
      <LaptopHero
        onEnterApp={() => scrollToId('story-start')}
        onRegister={() => launch('/login')}
      />

      {/* anchor for "Take the tour" */}
      <div id="story-start" />

      {/* ---------------- EVERYTHING IN ONE PLACE (video reel) ---------------- */}
      <EverythingVideo />


      {/* ---------------- PROBLEM ---------------- */}
      <section className="border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className={`${eyebrow} mb-5`}>The problem</div>
            <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
              Modern finance is fragmented.
            </h2>
          </Reveal>
          <Reveal variants={stagger} className="mt-14 grid gap-4 sm:grid-cols-3">
            {[
              ['Bank apps', 'show one account at a time — never the whole picture.'],
              ['Spreadsheets', 'show numbers, but not what they mean together.'],
              ['Expense trackers', 'show categories, yet miss balances and debt.'],
            ].map(([t, d]) => (
              <motion.div
                key={t}
                variants={rise}
                className="rounded-panel border border-hairline bg-surface p-6 text-left"
              >
                <div className="font-serif text-[1.15rem] text-bright">{t}</div>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-muted">{d}</p>
              </motion.div>
            ))}
          </Reveal>
          <Reveal className="mt-10 text-center">
            <p className="text-[1rem] text-soft">
              Nothing shows the complete picture.{' '}
              <span className="text-brass">Until now.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* ---------------- BEFORE / AFTER ---------------- */}
      <BeforeAfter />

      {/* ---------------- SOLUTION ---------------- */}
      <section id="solution" className="border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className={`${eyebrow} mb-5`}>The solution</div>
            <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
              One ledger.
              <br />
              Everything connected.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[0.95rem] leading-relaxed text-muted">
              Every part of Expense Machine reads from a single source of truth —
              so a balance, a budget, and a loan can never disagree.
            </p>
          </Reveal>
          <Reveal variants={stagger} className="mx-auto mt-14 max-w-md">
            {[
              ['Transactions', 'The ledger — every credit and debit, reconciled.'],
              ['Accounts', 'Opening balances roll forward automatically.'],
              ['Loans', 'Liabilities tracked to payoff.'],
              ['Commitments', 'Bills, EMIs and subscriptions, never missed.'],
              ['Reports', 'Cash flow, derived — not duplicated.'],
              ['Analytics', 'Insight from the same numbers you trust.'],
            ].map(([t, d], i, arr) => (
              <motion.div key={t} variants={rise} className="relative">
                <div className="flex items-start gap-4 rounded-panel border border-hairline bg-surface px-5 py-4">
                  <span className="mt-0.5 font-mono text-[0.7rem] text-brass">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <div className="text-[0.98rem] text-bright">{t}</div>
                    <div className="text-[0.84rem] text-muted">{d}</div>
                  </div>
                </div>
                {i < arr.length - 1 && (
                  <div
                    className="mx-auto h-5 w-px"
                    style={{ background: 'linear-gradient(to bottom, color-mix(in srgb, var(--em-brass-deep) 50%, transparent), transparent)' }}
                  />
                )}
              </motion.div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- FEATURES ---------------- */}
      <section id="features" className="border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className={`${eyebrow} mb-5`}>What's inside</div>
            <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
              Built like a financial instrument.
            </h2>
          </Reveal>
          <Reveal
            variants={stagger}
            className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {([
              [FileText, 'Smart statement import', 'Upload a PDF, CSV or XLSX. Expense Machine extracts every transaction, categorizes spending, and reconciles to your closing balance.'],
              [Wallet, 'Account intelligence', 'See your money across every account, with opening balances that roll forward on their own.'],
              [CalendarClock, 'Commitment tracking', 'Bills, EMIs and subscriptions in one view — each marked paid straight to the ledger.'],
              [Landmark, 'Loan management', 'Track outstanding balances and watch the principal fall toward payoff.'],
              [LineChart, 'Analytics', 'Month-over-month flows, category shifts and forecasts — clarity, not clutter.'],
              [Wallet, 'Balance privacy', 'A PIN-locked Current Balance keeps your position private at a glance.'],
            ] as [typeof FileText, string, string][]).map(([Icon, title, body], i) => (
              <motion.div
                key={i}
                variants={rise}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.3, ease: EASE }}
                className="group rounded-panel border border-hairline bg-surface p-6 transition-colors hover:border-brass-deep"
              >
                <span
                  className="mb-4 flex h-11 w-11 items-center justify-center rounded-control border border-brass-deep text-brass transition-colors"
                  style={{ background: 'color-mix(in srgb, var(--em-brass) 9%, transparent)' }}
                >
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <h3 className="font-serif text-[1.2rem] text-bright">{title}</h3>
                <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{body}</p>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- PRODUCT WALKTHROUGH ---------------- */}
      <Walkthrough />

      {/* ---------------- DASHBOARD SHOWCASE ---------------- */}
      <section id="dashboard" className="border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className={`${eyebrow} mb-5`}>The dashboard</div>
            <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
              Your position, at a glance.
            </h2>
            <p className="mx-auto mt-5 max-w-lg text-[0.95rem] leading-relaxed text-muted">
              Current balance, net for the month, upcoming commitments — composed
              into one calm, considered view.
            </p>
          </Reveal>
          <Reveal className="mt-14">
            <div className="mx-auto max-w-5xl">
              <ScreenFrame src="/shots/shot-dashboard.png" alt="Expense Machine dashboard" />
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CLARITY ---------------- */}
      <section className="border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <Reveal className="mx-auto max-w-2xl text-center">
            <div className={`${eyebrow} mb-5`}>Built for clarity</div>
            <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
              For people who want clarity, not clutter.
            </h2>
          </Reveal>
          <Reveal variants={stagger} className="mt-12 grid gap-4 sm:grid-cols-3">
            {[
              'Every balance explained.',
              'Every transaction accounted for.',
              'Every commitment visible.',
            ].map((t) => (
              <motion.div
                key={t}
                variants={rise}
                className="rounded-panel border border-hairline bg-surface px-6 py-8 text-center"
              >
                <p className="font-serif text-[1.15rem] leading-snug text-soft">{t}</p>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- TRUST METRICS ---------------- */}
      <section className="border-t border-hairline py-24">
        <div className="mx-auto max-w-content px-6">
          <Reveal
            variants={stagger}
            className="grid gap-y-12 text-center sm:grid-cols-4"
          >
            {[
              [284503, '', 'Transactions processed'],
              [1240, '', 'Accounts managed'],
              [9870, '', 'Statements imported'],
              [42100, '', 'Commitments tracked'],
            ].map(([n, suffix, label]) => (
              <motion.div key={label as string} variants={rise}>
                <div className="font-num text-[2.4rem] text-brass">
                  <CountUp to={n as number} suffix={suffix as string} />
                </div>
                <div className="mt-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-faint">
                  {label as string}
                </div>
              </motion.div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- FAQ ---------------- */}
      <section id="faq" className="border-t border-hairline py-24">
        <div className="mx-auto max-w-2xl px-6">
          <Reveal className="text-center">
            <div className={`${eyebrow} mb-5`}>Questions</div>
            <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
              Good to know.
            </h2>
          </Reveal>
          <Reveal variants={stagger} className="mt-12 flex flex-col gap-3">
            {[
              ['How does statement import work?', 'Upload a PDF, CSV or XLSX bank statement. Expense Machine parses each row, categorizes it, detects duplicates against your existing ledger, and reconciles the opening and closing balances — then commits everything to a real account.'],
              ['How is my data stored?', 'Everything stays on your device, in your browser. Your ledger, accounts and PIN never leave your machine — there is no account server holding your financial life.'],
              ['Can I manage loans?', 'Yes. Track each loan’s outstanding balance, link its EMI as a commitment, and watch the principal fall as payments post to the ledger.'],
              ['Can I track multiple accounts?', 'Add as many accounts as you like — savings, current, credit cards, wallets. Each carries its own opening balance, and your total reconciles automatically.'],
            ].map(([q, a]) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------- USER REVIEWS ---------------- */}
      <Reviews />

      {/* ---------------- TERMS & PRIVACY ---------------- */}
      <Terms />

      {/* ---------------- FINAL CTA (sign in / register target) ---------------- */}
      <section id="get-started" className="relative overflow-hidden border-t border-hairline py-32">
        {/* Layered ambient glow — two slow, offset radial fields. */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[760px] -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ background: 'radial-gradient(circle, var(--em-glow-focal) 0%, transparent 66%)' }}
          animate={{ opacity: [0.6, 1, 0.6], scale: [1, 1.06, 1] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-[60%] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--em-glow-brass) 0%, transparent 70%)' }}
        />
        <Reveal className="relative mx-auto max-w-2xl px-6 text-center">
          <div className="mb-8 flex justify-center">
            <BrandMark glyphOnly size={44} />
          </div>
          <h2 className="font-serif text-[2.4rem] leading-[1.08] tracking-tight text-bright sm:text-[3.2rem]">
            Take control of your
            <br />
            <span className="text-brass">financial system.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[0.96rem] leading-relaxed text-muted">
            One ledger for everything you earn, owe, owe to others, and keep.
            Private by default, reconciled by design.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <MajesticButton onClick={() => launch('/login')}>
              Open your account
              <ArrowRight size={17} />
            </MajesticButton>
            <MajesticButton variant="ghost" onClick={() => launch('/login')}>
              Sign in
            </MajesticButton>
          </div>
        </Reveal>
      </section>

      {/* ---------------- FOOTER ---------------- */}
      <footer className="border-t border-hairline py-12">
        <Reveal className="mx-auto flex max-w-content flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <BrandMark size={26} />
          <div className="flex items-center gap-6">
            <button type="button" onClick={() => scrollToId('reviews')} className="text-[0.78rem] text-muted transition-colors hover:text-bright">Reviews</button>
            <button type="button" onClick={() => scrollToId('terms')} className="text-[0.78rem] text-muted transition-colors hover:text-bright">Terms</button>
            <button type="button" onClick={() => launch('/login')} className="text-[0.82rem] text-brass transition-colors hover:text-brass-bright">Sign in →</button>
          </div>
        </Reveal>
      </footer>
    </div>
  );
}

/* ---------------- FAQ accordion item ---------------- */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      variants={rise}
      className="overflow-hidden rounded-panel border border-hairline bg-surface"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[0.96rem] text-bright">{q}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          className="flex-none text-brass"
        >
          <ChevronDown size={17} />
        </motion.span>
      </button>
      <motion.div
        initial={false}
        animate={{ height: open ? 'auto' : 0, opacity: open ? 1 : 0 }}
        transition={{ duration: 0.34, ease: EASE }}
        className="overflow-hidden"
      >
        <p className="px-5 pb-5 text-[0.88rem] leading-relaxed text-muted">{a}</p>
      </motion.div>
    </motion.div>
  );
}
