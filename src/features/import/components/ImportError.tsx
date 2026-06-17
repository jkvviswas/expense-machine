import { motion } from 'framer-motion';
import { AlertTriangle, RotateCcw, FileText } from 'lucide-react';
import { Reveal, RevealItem } from './Reveal';

interface ImportErrorProps {
  message: string;
  onRetry: () => void;
}

/**
 * Calm, on-brand failure state for the Import Center. Real parsers can throw
 * (unrecognized columns, empty file, unreadable spreadsheet); this turns those
 * into a clear, recoverable moment rather than a broken flow.
 */
export function ImportError({ message, onRetry }: ImportErrorProps) {
  return (
    <Reveal className="mx-auto flex min-h-[56vh] max-w-lg flex-col items-center justify-center text-center">
      <RevealItem>
        <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--em-glow-ambient), transparent 60%)',
            }}
          />
          <motion.div
            className="relative flex h-20 w-20 items-center justify-center rounded-full border border-hairline-strong"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <AlertTriangle size={28} strokeWidth={1.75} className="text-loss" />
          </motion.div>
        </div>
      </RevealItem>

      <RevealItem>
        <p className="mb-3 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-loss">
          Couldn’t read that file
        </p>
      </RevealItem>
      <RevealItem>
        <h2 className="mb-3 font-serif text-[2rem] leading-tight text-bright">
          Let’s try that again
        </h2>
      </RevealItem>
      <RevealItem>
        <p className="mb-8 max-w-md text-[0.92rem] leading-relaxed text-soft">
          {message}
        </p>
      </RevealItem>

      <RevealItem className="w-full max-w-md">
        <div className="mb-7 rounded-panel border border-hairline bg-surface px-5 py-4 text-left">
          <div className="mb-2 flex items-center gap-2 text-[0.74rem] text-faint">
            <FileText size={13} strokeWidth={1.75} />
            What usually helps
          </div>
          <ul className="flex flex-col gap-1.5 text-[0.84rem] text-muted">
            <li>• Export the statement as CSV or XLSX from your bank.</li>
            <li>• Make sure it has a date column and an amount (or debit/credit) column.</li>
            <li>• Remove any password protection before uploading.</li>
          </ul>
        </div>
      </RevealItem>

      <RevealItem>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2.5 rounded-control bg-brass px-6 py-3 text-[0.92rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright"
        >
          <RotateCcw size={16} strokeWidth={2} />
          Choose another file
        </button>
      </RevealItem>
    </Reveal>
  );
}
