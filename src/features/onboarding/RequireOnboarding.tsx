import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useOnboarding } from './store';

/**
 * Gates the app shell behind onboarding. A signed-in user who hasn't completed
 * onboarding is sent to /onboarding (which sets up their clean or sample state).
 * Sits INSIDE RequireAuth in the router, so it only applies to authed users.
 */
export function RequireOnboarding({ children }: { children: ReactNode }) {
  const { completed } = useOnboarding();
  if (!completed) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}
