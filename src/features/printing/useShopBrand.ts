import { useQuery } from '@tanstack/react-query';
import { getSupabaseClient } from '../../services/supabaseClient';
import type { ActiveShop } from '../shop/shopContext';
import { fallbackShopBrand, withShopBrandDefaults, type ShopBrand } from './printModel';

export function useShopBrand(shopId: string | null, currentShop: ActiveShop | null) {
  return useQuery({
    queryKey: ['shop-brand', shopId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('shops')
        .select('name, phone, address, logo_url')
        .eq('id', shopId ?? '')
        .maybeSingle();

      if (error) throw new Error(error.message);

      return withShopBrandDefaults((data as ShopBrand | null) ?? fallbackShopBrand(currentShop?.name));
    },
    enabled: Boolean(shopId),
  });
}

export function resolveShopBrand(data: ShopBrand | undefined | null, currentShop: ActiveShop | null): ShopBrand {
  return withShopBrandDefaults(data ?? fallbackShopBrand(currentShop?.name));
}
