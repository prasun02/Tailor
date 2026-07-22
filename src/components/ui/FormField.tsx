import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

type FieldShellProps = {
  label: string;
  error?: string;
  description?: string;
  children: ReactNode;
};

export function FieldShell({ label, error, description, children }: FieldShellProps) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase text-slate-600">{label}</span>
      {children}
      {description ? <span className="block text-xs leading-5 text-slate-500">{description}</span> : null}
      {error ? <span className="block text-sm font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  description?: string;
};

export function TextField({ label, error, description, className, ...props }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} description={description}>
      <input
        className={cn(
          'min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : null,
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}

type TextAreaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
  error?: string;
  description?: string;
};

export function TextAreaField({ label, error, description, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldShell label={label} error={error} description={description}>
      <textarea
        className={cn(
          'min-h-24 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : null,
          className,
        )}
        {...props}
      />
    </FieldShell>
  );
}
