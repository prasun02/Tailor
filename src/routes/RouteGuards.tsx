import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';
import { ConfigurationErrorPage } from '../pages/ConfigurationErrorPage';
import type { ShopRole } from '../types/database';
import { defaultPathForRole, hasAnyRole } from '../utils/authorization';

export function RequireConfiguration({ children }: { children: ReactNode }) {
  const { isConfigured } = useAuth();

  if (!isConfigured) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <ConfigurationErrorPage />
      </main>
    );
  }

  return children;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, session } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <Loading label="Restoring your session" className="m-4" />;
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export function RequireShop({ children }: { children: ReactNode }) {
  const { currentShopId, error, hasActiveMembership, hasSuspendedMembership, isLoading, reloadMemberships } = useShop();

  if (isLoading) {
    return <Loading label="Loading shop membership" className="m-4" />;
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <section className="mx-auto max-w-xl rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800">
          <h1 className="text-lg font-semibold">Could not load shop membership</h1>
          <p className="mt-2 text-sm leading-6">{error.message}</p>
          <button
            type="button"
            onClick={() => void reloadMemberships()}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white transition hover:bg-rose-800 focus:outline-none focus:ring-2 focus:ring-rose-700 focus:ring-offset-2"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (hasActiveMembership && currentShopId) {
    return children;
  }

  if (hasSuspendedMembership) {
    return <Navigate to="/membership-suspended" replace />;
  }

  return <Navigate to="/onboarding" replace />;
}

export function RequireRole({ children, allowedRoles }: { children: ReactNode; allowedRoles: ReadonlyArray<ShopRole> }) {
  const { currentRole } = useShop();
  const location = useLocation();

  if (hasAnyRole(currentRole, allowedRoles)) {
    return children;
  }

  return <Navigate to={defaultPathForRole(currentRole)} replace state={{ from: location, deniedPath: location.pathname }} />;
}

export function RoleHomeRedirect() {
  const { currentRole } = useShop();

  return <Navigate to={defaultPathForRole(currentRole)} replace />;
}
