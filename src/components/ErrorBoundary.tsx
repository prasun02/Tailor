import { AlertTriangle } from 'lucide-react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';
import { EmptyState } from './ui/EmptyState';

export function ErrorBoundary() {
  const error = useRouteError();
  const routeMessage = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong while loading this page.';
  const message =
    import.meta.env.DEV || isRouteErrorResponse(error)
      ? routeMessage
      : 'Something went wrong while loading this page.';

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <EmptyState icon={AlertTriangle} title="Page error" message={message} />
      </div>
    </main>
  );
}
