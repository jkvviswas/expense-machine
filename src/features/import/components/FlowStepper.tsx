import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { FlowStep } from '../types';

const STEPS: { key: FlowStep; label: string }[] = [
  { key: 'upload', label: 'Upload' },
  { key: 'processing', label: 'Process' },
  { key: 'extraction', label: 'Extract' },
  { key: 'review', label: 'Review' },
  { key: 'complete', label: 'Done' },
];

const order: FlowStep[] = ['upload', 'processing', 'extraction', 'review', 'complete'];

export function FlowStepper({ current }: { current: FlowStep }) {
  const currentIdx = order.indexOf(current);

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-3">
      {STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={step.key} className="flex items-center gap-1.5 sm:gap-3">
            <div className="flex items-center gap-2">
              <span
                className={[
                  'flex h-6 w-6 items-center justify-center rounded-full border text-[0.66rem] font-mono transition-colors duration-500',
                  done
                    ? 'border-brass-deep bg-brass-deep/30 text-brass'
                    : active
                      ? 'border-brass text-brass'
                      : 'border-hairline text-faint',
                ].join(' ')}
              >
                {done ? <Check size={12} /> : i + 1}
              </span>
              <span
                className={[
                  'hidden text-[0.74rem] tracking-wide transition-colors duration-500 sm:inline',
                  active ? 'text-bright' : done ? 'text-soft' : 'text-faint',
                ].join(' ')}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="relative h-px w-5 overflow-hidden bg-hairline sm:w-10">
                <motion.div
                  className="absolute inset-0 origin-left bg-brass-deep"
                  initial={false}
                  animate={{ scaleX: i < currentIdx ? 1 : 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
