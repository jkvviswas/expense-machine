import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, X } from 'lucide-react';
import { useSuccessToast, successToastStore } from './successToast';

export function SuccessToastHost() {
  const toast = useSuccessToast();
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-panel border border-hairline-strong bg-elevated px-4 py-3.5 shadow-elevated"
            style={{ borderLeft: '3px solid var(--em-gain)' }}
          >
            <CheckCircle2
              size={17}
              strokeWidth={2}
              className="mt-0.5 flex-none"
              style={{ color: 'var(--em-gain)' }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[0.86rem] font-medium text-bright">{toast.title}</p>
              {toast.lines.map((line, i) => (
                <p key={i} className="mt-0.5 text-[0.78rem] text-muted">{line}</p>
              ))}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => successToastStore.dismiss()}
              className="mt-0.5 flex-none text-faint transition-colors hover:text-bright"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
