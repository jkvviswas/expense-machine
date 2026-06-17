import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PartyPopper } from 'lucide-react';
import { useSettings } from '../../settings/store';
import { persist } from '../../../lib/persist';

const DISMISS_KEY = 'birthday-dismissed';

/** Today's date as MM-DD (for birthday match) and YYYY-MM-DD (for dismissal). */
function todayParts() {
  const d = new Date();
  const mmdd = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const iso = d.toISOString().slice(0, 10);
  return { mmdd, iso };
}

/**
 * A small, dismissible "Happy Birthday" card shown on the dashboard when the
 * current date matches the user's stored date of birth. Dismissal is recorded
 * for the current day only, so it reappears on the next login during the
 * birthday and disappears automatically the next day. Presentation-only — it
 * never touches the ledger or any financial logic.
 */
export function BirthdayBanner() {
  const s = useSettings();
  const { mmdd, iso } = todayParts();

  const isBirthday =
    !!s.dateOfBirth && s.dateOfBirth.length >= 10 && s.dateOfBirth.slice(5) === mmdd;

  const [dismissed, setDismissed] = useState(
    () => persist.read<string | null>(DISMISS_KEY, null) === iso,
  );

  if (!isBirthday || dismissed) return null;

  const firstName = (s.name || '').trim().split(' ')[0] || 'there';

  const dismiss = () => {
    persist.write(DISMISS_KEY, iso); // remember only for today
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 flex items-center gap-4 rounded-panel border border-brass-deep/40 bg-brass/[0.08] px-5 py-4"
      >
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-brass/15 text-brass">
          <PartyPopper size={20} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-serif text-[1.15rem] leading-tight text-bright">
            🎉 Happy Birthday, {firstName}!
          </p>
          <p className="mt-0.5 text-[0.84rem] text-muted">
            Wishing you a wonderful year ahead from everyone at Expense Machine.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss birthday message"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-bright"
        >
          <X size={16} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
