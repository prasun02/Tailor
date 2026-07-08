import { AlertTriangle } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from './ui/EmptyState';

type RootErrorBoundaryProps = {
  children: ReactNode;
};

type RootErrorBoundaryState = {
  error: Error | null;
};

export class RootErrorBoundary extends Component<RootErrorBoundaryProps, RootErrorBoundaryState> {
  state: RootErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RootErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Application render error', error, errorInfo);
    }
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    const developmentDetails = import.meta.env.DEV ? error.stack || error.message : null;

    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950">
        <div className="mx-auto max-w-2xl">
          <EmptyState
            icon={AlertTriangle}
            title="Application error"
            message={
              import.meta.env.DEV
                ? error.message
                : 'Something went wrong while loading the app. Please refresh and try again.'
            }
            action={
              developmentDetails ? (
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-4 text-left text-xs leading-5 text-slate-100">
                  {developmentDetails}
                </pre>
              ) : null
            }
          />
        </div>
      </main>
    );
  }
}
