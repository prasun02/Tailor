import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Store, UserRound } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { TextAreaField, TextField } from '../components/ui/FormField';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';
import { getSupabaseClient } from '../services/supabaseClient';
import { onboardingSchema, type OnboardingFormValues } from '../validations/auth';

export function OnboardingPage() {
  const { user } = useAuth();
  const {
    currentShopId,
    error,
    hasActiveMembership,
    hasSuspendedMembership,
    isLoading,
    reloadMemberships,
    setCurrentShopId,
  } = useShop();
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      ownerFullName: '',
      ownerPhone: '',
      shopName: '',
      shopPhone: '',
      shopAddress: '',
    },
  });

  if (isLoading) {
    return <Loading label="Checking shop membership" />;
  }

  if (hasActiveMembership && currentShopId) {
    return <Navigate to="/dashboard" replace />;
  }

  if (hasSuspendedMembership) {
    return <Navigate to="/membership-suspended" replace />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-xl">
        <EmptyState
          icon={Store}
          title="Could not load membership"
          message={error.message}
          action={
            <button
              type="button"
              onClick={() => void reloadMemberships()}
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
            >
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setServerError(null);

    try {
      const supabase = getSupabaseClient();
      const { data: shopId, error: rpcError } = await supabase.rpc('create_shop_with_owner', {
        owner_full_name: values.ownerFullName,
        owner_phone: values.ownerPhone,
        shop_name: values.shopName,
        shop_phone: values.shopPhone,
        shop_address: values.shopAddress,
        shop_logo_url: null,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!shopId) {
        throw new Error('Shop onboarding did not return a shop id.');
      }

      const nextMemberships = await reloadMemberships();
      const createdMembership = nextMemberships.find(
        (membership) => membership.shop_id === shopId && membership.is_active,
      );

      if (!createdMembership) {
        throw new Error('Shop was created, but the active owner membership was not returned. Refresh and try again.');
      }

      setCurrentShopId(shopId);
      navigate('/dashboard', { replace: true });
    } catch (caughtError) {
      setServerError(caughtError instanceof Error ? caughtError.message : 'Could not complete onboarding.');
    } finally {
      setIsCreating(false);
    }
  });

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_24rem] lg:items-start">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Store aria-hidden="true" className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-slate-950">Create your shop</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This creates the shop through the secure Supabase RPC and makes your signed-in user the owner.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <TextField
            label="Owner full name"
            autoComplete="name"
            error={errors.ownerFullName?.message}
            {...register('ownerFullName')}
          />
          <TextField
            label="Owner phone"
            autoComplete="tel"
            inputMode="tel"
            error={errors.ownerPhone?.message}
            {...register('ownerPhone')}
          />
          <TextField label="Shop name" error={errors.shopName?.message} {...register('shopName')} />
          <TextField
            label="Shop phone"
            autoComplete="tel"
            inputMode="tel"
            error={errors.shopPhone?.message}
            {...register('shopPhone')}
          />
          <TextAreaField label="Shop address" rows={4} error={errors.shopAddress?.message} {...register('shopAddress')} />

          {serverError ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{serverError}</div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting || isCreating}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-base font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting || isCreating ? (
              <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
            ) : (
              <Store aria-hidden="true" className="h-5 w-5" />
            )}
            {isSubmitting || isCreating ? 'Creating shop' : 'Create shop'}
          </button>
        </form>
      </section>

      <EmptyState
        icon={UserRound}
        title={user?.email ?? 'Signed in'}
        message="Existing active members skip this step automatically. New shops are seeded with counters, garment types, measurement fields, and style choices by PostgreSQL."
      />
    </div>
  );
}
