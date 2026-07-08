import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type PropsWithChildren } from 'react';
import { getSupabaseClient } from '../../services/supabaseClient';
import type { MeasurementUnit, ShopRole } from '../../types/database';
import { useAuth } from '../auth/authContext';
import { ShopContext, type ShopMembership } from './shopContext';

const STORAGE_KEY = 'tailor-store-manager:selected-shop-id';
const EMPTY_MEMBERSHIPS: ShopMembership[] = [];

type MembershipRow = {
  shop_id: string;
  user_id: string;
  role: ShopRole;
  is_active: boolean;
  shop_name: string;
  timezone: string;
  currency: string;
  default_measurement_unit: MeasurementUnit;
};

function normalizeMembership(row: MembershipRow): ShopMembership {
  return {
    shop_id: row.shop_id,
    user_id: row.user_id,
    role: row.role,
    is_active: row.is_active,
    shop: {
      id: row.shop_id,
      name: row.shop_name,
      timezone: row.timezone,
      currency: row.currency,
      default_measurement_unit: row.default_measurement_unit,
      deleted_at: null,
    },
  };
}

async function loadMemberships(): Promise<ShopMembership[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_current_user_shop_memberships');

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as unknown as MembershipRow[]).map(normalizeMembership);
}

export function ShopProvider({ children }: PropsWithChildren) {
  const { user, isConfigured } = useAuth();
  const [selectedShopId, setSelectedShopIdState] = useState(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(STORAGE_KEY);
  });

  const membershipsQuery = useQuery({
    queryKey: ['shop-memberships', user?.id],
    queryFn: loadMemberships,
    enabled: isConfigured && Boolean(user?.id),
    staleTime: 60_000,
  });

  const allMemberships = membershipsQuery.data ?? EMPTY_MEMBERSHIPS;
  const memberships = useMemo(
    () => allMemberships.filter((membership) => membership.is_active),
    [allMemberships],
  );
  const inactiveMemberships = useMemo(
    () => allMemberships.filter((membership) => !membership.is_active),
    [allMemberships],
  );
  const currentMembership =
    memberships.find((membership) => membership.shop_id === selectedShopId) ?? memberships[0] ?? null;
  const error = membershipsQuery.error instanceof Error ? membershipsQuery.error : null;
  const isLoading = Boolean(user?.id) && (membershipsQuery.isLoading || membershipsQuery.isFetching);
  const reloadMemberships = membershipsQuery.refetch;

  const value = useMemo(
    () => ({
      memberships,
      inactiveMemberships,
      allMemberships,
      currentMembership,
      currentShop: currentMembership?.shop ?? null,
      currentShopId: currentMembership?.shop_id ?? null,
      currentRole: currentMembership?.role ?? null,
      hasMultipleShops: memberships.length > 1,
      hasAnyMembership: allMemberships.length > 0,
      hasActiveMembership: memberships.length > 0,
      hasSuspendedMembership: allMemberships.length > 0 && memberships.length === 0,
      isLoading,
      error,
      reloadMemberships: async () => {
        const result = await reloadMemberships();

        if (result.error) {
          throw result.error;
        }

        return result.data ?? [];
      },
      setCurrentShopId: (shopId: string) => {
        window.localStorage.setItem(STORAGE_KEY, shopId);
        setSelectedShopIdState(shopId);
      },
    }),
    [
      allMemberships,
      currentMembership,
      error,
      inactiveMemberships,
      isLoading,
      memberships,
      reloadMemberships,
    ],
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

