import { SearchX } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={SearchX}
        title="Page not found"
        message="The page address does not match a Faabrico screen."
        action={
          <Link className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600" to="/dashboard">
            Go to dashboard
          </Link>
        }
      />
    </div>
  );
}