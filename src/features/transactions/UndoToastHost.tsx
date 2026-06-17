import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Undo2, X } from 'lucide-react';
import { useToast, toastStore } from './toast';

/**
 * Bottom-centered undo toast. Mounted once at the app root; reacts to the
 * global toast store so any delete (row, bulk, modal, activity item) surfaces
 * a consistent Undo affordance.
 */
export function UndoToastHost() {
  const toast = useToast();
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto flex items-center gap-4 rounded-panel border border-hairline-strong bg-elevated px-4 py-3 shadow-elevated"
          >
            <span className="text-[0.86rem] text-bright">{toast.message}</span>
            <button
              type="button"
              onClick={() => toastStore.undo()}
              className="flex items-center gap-1.5 rounded-control border border-hairline px-2.5 py-1 text-[0.8rem] font-medium text-brass transition-colors hover:border-brass-deep"
            >
              <Undo2 size={14} strokeWidth={2} />
              Undo
            </button>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => toastStore.dismiss()}
              className="text-faint transition-colors hover:text-bright"
            >
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
