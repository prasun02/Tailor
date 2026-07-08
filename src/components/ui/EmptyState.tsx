import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  message: string;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, message, action, className }: EmptyStateProps) {
  return (
    <section className={cn('rounded-lg border border-slate-200 bg-white p-6 text-center shadow-panel', className)}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
        <Icon aria-hidden="true" className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}