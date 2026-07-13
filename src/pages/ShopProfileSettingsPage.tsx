import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Save, ShieldAlert, Store } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { appBrand } from '../app/brand';
import { PageScaffold } from '../components/PageScaffold';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { TextAreaField, TextField } from '../components/ui/FormField';
import { withShopBrandDefaults } from '../features/printing/printModel';
import { useShop } from '../features/shop/shopContext';
import { getSupabaseClient } from '../services/supabaseClient';
import type { Database } from '../types/database';
import { canManageConfiguration } from '../utils/authorization';

const shopProfileSchema = z.object({
  name: z.string().trim().min(1, 'Shop name is required.').max(120, 'Shop name is too long.'),
  phone: z.string().trim().min(5, 'Shop phone is required.').max(40, 'Shop phone is too long.'),
  address: z.string().trim().min(3, 'Shop address is required.').max(300, 'Shop address is too long.'),
  logoUrl: z.string().trim().url('Enter a valid logo URL.').max(500, 'Logo URL is too long.').optional().or(z.literal('')),
});

type ShopProfileValues = z.infer<typeof shopProfileSchema>;
type ShopRow = Pick<Database['public']['Tables']['shops']['Row'], 'name' | 'phone' | 'address' | 'logo_url'>;

const faabricoProfileDefaults: ShopProfileValues = {
  name: appBrand.name,
  phone: appBrand.phone,
  address: appBrand.address,
  logoUrl: appBrand.logoUrl,
};

function profileValuesFromShop(row: ShopRow | null | undefined): ShopProfileValues {
  const brand = withShopBrandDefaults(row);

  return {
    name: brand.name,
    phone: brand.phone ?? appBrand.phone,
    address: brand.address ?? appBrand.address,
    logoUrl: brand.logo_url ?? '',
  };
}

export function ShopProfileSettingsPage() {
  const { currentRole, currentShopId, reloadMemberships } = useShop();
  const canEdit = canManageConfiguration(currentRole);
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['shop-profile', currentShopId] as const, [currentShopId]);

  const profileQuery = useQuery({
    queryKey,
    enabled: Boolean(currentShopId),
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('shops')
        .select('name, phone, address, logo_url')
        .eq('id', currentShopId ?? '')
        .maybeSingle();

      if (error) throw new Error(error.message);

      return profileValuesFromShop(data as ShopRow | null);
    },
  });

  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<ShopProfileValues>({
    resolver: zodResolver(shopProfileSchema),
    defaultValues: faabricoProfileDefaults,
  });

  useEffect(() => {
    if (profileQuery.data) {
      reset(profileQuery.data);
    }
  }, [profileQuery.data, reset]);

  const updateProfile = useMutation({
    mutationFn: async (values: ShopProfileValues) => {
      if (!currentShopId) {
        throw new Error('No active shop selected.');
      }

      const supabase = getSupabaseClient();
      const payload: Database['public']['Tables']['shops']['Update'] = {
        name: values.name.trim(),
        phone: values.phone.trim(),
        address: values.address.trim(),
        logo_url: values.logoUrl?.trim() || null,
      };
      const { error } = await supabase.from('shops').update(payload).eq('id', currentShopId);

      if (error) throw new Error(error.message);
    },
    onSuccess: async (_data, values) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey }),
        queryClient.invalidateQueries({ queryKey: ['shop-brand', currentShopId] }),
        queryClient.invalidateQueries({ queryKey: ['shop-memberships'] }),
        reloadMemberships(),
      ]);
      reset(values);
    },
  });

  const onSubmit = handleSubmit((values) => updateProfile.mutate(values));

  if (profileQuery.isLoading) {
    return <Loading label="Loading shop profile" />;
  }

  if (!canEdit) {
    return (
      <PageScaffold icon={Store} title="Shop Profile" description="Faabrico branding details used by the app header, customer token, and print copies.">
        <EmptyState icon={ShieldAlert} title="Profile editing is restricted" message="Only owners and managers can update shop profile and logo details." />
      </PageScaffold>
    );
  }

  return (
    <PageScaffold icon={Store} title="Shop Profile" description="Save Faabrico business details for app branding, customer token, and print copies.">
      <form className="space-y-5 rounded-lg border border-brand-200 bg-white p-5 shadow-panel" onSubmit={onSubmit}>
        <div className="rounded-lg border border-accent-100 bg-accent-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-brand-900">Faabrico business identity</p>
          <p className="mt-1">Use these official details unless the owner changes the registered shop profile.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Company / shop name" placeholder="Faabrico" error={errors.name?.message} {...register('name')} />
          <TextField label="Shop phone" placeholder="+880 1714-793555" inputMode="tel" error={errors.phone?.message} {...register('phone')} />
          <TextField label="Logo URL" placeholder="Paste Faabrico logo URL" error={errors.logoUrl?.message} description="Optional. Header, sidebar, and print copies use the bundled Faabrico logo or Faabrico text if this URL is empty or unavailable." {...register('logoUrl')} />
          <TextAreaField label="Shop address" placeholder="5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka" rows={4} error={errors.address?.message} className="md:col-span-2" {...register('address')} />
        </div>

        {profileQuery.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{profileQuery.error.message}</p>
        ) : null}
        {updateProfile.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{updateProfile.error.message}</p>
        ) : null}
        {updateProfile.isSuccess ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800">Faabrico shop profile saved.</p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => reset(faabricoProfileDefaults)}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            Use Faabrico details
          </button>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            {updateProfile.isPending ? 'Saving profile' : 'Save profile'}
          </button>
        </div>
      </form>
    </PageScaffold>
  );
}