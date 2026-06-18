import { RouterProvider } from 'react-router-dom';
import { ShellProvider } from './app/shell-context';
import { router } from './app/router';
import { hydrateBudgets } from './features/budgets/persistence';
import { ensureHydrated } from './features/transactions/store';
import { runAlertEngine } from './features/notifications/engine';
import { ThemeProvider, applyThemeAtBoot } from './features/theme/ThemeProvider';
import { CursorGlow } from './components/CursorGlow';

// Apply the persisted theme to <html> before React paints, so there is no
// flash of the wrong palette. Pure presentation — no locked file touched.
applyThemeAtBoot();

// --- Password-reset safety net --------------------------------------------
// Supabase sends users back from the reset email with a recovery token in the
// URL (hash `#...type=recovery` in the implicit flow, or `?code=...` in PKCE).
// If a misconfigured Site URL drops them somewhere other than /reset-password,
// forward them there ourselves — preserving the token — so reset always works.
(() => {
  if (typeof window === 'undefined') return;
  const { hash, search, pathname } = window.location;
  if (pathname === '/reset-password') return;
  const isRecovery =
    /type=recovery/.test(hash) ||
    (/access_token=/.test(hash) && /type=recovery/.test(hash)) ||
    (/[?&]code=/.test(search) && /recovery/i.test(search)) ||
    /[?&]type=recovery/.test(search);
  if (isRecovery) {
    // Keep both hash and query so the Supabase client can read the token.
    window.location.replace(`/reset-password${search}${hash}`);
  }
})();

// Hydrate additive persistence layers before first paint. These touch no
// locked calculation — they only restore the user's working state (budget caps
// via the store's public API, and the working ledger) from localStorage.
hydrateBudgets();
void ensureHydrated().then(() => {
  // Generate budget / large-expense alerts once the ledger is available so the
  // notification bell reflects the user's real position immediately.
  runAlertEngine();
});

export default function App() {
  return (
    <ThemeProvider>
      <ShellProvider>
        <CursorGlow />
        <RouterProvider router={router} />
      </ShellProvider>
    </ThemeProvider>
  );
}
