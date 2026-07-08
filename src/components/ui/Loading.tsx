import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

type LoadingProps = {
  label?: string;
  className?: string;
};

export function Loading({ label = 'Loading', className }: LoadingProps) {
  return (
    <div className={cn('flex min-h-48 items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-slate-600', className)}>
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand-600" />
        <span>{label}</span>
      </div>
    </div>
  );
}