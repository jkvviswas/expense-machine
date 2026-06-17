import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Database, Sparkles } from 'lucide-react';
import { BrandMark } from '../../../components/primitives/BrandMark';
import { transactionsStore } from '../../transactions/store';
import { clientsStore } from '../../clients/store';
import { onboardingStore } from '../../onboarding/store';
import { EASE } from '../../motion/primitives';
import { SpringButton } from '../../motion/components';

/**
 * Shown on the dashboard when the working ledger is empty (a clean-start user).
 * Offers the two honest next steps — import a real statement, or load the
 * sample dataset — mirroring the onboarding data choice. No locked file or
 * calculation is involved; loading sample simply replays the locked seed.
 */
export function DashboardEmpty() {
  const navigate = useNavigate();

  const loadSample = async () => {
    onboardingStore.setSampleLoaded(true);
    clientsStore.reset();
    await transactionsStore.resetToSeed();
  };

  return (
    <div className="em-halo relative flex min-h-[68vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-[1] flex flex-col items-center"
      >
        <div className="mb-6">
          <BrandMark glyphOnly size={48} />
        </div>
        <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">
          Your command center
        </p>
        <h2 className="font-serif text-[2.2rem] leading-tight text-bright">
          Let's bring in your money
        </h2>
        <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">
          Import a bank statement and Expense Machine turns it into a clear,
          forward-looking picture — Safe to Spend, budgets, and reports. Or
          explore with a realistic sample first.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <SpringButton
            onClick={() => navigate('/import')}
            className="em-press inline-flex items-center gap-2.5 rounded-control bg-brass px-5 py-3 text-[0.9rem] font-medium text-void transition-colors hover:bg-brass-bright"
          >
            <Upload size={16} strokeWidth={2} /> Import a statement
          </SpringButton>
          <SpringButton
            onClick={loadSample}
            className="em-press inline-flex items-center gap-2.5 rounded-control border border-hairline bg-surface px-5 py-3 text-[0.9rem] text-soft transition-colors hover:border-brass-deep hover:text-bright"
          >
            <Database size={16} strokeWidth={1.8} /> Load sample data
            <Sparkles size={13} className="text-brass" />
          </SpringButton>
        </div>
      </motion.div>
    </div>
  );
}
