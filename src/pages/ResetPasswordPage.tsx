import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { TextField } from '../components/ui/FormField';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../validations/auth';

export function ResetPasswordPage() {
  const { isConfigured, isLoading, session, signOut, updatePassword } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  if (isLoading) {
    return <Loading label="Verifying reset link" />;
  }

  if (!isConfigured) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={KeyRound}
          title="Configuration required"
          message="Supabase configuration is required before passwords can be updated."
        />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={KeyRound}
          title="Reset link required"
          message="Open the latest reset link from your email in this browser, or request a new one."
          action={
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                to="/forgot-password"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              >
                Request reset link
              </Link>
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-panel transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600"
              >
                Back to sign in
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await updatePassword(values.password);

    if (result.error) {
      setServerError(result.error);
      return;
    }

    await signOut();
    navigate('/login?reset=success', { replace: true });
  });

  return (
    <section className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <h1 className="text-2xl font-semibold text-slate-950">Reset password</h1>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Choose a new password for your Supabase account. You will sign in again after it is saved.
      </p>

      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <TextField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {serverError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-base font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <KeyRound aria-hidden="true" className="h-5 w-5" />
          {isSubmitting ? 'Saving password' : 'Save new password'}
        </button>
      </form>
    </section>
  );
}
