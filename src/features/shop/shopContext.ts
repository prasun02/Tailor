import { createContext, useContext } from 'react';
import type { MeasurementUnit, ShopRole } from '../../types/database';

export type ActiveShop = {
  id: string;
  name: string;
  timezone: string;
  currency: string;
  default_measurement_unit: MeasurementUnit;
  deleted_at: string | null;
};

export type ShopMembership = {
  shop_id: string;
  user_id: string;
  role: ShopRole;
  is_active: boolean;
  shop: ActiveShop;
};

export type ShopContextValue = {
  memberships: ShopMembership[];
  inactiveMemberships: ShopMembership[];
  allMemberships: ShopMembership[];
  currentMembership: ShopMembership | null;
  currentShop: ActiveShop | null;
  currentShopId: string | null;
  currentRole: ShopRole | null;
  hasMultipleShops: boolean;
  hasAnyMembership: boolean;
  hasActiveMembership: boolean;
  hasSuspendedMembership: boolean;
  isLoading: boolean;
  error: Error | null;
  reloadMemberships: () => Promise<ShopMembership[]>;
  setCurrentShopId: (shopId: string) => void;
};

export const ShopContext = createContext<ShopContextValue | null>(null);

export function useShop(): ShopContextValue {
  const value = useContext(ShopContext);

  if (!value) {
    throw new Error('useShop must be used inside ShopProvider.');
  }

  return value;
}
