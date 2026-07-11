import type { DesignFilters } from './types';

export const designKeys = {
  all: ['designs'] as const,
  lists: (shopId: string) => [...designKeys.all, shopId, 'list'] as const,
  list: (shopId: string, filters: DesignFilters) => [...designKeys.lists(shopId), filters] as const,
};
