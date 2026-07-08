import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, Send } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { TextField } from '../components/ui/FormField';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../validations/auth';

export function ForgotPasswordPage() {
  const { isConfigured, isLoading, sendPasswordResetEmail, session } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  if (isLoading) {
    return <Loading label="Restoring your session" />;
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSentTo(null);

    const result = await sendPasswordResetEmail(values.email);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    setSentTo(values.email.trim());
  });

  if (sentTo) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={MailCheck}
          title="Check your email"
          message={`A password reset link was sent to ${sentTo}. Open it in this browser to choose a new password.`}
          action={
            <Link
              to="/login"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-panel transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
            >
              Back to sign in
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h1 className="text-2xl font-semibold text-slate-950">Forgot password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Enter the email address for your Supabase account. We will send a secure reset link.
      </p>

      {!isConfigured ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Supabase configuration is required before reset emails can be sent.
        </div>
      ) : null}

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email?.message}
          {...register('email')}
        />

        {serverError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting || !isConfigured}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-base font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Send aria-hidden="true" className="h-5 w-5" />
          {isSubmitting ? 'Sending link' : 'Send reset link'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <Link to="/login" className="font-medium text-brand-700 hover:text-brand-900">
          Back to sign in
        </Link>
      </div>
    </section>
  );
}
