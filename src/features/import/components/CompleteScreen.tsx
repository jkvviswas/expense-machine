import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, ArrowRight, ArrowLeftRight, LayoutDashboard, Wallet } from 'lucide-react';
import { Reveal, RevealItem } from './Reveal';
import { computeTotals } from '../mockData';
import { formatMoneyFull } from '../format';
import type { ParsedTransaction } from '../types';

interface CompleteScreenProps {
  transactions: ParsedTransaction[];
  onImportAnother: () => void;
}

export function CompleteScreen({
  transactions,
  onImportAnother,
}: CompleteScreenProps) {
  const navigate = useNavigate();
  const totals = computeTotals(transactions);
  const categoriesUsed = new Set(transactions.map((t) => t.category)).size;
  const processed = totals.inflow + Math.abs(totals.outflow);

  return (
    <Reveal className="mx-auto flex min-h-[64vh] max-w-2xl flex-col items-center justify-center text-center">
      {/* focal success ring */}
      <RevealItem>
        <div className="relative mb-9 flex h-40 w-40 items-center justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--em-glow-focal), transparent 60%)',
            }}
          />
          <motion.div
            className="relative flex h-28 w-28 items-center justify-center rounded-full border border-brass-deep"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            style={{ boxShadow: 'inset 0 0 40px var(--em-glow-brass)' }}
          >
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              <Check size={40} strokeWidth={1.75} className="text-brass" />
            </motion.div>
          </motion.div>
        </div>
      </RevealItem>

      <RevealItem>
        <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-brass">
          Import complete
        </p>
      </RevealItem>
      <RevealItem>
        <h2 className="mb-3 font-serif text-[2.4rem] leading-tight text-bright">
          Your money is organized
        </h2>
      </RevealItem>
      <RevealItem>
        <p className="mb-9 max-w-md text-[0.95rem] text-soft">
          {totals.count} transactions have been categorized and added to your
          workspace. Everything below is now searchable, budgetable, and ready
          to understand.
        </p>
      </RevealItem>

      {/* stats */}
      <RevealItem className="w-full">
        <div className="mb-9 grid grid-cols-3 gap-px overflow-hidden rounded-panel border border-hairline bg-hairline">
          <Stat label="Imported" value={String(totals.count)} />
          <Stat label="Categories" value={String(categoriesUsed)} />
          <Stat label="Processed" value={formatMoneyFull(processed)} mono />
        </div>
      </RevealItem>

      {/* next actions */}
      <RevealItem className="w-full">
        <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="flex items-center justify-center gap-2.5 rounded-control bg-brass px-5 py-3 text-[0.9rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
          >
            <ArrowLeftRight size={16} strokeWidth={2} />
            View transactions
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-2.5 rounded-control border border-hairline bg-surface px-5 py-3 text-[0.9rem] text-soft transition-colors duration-300 ease-lux hover:border-hairline-strong hover:text-bright"
          >
            <LayoutDashboard size={16} strokeWidth={1.75} />
            Open dashboard
          </button>
          <button
            type="button"
            onClick={() => navigate('/budgets')}
            className="flex items-center justify-center gap-2.5 rounded-control border border-hairline bg-surface px-5 py-3 text-[0.9rem] text-soft transition-colors duration-300 ease-lux hover:border-hairline-strong hover:text-bright"
          >
            <Wallet size={16} strokeWidth={1.75} />
            Create a budget
          </button>
        </div>
      </RevealItem>

      <RevealItem>
        <button
          type="button"
          onClick={onImportAnother}
          className="mt-7 inline-flex items-center gap-2 text-[0.82rem] text-muted transition-colors hover:text-soft"
        >
          Import another statement
          <ArrowRight size={14} />
        </button>
      </RevealItem>
    </Reveal>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-surface px-5 py-5">
      <div
        className={`text-[1.5rem] ${mono ? 'font-num' : 'font-serif'} text-bright`}
      >
        {value}
      </div>
      <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">
        {label}
      </div>
    </div>
  );
}
