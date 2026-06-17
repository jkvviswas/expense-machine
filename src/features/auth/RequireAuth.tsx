import { Navigate, useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './store';

/**
 * Protects the app shell. Unauthenticated users are sent to the public landing
 * page (the product's front door), preserving the route they wanted so they can
 * return to it after signing in. While the persisted session is being read
 * (`ready` false), render nothing to avoid a flash for an already-signed-in user.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) return <div className="min-h-screen bg-ground" />;
  if (!user) {
    return <Navigate to="/welcome" replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}
