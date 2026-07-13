import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, ImageOff, Loader2, Printer } from 'lucide-react';
import { cn } from '../../utils/cn';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  icon?: LucideIcon;
};

export function Button({ variant = 'primary', icon: Icon, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' ? 'bg-brand-600 text-white hover:bg-brand-700' : null,
        variant === 'secondary' ? 'border border-brand-200 bg-white text-slate-700 hover:bg-brand-50' : null,
        variant === 'quiet' ? 'text-slate-700 hover:bg-brand-50' : null,
        variant === 'danger' ? 'bg-red-600 text-white hover:bg-red-700' : null,
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cn('rounded-lg border border-brand-200 bg-white p-4 shadow-panel', className)}>{children}</section>;
}

export function SectionHeader({ title, description, icon: Icon }: { title: string; description?: string; icon?: LucideIcon }) {
  return (
    <header className="flex items-start gap-3">
      {Icon ? (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      ) : null}
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
    </header>
  );
}

export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid gap-4 md:grid-cols-2', className)}>{children}</div>;
}

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' | 'success' | 'warning' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-7 items-center rounded-full px-3 text-xs font-semibold',
        tone === 'neutral' ? 'bg-slate-100 text-slate-600' : null,
        tone === 'accent' ? 'bg-brand-50 text-brand-700' : null,
        tone === 'success' ? 'bg-emerald-50 text-emerald-700' : null,
        tone === 'warning' ? 'bg-amber-50 text-amber-800' : null,
      )}
    >
      {children}
    </span>
  );
}

export function Stepper({ steps, activeIndex }: { steps: string[]; activeIndex: number }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-9">
      {steps.map((step, index) => (
        <li key={step} className={cn('rounded-lg border px-3 py-2 text-xs font-semibold', activeIndex === index ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-200 bg-white text-slate-600')}>
          <span className="block text-[10px] uppercase tracking-wide opacity-80">Step {index + 1}</span>
          {step}
        </li>
      ))}
    </ol>
  );
}

export function PrintButton(props: Omit<ButtonProps, 'icon'>) {
  return <Button icon={Printer} {...props} />;
}

export function ThumbnailCard({ src, label, detail }: { src?: string | null; label: string; detail?: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border border-brand-200 bg-white shadow-panel">
      {src ? (
        <img src={src} alt={label} className="aspect-[4/3] w-full object-cover" loading="lazy" />
      ) : (
        <div className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 bg-brand-50 text-sm font-semibold text-slate-500">
          <ImageOff aria-hidden="true" className="h-5 w-5" />
          No image
        </div>
      )}
      <figcaption className="p-3">
        <p className="font-semibold text-slate-950">{label}</p>
        {detail ? <p className="mt-1 text-sm text-slate-600">{detail}</p> : null}
      </figcaption>
    </figure>
  );
}

export function ErrorState({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-red-200 bg-red-50 text-red-900">
      <SectionHeader icon={AlertTriangle} title={title} description={message} />
    </Card>
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-24 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white text-sm font-semibold text-slate-600 shadow-panel">
      <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-brand-600" />
      {label}
    </div>
  );
}