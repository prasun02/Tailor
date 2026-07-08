import { zodResolver } from '@hookform/resolvers/zod';
import { LockKeyhole, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { appEnv } from '../lib/env';
import { loginSchema, type LoginFormValues } from '../validations/auth';

export function LoginPage() {
  const { authError, isConfigured, isLoading, session, signIn } = useAuth();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const params = new URLSearchParams(location.search);
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (isLoading) {
    return <Loading label="Restoring your session" />;
  }

  if (session) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const result = await signIn(values.email, values.password);

    if (result.error) {
      setServerError(result.error);
    }
  });

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_26rem] lg:items-start">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h1 className="text-2xl font-semibold text-slate-950">Sign in</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Use Supabase email and password authentication to access your tailor shop workspace.
        </p>

        {params.get('reset') === 'success' ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            Your password was updated. Sign in again with the new password.
          </div>
        ) : null}

        {!isConfigured ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Supabase configuration is required before sign in can contact your project.
          </div>
        ) : null}

        {authError ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {authError}
          </div>
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={onSubmit}>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              {...register('email')}
            />
            {errors.email ? <span className="mt-1 block text-sm text-rose-600">{errors.email.message}</span> : null}
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              className="mt-1 h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
              {...register('password')}
            />
            {errors.password ? <span className="mt-1 block text-sm text-rose-600">{errors.password.message}</span> : null}
          </label>

          {serverError ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div> : null}

          <button
            type="submit"
            disabled={isSubmitting || !isConfigured}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-base font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <LockKeyhole aria-hidden="true" className="h-5 w-5" />
            {isSubmitting ? 'Signing in' : 'Continue'}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:text-brand-900">
            Forgot password?
          </Link>
        </div>
      </section>

      <EmptyState
        icon={Mail}
        title={appEnv.appName}
        message="Sign in, restore your browser session, and continue into the active shop connected to your account."
      />
    </div>
  );
}
