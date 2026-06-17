import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check, Sun, Moon, Monitor, Sparkles, Upload, Database } from 'lucide-react';
import { BrandMark } from '../../components/primitives/BrandMark';
import { onboardingStore } from './store';
import { transactionsStore } from '../transactions/store';
import { clientsStore } from '../clients/store';
import { setThemeMode } from '../theme/ThemeProvider';
import { useThemeMode, type ThemeMode } from '../theme/store';
import { EASE } from '../motion/primitives';
import { SpringButton } from '../motion/components';

/**
 * First-launch onboarding. Three quick steps — welcome, appearance, and a
 * clean-vs-sample data choice — then a success transition into the dashboard.
 * Completing it sets the onboarding flag so the clean slate persists. No locked
 * file or calculation is touched; the data choice only decides whether the
 * locked seed is loaded into the working ledger.
 */

const STEPS = ['Welcome', 'Appearance', 'Your data'] as const;

export function OnboardingFlow() {
  const navigate = useNavigate();
  const themeMode = useThemeMode();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  const finish = async (withSample: boolean) => {
    setFinishing(true);
    if (withSample) {
      onboardingStore.complete(true);
      clientsStore.reset();
      await transactionsStore.resetToSeed();
    } else {
      onboardingStore.complete(false);
      clientsStore.clearAll();
      transactionsStore.replaceAll([]);
    }
    // Brief success beat, then into the dashboard.
    setTimeout(() => navigate('/', { replace: true }), 900);
  };

  return (
    <div className="em-halo relative flex min-h-screen items-center justify-center overflow-hidden bg-ground px-5 py-12">
      <AmbientField />
      <div className="relative w-full max-w-lg">
        {/* progress */}
        <div className="mb-9 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full border font-mono text-[0.6rem] transition-colors duration-500',
                  i < step
                    ? 'border-brass bg-brass text-void'
                    : i === step
                      ? 'border-brass text-brass'
                      : 'border-hairline text-faint',
                ].join(' ')}
              >
                {i < step ? <Check size={12} strokeWidth={2.5} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={['h-px w-8 transition-colors duration-500', i < step ? 'bg-brass' : 'bg-hairline'].join(' ')} />
              )}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {finishing ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: EASE }}
              className="flex flex-col items-center text-center"
            >
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 18, delay: 0.1 }}
                className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-brass text-void"
              >
                <Check size={28} strokeWidth={2.5} />
              </motion.div>
              <h2 className="font-serif text-[2rem] text-bright">You're all set</h2>
              <p className="mt-2 text-[0.92rem] text-muted">Taking you to your command center…</p>
            </motion.div>
          ) : (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              {step === 0 && <WelcomeStep onNext={next} />}
              {step === 1 && <AppearanceStep mode={themeMode} onPick={setThemeMode} onNext={next} />}
              {step === 2 && <DataStep onFinish={finish} />}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="mb-6 flex justify-center">
        <BrandMark glyphOnly size={52} />
      </div>
      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">Welcome</p>
      <h1 className="font-serif text-[2.4rem] leading-tight text-bright">A calm place for your money</h1>
      <p className="mx-auto mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
        Expense Machine turns statements into clarity — one forward-looking
        number, honest budgets, and reports you can hand over. Let's set it up.
      </p>
      <SpringButton
        onClick={onNext}
        className="em-press mt-8 inline-flex items-center gap-2.5 rounded-control bg-brass px-6 py-3 text-[0.9rem] font-medium text-void transition-colors hover:bg-brass-bright"
      >
        Get started <ArrowRight size={16} strokeWidth={2} />
      </SpringButton>
    </div>
  );
}

function AppearanceStep({
  mode,
  onPick,
  onNext,
}: {
  mode: ThemeMode;
  onPick: (m: ThemeMode) => void;
  onNext: () => void;
}) {
  const options: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Monitor },
  ];
  return (
    <div className="text-center">
      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">Appearance</p>
      <h1 className="font-serif text-[2.1rem] leading-tight text-bright">Choose your look</h1>
      <p className="mx-auto mt-2 max-w-sm text-[0.92rem] text-muted">
        You can change this any time in Settings. Try them — the switch is live.
      </p>
      <div className="mt-7 grid grid-cols-3 gap-3">
        {options.map(({ id, label, icon: Icon }) => {
          const active = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className={[
                'em-lift flex flex-col items-center gap-3 rounded-panel border p-5 transition-colors',
                active ? 'border-brass bg-elevated' : 'border-hairline bg-surface hover:border-brass-deep',
              ].join(' ')}
            >
              <Icon size={22} strokeWidth={1.6} className={active ? 'text-brass' : 'text-soft'} />
              <span className={`text-[0.86rem] ${active ? 'text-bright' : 'text-soft'}`}>{label}</span>
            </button>
          );
        })}
      </div>
      <SpringButton
        onClick={onNext}
        className="em-press mt-8 inline-flex items-center gap-2.5 rounded-control bg-brass px-6 py-3 text-[0.9rem] font-medium text-void transition-colors hover:bg-brass-bright"
      >
        Continue <ArrowRight size={16} strokeWidth={2} />
      </SpringButton>
    </div>
  );
}

function DataStep({ onFinish }: { onFinish: (withSample: boolean) => void }) {
  return (
    <div className="text-center">
      <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">Your data</p>
      <h1 className="font-serif text-[2.1rem] leading-tight text-bright">How would you like to start?</h1>
      <p className="mx-auto mt-2 max-w-sm text-[0.92rem] text-muted">
        Begin with a clean slate and import your own statement, or explore with a
        realistic sample you can clear any time.
      </p>
      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onFinish(false)}
          className="em-lift group flex flex-col items-start gap-3 rounded-panel border border-hairline bg-surface p-5 text-left transition-colors hover:border-brass"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-elevated text-brass">
            <Upload size={18} strokeWidth={1.7} />
          </span>
          <span className="text-[0.98rem] text-bright">Start clean</span>
          <span className="text-[0.8rem] leading-snug text-muted">
            An empty workspace. Import a CSV, Excel, or PDF statement to begin.
          </span>
        </button>
        <button
          type="button"
          onClick={() => onFinish(true)}
          className="em-lift group flex flex-col items-start gap-3 rounded-panel border border-hairline bg-surface p-5 text-left transition-colors hover:border-brass"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-control border border-hairline bg-elevated text-brass">
            <Database size={18} strokeWidth={1.7} />
          </span>
          <span className="flex items-center gap-1.5 text-[0.98rem] text-bright">
            Explore with sample <Sparkles size={13} className="text-brass" />
          </span>
          <span className="text-[0.8rem] leading-snug text-muted">
            A realistic India-first ledger so you can see every feature at work.
          </span>
        </button>
      </div>
    </div>
  );
}

/** Floating ambient gradient blobs behind the onboarding card. */
function AmbientField() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="em-float-a absolute -left-32 top-10 h-80 w-80 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--em-glow-focal), transparent 70%)' }}
      />
      <div
        className="em-float-b absolute -right-24 bottom-0 h-96 w-96 rounded-full opacity-50 blur-3xl"
        style={{ background: 'radial-gradient(circle, var(--em-glow-brass), transparent 70%)' }}
      />
    </div>
  );
}
