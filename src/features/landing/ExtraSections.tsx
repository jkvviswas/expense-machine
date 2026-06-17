import { useRef } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Star } from 'lucide-react';

const EASE = [0.22, 1, 0.36, 1] as const;
const rise: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 1.1, ease: EASE } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.16, delayChildren: 0.06 } },
};
const eyebrow = 'font-mono text-[0.64rem] uppercase tracking-[0.22em] text-brass';

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
  return (
    <motion.div ref={ref} variants={variants} initial="hidden" animate={inView ? 'show' : 'hidden'} className={className}>
      {children}
    </motion.div>
  );
}

/* ---------------- USER REVIEWS ---------------- */
const REVIEWS = [
  {
    quote:
      'For the first time I can see every account, loan and bill in one number. The statement import reconciled to the rupee on the first try.',
    name: 'Aarav Mehta',
    role: 'Founder, design studio',
  },
  {
    quote:
      'It feels less like an expense app and more like a private banking dashboard. The opening-balance reconciliation alone replaced my spreadsheet.',
    name: 'Priya Nair',
    role: 'Independent consultant',
  },
  {
    quote:
      'Calm, fast, and honest about the numbers. The current balance is finally one figure I trust instead of five tabs that disagree.',
    name: 'Rohan Iyer',
    role: 'Freelance engineer',
  },
];

export function Reviews() {
  return (
    <section id="reviews" className="border-t border-hairline py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className={`${eyebrow} mb-5`}>What people say</div>
          <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
            Trusted to hold the whole picture.
          </h2>
        </Reveal>
        <Reveal variants={stagger} className="mt-14 grid gap-4 md:grid-cols-3">
          {REVIEWS.map((r) => (
            <motion.figure
              key={r.name}
              variants={rise}
              className="flex flex-col justify-between rounded-panel border border-hairline bg-surface p-6"
            >
              <div>
                <div className="mb-4 flex gap-0.5 text-brass">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={13} fill="currentColor" strokeWidth={0} />
                  ))}
                </div>
                <blockquote className="text-[0.92rem] leading-relaxed text-soft">“{r.quote}”</blockquote>
              </div>
              <figcaption className="mt-6 border-t border-hairline pt-4">
                <div className="text-[0.9rem] text-bright">{r.name}</div>
                <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-faint">{r.role}</div>
              </figcaption>
            </motion.figure>
          ))}
        </Reveal>
      </div>
    </section>
  );
}

/* ---------------- TERMS ---------------- */
const TERMS = [
  ['Your data stays yours', 'Everything lives in your browser, on your device. There is no account server holding your ledger, balances, or PIN.'],
  ['Reconciliation, not guesswork', 'Balances are derived from a single ledger. A statement and a screen can never quietly disagree.'],
  ['No selling, no sharing', 'Your financial data is never sold, never shared, and never used to train anything.'],
  ['You can leave anytime', 'Export or clear your data whenever you like. Nothing holds your information hostage.'],
];

export function Terms() {
  return (
    <section id="terms" className="border-t border-hairline py-24">
      <div className="mx-auto max-w-content px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <div className={`${eyebrow} mb-5`}>Terms & privacy</div>
          <h2 className="font-serif text-[2rem] leading-tight text-bright sm:text-[2.6rem]">
            The principles, in plain words.
          </h2>
        </Reveal>
        <Reveal variants={stagger} className="mt-14 grid gap-4 sm:grid-cols-2">
          {TERMS.map(([t, d]) => (
            <motion.div
              key={t}
              variants={rise}
              className="rounded-panel border border-hairline bg-surface p-6"
            >
              <h3 className="font-serif text-[1.15rem] text-bright">{t}</h3>
              <p className="mt-2 text-[0.88rem] leading-relaxed text-muted">{d}</p>
            </motion.div>
          ))}
        </Reveal>
        <Reveal className="mt-8 text-center">
          <p className="text-[0.8rem] text-faint">
            Expense Machine is a personal tool, not a bank or financial advisor. Use it to understand your own money.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
