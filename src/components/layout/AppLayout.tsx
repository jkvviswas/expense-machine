import { Outlet, useLocation } from 'react-router-dom';
import { Suspense, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useShell } from '../../app/shell-context';
import { layout, motion as tokens } from '../../styles/tokens';
import { pageTransition, EASE } from '../../features/motion/primitives';
import { PageSkeleton } from './PageSkeleton';
import { UndoToastHost } from '../../features/transactions/UndoToastHost';
import { SuccessToastHost } from '../../features/transactions/SuccessToastHost';
import { useLedger } from '../../features/transactions/store';
import { normalizeImportedAccounts } from '../../features/accounts/normalize';

export function AppLayout() {
  const { collapsed, drawerOpen, closeDrawer } = useShell();
  const { pathname } = useLocation();

  // One-time account normalization: convert any orphan imported accountIds into
  // real account records once the ledger has hydrated. Idempotent thereafter.
  const ledger = useLedger();
  const migratedRef = useRef(false);
  useEffect(() => {
    if (ledger && ledger.length > 0 && !migratedRef.current) {
      migratedRef.current = true;
      normalizeImportedAccounts();
    }
  }, [ledger]);

  const desktopWidth = collapsed
    ? layout.sidebarCollapsedWidth
    : layout.sidebarWidth;

  return (
    <div className="em-grain em-theme-tween relative flex h-screen overflow-hidden bg-ground text-bright">
      {/* ---- Desktop sidebar (fixed rail, reveals on first mount) ---- */}
      <motion.aside
        className="hidden h-screen flex-none border-r border-hairline lg:block"
        animate={{ width: desktopWidth }}
        initial={false}
        transition={{ duration: 0.4, ease: tokens.ease }}
      >
        <motion.div
          className="h-full"
          initial={{ opacity: 0, x: -18 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Sidebar collapsed={collapsed} />
        </motion.div>
      </motion.aside>

      {/* ---- Mobile drawer ---- */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              key="scrim"
              className="fixed inset-0 z-40 bg-void/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: tokens.ease }}
              onClick={closeDrawer}
            />
            <motion.aside
              key="drawer"
              className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-hairline lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ duration: 0.45, ease: tokens.ease }}
            >
              <Sidebar collapsed={false} onNavigate={closeDrawer} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ---- Main column ---- */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header reveals from the top on first mount — fixed, never scrolls */}
        <motion.div
          className="flex-none"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
        >
          <Header />
        </motion.div>
        <main className="relative flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={pageTransition}
              initial="initial"
              animate="enter"
              exit="exit"
            >
              <Suspense fallback={<PageSkeleton />}>
                <Outlet />
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <UndoToastHost />
      <SuccessToastHost />
    </div>
  );
}
