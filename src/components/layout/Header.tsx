import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Search, Menu, ArrowLeftRight, Bell, LogOut, User as UserIcon, Sun, Moon } from 'lucide-react';
import { navItemForPath } from '../../app/navigation';
import { useShell } from '../../app/shell-context';
import { authStore, useAuth } from '../../features/auth/store';
import { balanceLockStore } from '../../features/balance/lockStore';
import { useUnreadCount } from '../../features/notifications/store';
import { useResolvedTheme } from '../../features/theme/store';
import { useSettings } from '../../features/settings/store';
import { setThemeMode } from '../../features/theme/ThemeProvider';
import { LiveClock } from './LiveClock';
import { GlobalSearch } from './GlobalSearch';

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { openDrawer } = useShell();
  const { user } = useAuth();
  const settings = useSettings();
  const unread = useUnreadCount();
  const theme = useResolvedTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const item = navItemForPath(pathname);
  const title = item?.label ?? 'Expense Machine';
  const subtitle = item?.subtitle ?? '';
  // Identity reflects the edited profile name when present, else the account.
  const displayName = settings.name.trim() || user?.name?.trim() || '';
  const initial = (displayName[0] ?? '?').toUpperCase();

  // Cmd/Ctrl+K opens global search from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
    <header className="sticky top-0 z-30 flex h-[var(--em-header-h)] items-center gap-4 border-b border-hairline bg-ground/85 px-5 backdrop-blur-md sm:px-8">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={openDrawer}
        aria-label="Open navigation"
        className="flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:text-bright lg:hidden"
      >
        <Menu size={20} strokeWidth={1.75} />
      </button>

      {/* Title block — left. Greeting/date/time lives here as the single
          source (the dashboard's duplicate strip has been removed). */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h1 className="truncate font-serif text-[1.05rem] leading-none text-bright sm:text-[1.35rem]">
            {title}
          </h1>
          {subtitle && (
            <span className="hidden truncate text-[0.8rem] text-muted lg:inline">{subtitle}</span>
          )}
        </div>
        <LiveClock className="mt-1 hidden truncate text-[0.64rem] sm:block" />
      </div>

      {/* Global search — opens the command palette (real search over the
          user's data). Fixed width so it doesn't starve the title at tablet. */}
      <button
        type="button"
        onClick={() => setSearchOpen(true)}
        aria-label="Open search"
        className="relative hidden h-10 w-56 items-center rounded-control border border-hairline bg-surface pl-10 pr-3 text-left text-[0.88rem] text-faint transition-colors duration-300 ease-lux hover:border-brass-deep md:flex lg:w-72"
      >
        <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 text-faint" />
        Search transactions, clients…
      </button>

      {/* Actions — right */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Search icon only, on small screens → opens the palette */}
        <button
          type="button"
          aria-label="Search"
          onClick={() => setSearchOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:text-bright md:hidden"
        >
          <Search size={18} strokeWidth={1.75} />
        </button>

        {/* The one brass primary action per view → the Transactions ledger,
            the real home of money movement in the app today. */}
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="em-press hidden items-center gap-2 rounded-control bg-brass px-4 py-2 text-[0.86rem] font-medium text-void transition-colors duration-300 ease-lux hover:bg-brass-bright sm:flex"
        >
          <ArrowLeftRight size={15} strokeWidth={2} />
          Transactions
        </button>
        <button
          type="button"
          aria-label="View transactions"
          onClick={() => navigate('/transactions')}
          className="em-press flex h-9 w-9 items-center justify-center rounded-control bg-brass text-void transition-colors hover:bg-brass-bright sm:hidden"
        >
          <ArrowLeftRight size={17} strokeWidth={2} />
        </button>

        {/* Theme toggle — quick light/dark switch with animated transition */}
        <button
          type="button"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          onClick={() => setThemeMode(theme === 'dark' ? 'light' : 'dark')}
          className="em-press relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-control text-muted transition-colors hover:text-bright"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ y: 14, opacity: 0, rotate: -30 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: -14, opacity: 0, rotate: 30 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-center justify-center"
            >
              {theme === 'dark' ? <Moon size={18} strokeWidth={1.75} /> : <Sun size={18} strokeWidth={1.75} />}
            </motion.span>
          </AnimatePresence>
        </button>

        {/* Notifications */}
        <button
          type="button"
          aria-label="Notifications"
          onClick={() => navigate('/notifications')}
          className="relative flex h-9 w-9 items-center justify-center rounded-control text-muted transition-colors hover:text-bright"
        >
          <Bell size={18} strokeWidth={1.75} />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brass px-1 font-mono text-[0.58rem] font-medium text-void">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {/* Profile + menu */}
        <div className="relative">
          <button
            type="button"
            aria-label="Account menu"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline-strong bg-elevated font-mono text-[0.75rem] text-soft transition-colors hover:border-brass-deep"
          >
            {initial}
          </button>
          <AnimatePresence>
            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                  aria-hidden
                />
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-panel border border-hairline-strong bg-elevated shadow-elevated"
                >
                  <div className="border-b border-hairline px-4 py-3">
                    <div className="truncate text-[0.86rem] text-bright">{displayName || 'You'}</div>
                    <div className="truncate font-mono text-[0.72rem] text-faint">
                      {user?.email ?? ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.84rem] text-soft transition-colors hover:bg-surface hover:text-bright"
                  >
                    <UserIcon size={15} strokeWidth={1.75} /> Profile &amp; settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      balanceLockStore.lock();
                      authStore.logout();
                      navigate('/login');
                    }}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.84rem] text-soft transition-colors hover:bg-surface hover:text-loss"
                  >
                    <LogOut size={15} strokeWidth={1.75} /> Sign out
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
    <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
