import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { NotFoundPage } from '../routes/NotFoundPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { RequireOnboarding } from '../features/onboarding/RequireOnboarding';

/**
 * Route structure.
 *
 * AUTH: `/login` is public; everything else lives inside the AppLayout shell,
 * which is wrapped in <RequireAuth> so unauthenticated users are redirected to
 * the login page (preserving their intended destination).
 *
 * BUNDLE: the Dashboard is eager (landing route); every other page is lazy.
 */
const AuthPage = lazy(() =>
  import('../features/auth/AuthPage').then((m) => ({ default: m.AuthPage })),
);
const ResetPasswordPage = lazy(() =>
  import('../features/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const TransactionsPage = lazy(() =>
  import('../features/transactions/TransactionsPage').then((m) => ({ default: m.TransactionsPage })),
);
const ImportCenter = lazy(() =>
  import('../features/import/ImportCenter').then((m) => ({ default: m.ImportCenter })),
);
const BudgetsPage = lazy(() =>
  import('../features/budgets/BudgetsPage').then((m) => ({ default: m.BudgetsPage })),
);
const ReportsPage = lazy(() =>
  import('../features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const AnalyticsPage = lazy(() =>
  import('../features/analytics/AnalyticsPage').then((m) => ({ default: m.AnalyticsPage })),
);
const SettingsPage = lazy(() =>
  import('../features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const TrashPage = lazy(() =>
  import('../features/transactions/TrashPage').then((m) => ({ default: m.TrashPage })),
);
const LoansPage = lazy(() =>
  import('../features/loans/LoansPage').then((m) => ({ default: m.LoansPage })),
);
const AccountsPage = lazy(() =>
  import('../features/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })),
);
const CommitmentsPage = lazy(() =>
  import('../features/commitments/CommitmentsPage').then((m) => ({ default: m.CommitmentsPage })),
);
const ClientsPage = lazy(() =>
  import('../features/clients/ClientsPage').then((m) => ({ default: m.ClientsPage })),
);
const NotificationsPage = lazy(() =>
  import('../features/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const HelpPage = lazy(() =>
  import('../features/help/HelpPage').then((m) => ({ default: m.HelpPage })),
);
const OnboardingFlow = lazy(() =>
  import('../features/onboarding/OnboardingFlow').then((m) => ({ default: m.OnboardingFlow })),
);
const LandingPage = lazy(() =>
  import('../features/landing/LandingPage').then((m) => ({ default: m.LandingPage })),
);

export const router = createBrowserRouter([
  {
    path: '/welcome',
    element: <LandingPage />,
  },
  {
    path: '/login',
    element: <AuthPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    // Auth-gated but NOT onboarding-gated: this is where new users land.
    path: '/onboarding',
    element: (
      <RequireAuth>
        <OnboardingFlow />
      </RequireAuth>
    ),
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <RequireOnboarding>
          <AppLayout />
        </RequireOnboarding>
      </RequireAuth>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'transactions', element: <TransactionsPage /> },
      { path: 'import', element: <ImportCenter /> },
      { path: 'budgets', element: <BudgetsPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'clients', element: <ClientsPage /> },
      { path: 'loans', element: <LoansPage /> },
      { path: 'accounts', element: <AccountsPage /> },
      { path: 'commitments', element: <CommitmentsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'trash', element: <TrashPage /> },
      { path: 'notifications', element: <NotificationsPage /> },
      { path: 'help', element: <HelpPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
