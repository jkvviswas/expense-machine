import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Database, Sparkles, type LucideIcon } from 'lucide-react';
import { transactionsStore } from '../transactions/store';
import { clientsStore } from '../clients/store';
import { onboardingStore } from '../onboarding/store';
import { EASE } from './primitives';
import { SpringButton } from './components';

/**
 * Reusable empty state for data-dependent pages (Analytics, Reports, etc.) when
 * a clean-start user has no transactions yet. Mirrors the dashboard's empty
 * invitation so the experience is consistent: import a real statement, or load
 * the sample dataset. Pure presentation; loading sample replays the locked seed
 * via the store's public API — no locked file or calculation touched.
 */
export function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
}) {
  const navigate = useNavigate();

  const loadSample = async () => {
    onboardingStore.setSampleLoaded(true);
    clientsStore.reset();
    await transactionsStore.resetToSeed();
  };

  return (
    <div className="em-halo relative flex min-h-[62vh] flex-col items-center justify-center px-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="relative z-[1] flex flex-col items-center"
      >
        <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-hairline bg-surface text-brass">
          <Icon size={22} strokeWidth={1.6} />
        </span>
        <p className="mb-2 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-brass">
          {eyebrow}
        </p>
        <h2 className="font-serif text-[2rem] leading-tight text-bright">{title}</h2>
        <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-muted">{description}</p>

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
