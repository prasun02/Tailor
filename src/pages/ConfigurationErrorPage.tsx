import { AlertTriangle } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { appEnv } from '../lib/env';

export function ConfigurationErrorPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <EmptyState
        icon={AlertTriangle}
        title="Configuration required"
        message="Set the required Vite environment variables before connecting this app to Supabase. Never use a Supabase secret or service-role key in the browser."
        action={
          <div className="rounded-lg bg-slate-100 p-4 text-left text-sm text-slate-700">
            <p className="font-semibold text-slate-950">Missing or invalid values</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {appEnv.configurationIssues.map((issue, index) => (
                <li key={issue + index}>{issue}</li>
              ))}
            </ul>
          </div>
        }
      />
    </div>
  );
}