import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

interface ShellState {
  /** Desktop: sidebar collapsed to icon rail. */
  collapsed: boolean;
  toggleCollapsed: () => void;
  /** Mobile: drawer open. */
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const ShellContext = createContext<ShellState | null>(null);

const STORAGE_KEY = 'em.shell.collapsed';

export function ShellProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Close the mobile drawer whenever we cross to desktop width.
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setDrawerOpen(false);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleCollapsed = useCallback(() => setCollapsed((c) => !c), []);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <ShellContext.Provider
      value={{ collapsed, toggleCollapsed, drawerOpen, openDrawer, closeDrawer }}
    >
      {children}
    </ShellContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useShell(): ShellState {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used within <ShellProvider>');
  return ctx;
}
