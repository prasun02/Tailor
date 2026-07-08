import { LogOut, ShieldAlert } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';

export function MembershipSuspendedPage() {
  const { signOut } = useAuth();
  const { error, hasActiveMembership, hasAnyMembership, inactiveMemberships, isLoading } = useShop();

  if (isLoading) {
    return <Loading label="Checking shop membership" />;
  }

  if (hasActiveMembership) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!hasAnyMembership) {
    return <Navigate to="/onboarding" replace />;
  }

  const shopNames = inactiveMemberships.map((membership) => membership.shop.name).join(', ');

  return (
    <div className="mx-auto max-w-xl">
      <EmptyState
        icon={ShieldAlert}
        title="Membership suspended"
        message={
          error?.message ??
          `Your account is connected to ${shopNames || 'a shop'}, but no active shop membership is available. Ask an owner or manager to reactivate your account.`
        }
        action={
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-panel transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
          >
            <LogOut aria-hidden="true" className="h-4 w-4" />
            Sign out
          </button>
        }
      />
    </div>
  );
}
