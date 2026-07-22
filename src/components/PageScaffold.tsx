import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type PageScaffoldProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  children?: ReactNode;
};

export function PageScaffold({ title, description, icon: Icon, children }: PageScaffoldProps) {
  return (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-900 text-brand-50 ring-1 ring-accent-500/60">
            <Icon aria-hidden="true" className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold text-slate-950">{title}</h1>
          <p className="mt-1 max-w-3xl text-sm leading-5 text-slate-600">{description}</p>
        </div>
      </header>
      {children}
    </div>
  );
}