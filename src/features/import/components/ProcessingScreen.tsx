import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Loader2, Check } from 'lucide-react';
import { Reveal, RevealItem } from './Reveal';
import { processingSteps } from '../mockData';

interface ProcessingScreenProps {
  fileName: string;
  fileSizeLabel: string;
  onDone: () => void;
}

const STEP_MS = 1100;

export function ProcessingScreen({ fileName, fileSizeLabel, onDone }: ProcessingScreenProps) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timers: number[] = [];
    processingSteps.forEach((_, i) => {
      timers.push(
        window.setTimeout(() => setStepIdx(i + 1), STEP_MS * (i + 1)),
      );
    });
    timers.push(
      window.setTimeout(onDone, STEP_MS * processingSteps.length + 700),
    );
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const progress = Math.min(stepIdx / processingSteps.length, 1);
  const pct = Math.round(progress * 100);

  // ring geometry
  const r = 78;
  const circ = 2 * Math.PI * r;

  return (
    <Reveal className="flex min-h-[60vh] flex-col items-center justify-center">
      <RevealItem>
        <div className="relative mb-10 flex h-52 w-52 items-center justify-center">
          {/* ambient halo */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              background:
                'radial-gradient(circle, var(--em-glow-focal), transparent 62%)',
            }}
          />
          <svg width="200" height="200" viewBox="0 0 200 200" className="relative">
            <circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke="var(--em-hairline)"
              strokeWidth="1.5"
            />
            <motion.circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke="var(--em-brass)"
              strokeWidth="2"
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              strokeDasharray={circ}
              initial={{ strokeDashoffset: circ }}
              animate={{ strokeDashoffset: circ * (1 - progress) }}
              transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="font-num text-[2.1rem] text-bright">
              {pct}
              <span className="text-[0.9rem] text-muted">%</span>
            </span>
            <span className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.2em] text-faint">
              Processing
            </span>
          </div>
        </div>
      </RevealItem>

      <RevealItem>
        <h2 className="mb-1 text-center font-serif text-[1.8rem] text-bright">
          {stepIdx < processingSteps.length
            ? processingSteps[stepIdx] + '…'
            : 'Ready for review'}
        </h2>
        <p className="mb-9 text-center text-[0.9rem] text-muted">
          Reading {fileName} — this usually takes a moment.
        </p>
      </RevealItem>

      {/* narrated steps */}
      <RevealItem className="w-full max-w-md">
        <div className="rounded-panel border border-hairline bg-surface p-2">
          {processingSteps.map((step, i) => {
            const done = i < stepIdx;
            const active = i === stepIdx;
            return (
              <div
                key={step}
                className="flex items-center gap-3 rounded-control px-4 py-3 transition-colors duration-500"
                style={{ background: active ? 'var(--em-elevated)' : 'transparent' }}
              >
                <span className="flex h-6 w-6 flex-none items-center justify-center">
                  {done ? (
                    <Check size={15} className="text-gain" />
                  ) : active ? (
                    <Loader2 size={15} className="animate-spin text-brass" />
                  ) : (
                    <span className="h-1.5 w-1.5 rounded-full bg-faint" />
                  )}
                </span>
                <span
                  className={[
                    'text-[0.9rem] transition-colors duration-500',
                    done ? 'text-soft' : active ? 'text-bright' : 'text-faint',
                  ].join(' ')}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-center gap-2.5 text-[0.78rem] text-faint">
          <FileText size={13} strokeWidth={1.75} />
          {fileName} · {fileSizeLabel}
        </div>
      </RevealItem>
    </Reveal>
  );
}
