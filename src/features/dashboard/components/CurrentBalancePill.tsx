import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, Lock } from 'lucide-react';
import { formatMoneyFull } from '../../import/format';
import { useBalanceLock } from '../../balance/lockStore';
import { BalanceUnlockModal } from './BalanceUnlockModal';

/**
 * Compact Current Balance pill, anchored beneath the Net This Month hero ring.
 * Premium and understated — not a full-width card. When Balance Lock is on, the
 * figure is masked and "View" opens a premium PIN modal. Only this number is
 * gated; the rest of the app is never locked.
 */
export function CurrentBalancePill({ balance }: { balance: number }) {
  const { locked } = useBalanceLock();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={locked ? 'locked' : 'open'}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-3 rounded-full border border-brass-deep/30 bg-elevated px-5 py-2"
          style={{ boxShadow: 'inset 0 0 0 1px var(--em-glow-brass)' }}
        >
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
            Balance
          </span>
          <span aria-hidden className="h-1 w-1 rounded-full bg-brass" />
          {locked ? (
            <>
              <span className="flex items-center gap-1.5 font-num text-[0.95rem] tracking-[0.14em] text-bright">
                <Lock size={12} strokeWidth={1.9} className="text-faint" />
                ••••••
              </span>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="ml-1 flex items-center gap-1 text-[0.7rem] text-brass transition-colors hover:text-brass-bright"
              >
                <Eye size={12} strokeWidth={1.9} /> View balance
              </button>
            </>
          ) : (
            <span className="font-num text-[0.98rem] text-bright">{formatMoneyFull(balance)}</span>
          )}
        </motion.div>
      </AnimatePresence>

      <BalanceUnlockModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onUnlocked={() => setModalOpen(false)}
      />
    </>
  );
}
