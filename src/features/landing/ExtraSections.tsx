import { useRef, useState, useEffect } from 'react';
import { motion, useInView, type Variants } from 'framer-motion';
import { Star, Send } from 'lucide-react';
import {
  fetchApprovedReviews,
  submitReview,
  reviewsConfigured,
  type PublicReview,
} from '../backend/reviewsBridge';
import { useAuth } from '../auth/store';

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

type DisplayReview = { id: string; quote: string; name: string; role: string; rating: number };

const FALLBACK: DisplayReview[] = REVIEWS.map((r, i) => ({
  id: `seed-${i}`,
  quote: r.quote,
  name: r.name,
  role: r.role,
  rating: 5,
}));

export function Reviews() {
  const { user } = useAuth();
  const [items, setItems] = useState<DisplayReview[]>(FALLBACK);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!reviewsConfigured()) return;
    let active = true;
    fetchApprovedReviews(12).then((rows: PublicReview[]) => {
      if (!active || rows.length === 0) return;
      setItems(
        rows.map((r) => ({ id: r.id, quote: r.comment, name: r.name, role: r.role, rating: r.rating })),
      );
    });
    return () => { active = false; };
  }, []);

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
          {items.map((r) => (
            <motion.figure
              key={r.id}
              variants={rise}
              className="flex flex-col justify-between rounded-panel border border-hairline bg-surface p-6"
            >
              <div>
                <div className="mb-4 flex gap-0.5 text-brass">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={13}
                      fill={i < r.rating ? 'currentColor' : 'none'}
                      strokeWidth={i < r.rating ? 0 : 1.5}
                      className={i < r.rating ? '' : 'text-hairline-strong'}
                    />
                  ))}
                </div>
                <blockquote className="text-[0.92rem] leading-relaxed text-soft">“{r.quote}”</blockquote>
              </div>
              <figcaption className="mt-6 border-t border-hairline pt-4">
                <div className="text-[0.9rem] text-bright">{r.name}</div>
                {r.role && (
                  <div className="font-mono text-[0.68rem] uppercase tracking-[0.1em] text-faint">{r.role}</div>
                )}
              </figcaption>
            </motion.figure>
          ))}
        </Reveal>

        {/* Leave a review (signed-in users only; appears after moderation) */}
        {reviewsConfigured() && (
          <div className="mt-10 flex flex-col items-center">
            {user ? (
              showForm ? (
                <ReviewForm
                  defaultName={user.name}
                  onClose={() => setShowForm(false)}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForm(true)}
                  className="rounded-control border border-hairline bg-surface px-5 py-2.5 text-[0.86rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
                >
                  Leave a review
                </button>
              )
            ) : (
              <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">
                Sign in to leave a review
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function ReviewForm({ defaultName, onClose }: { defaultName: string; onClose: () => void }) {
  const [name, setName] = useState(defaultName);
  const [role, setRole] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = () => {
    setErr(null);
    if (comment.trim().length < 8) {
      setErr('Please write a little more.');
      return;
    }
    setBusy(true);
    submitReview({ name, role, rating, comment }).then((res) => {
      setBusy(false);
      if (res.configured && res.ok) setDone(true);
      else if (res.configured) setErr(res.message);
      else setErr('Reviews are not available right now.');
    });
  };

  if (done) {
    return (
      <div className="w-full max-w-lg rounded-panel border border-hairline bg-surface p-6 text-center">
        <p className="mb-1 font-medium text-bright">Thank you</p>
        <p className="text-[0.88rem] text-muted">
          Your review was submitted and will appear once approved.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 rounded-control border border-hairline px-4 py-2 text-[0.84rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg rounded-panel border border-hairline bg-surface p-6">
      <p className="mb-4 font-medium text-bright">Leave a review</p>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-10 rounded-control border border-hairline bg-ground px-3 text-[0.88rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
          />
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="Role (optional)"
            className="h-10 rounded-control border border-hairline bg-ground px-3 text-[0.88rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
          />
        </div>
        {/* star picker */}
        <div className="flex items-center gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <button key={i} type="button" onClick={() => setRating(i + 1)} aria-label={`${i + 1} stars`}>
              <Star
                size={20}
                className={i < rating ? 'text-brass' : 'text-hairline-strong'}
                fill={i < rating ? 'currentColor' : 'none'}
                strokeWidth={i < rating ? 0 : 1.5}
              />
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="What do you think of Expense Machine?"
          rows={3}
          className="resize-none rounded-control border border-hairline bg-ground px-3 py-2 text-[0.88rem] text-bright placeholder:text-faint focus:border-brass focus:outline-none"
        />
        {err && <p className="text-[0.82rem] text-loss">{err}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-control px-4 py-2 text-[0.84rem] text-muted transition-colors hover:text-bright"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="flex items-center gap-2 rounded-control bg-brass px-4 py-2 text-[0.84rem] font-medium text-void transition-colors hover:bg-brass-bright disabled:opacity-60"
          >
            {busy ? 'Submitting…' : 'Submit'}
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
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
