import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X } from 'lucide-react';
import { balanceLockStore } from '../../balance/lockStore';

/**
 * Premium 4-digit PIN modal for revealing the Current Balance. Replaces the old
 * inline textbox. Themed to match the dark-editorial luxury aesthetic: brass
 * accent, segmented PIN dots, focus-trapped overlay.
 */
export function BalanceUnlockModal({
  open,
  onClose,
  onUnlocked,
}: {
  open: boolean;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setPin('');
      setError(false);
      // Focus the hidden input so typing fills the segmented dots.
      const t = setTimeout(() => inputRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  useEffect(() => {
    if (pin.length === 4) {
      if (balanceLockStore.unlock(pin)) {
        onUnlocked();
        onClose();
      } else {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 420);
        setTimeout(() => { setPin(''); }, 150);
      }
    }
  }, [pin]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        style={{ background: 'rgba(10,8,4,0.72)', backdropFilter: 'blur(3px)' }}
      >
        <motion.div
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.97 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[340px] rounded-panel border border-brass-deep/30 bg-surface px-7 py-8 text-center"
          style={{ boxShadow: '0 24px 60px rgba(0,0,0,0.5), inset 0 0 0 1px var(--em-glow-brass)' }}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-control text-muted transition-colors hover:bg-elevated hover:text-bright"
          >
            <X size={16} />
          </button>

          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-brass-deep/40 bg-brass/[0.08] text-brass">
            <Lock size={20} strokeWidth={1.6} />
          </span>

          <h3 className="font-serif text-[1.25rem] leading-tight text-bright">Enter your PIN</h3>
          <p className="mt-1 text-[0.8rem] text-muted">
            Confirm your 4-digit PIN to reveal your balance.
          </p>

          <motion.div
            className="mt-6 flex items-center justify-center gap-3"
            animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
            transition={{ duration: 0.42 }}
            onClick={() => inputRef.current?.focus()}
          >
            {[0, 1, 2, 3].map((i) => {
              const filled = i < pin.length;
              return (
                <span
                  key={i}
                  className="flex h-12 w-11 items-center justify-center rounded-control border text-[1.3rem]"
                  style={{
                    borderColor: error
                      ? 'var(--em-loss)'
                      : filled
                      ? 'var(--em-brass)'
                      : 'var(--em-hairline)',
                    background: filled ? 'var(--em-elevated)' : 'var(--em-ground)',
                    color: 'var(--em-bright)',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  {filled ? '•' : ''}
                </span>
              );
            })}
          </motion.div>

          {error && <p className="mt-3 text-[0.78rem] text-loss">Incorrect PIN. Try again.</p>}

          {/* Hidden input captures the keystrokes / mobile numeric keypad. */}
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)); setError(false); }}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
            className="pointer-events-none absolute h-0 w-0 opacity-0"
            aria-label="4-digit PIN"
            autoComplete="off"
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
