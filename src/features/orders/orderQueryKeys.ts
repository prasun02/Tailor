export const orderKeys = {
  all: ['orders'] as const,
  lists: (shopId: string) => [...orderKeys.all, shopId, 'list'] as const,
  list: (shopId: string, filters: unknown) => [...orderKeys.lists(shopId), filters] as const,
  details: (shopId: string) => [...orderKeys.all, shopId, 'detail'] as const,
  detail: (shopId: string, orderId: string) => [...orderKeys.details(shopId), orderId] as const,
  wizard: (shopId: string) => [...orderKeys.all, shopId, 'wizard'] as const,
  members: (shopId: string) => [...orderKeys.all, shopId, 'members'] as const,
  dashboard: (shopId: string) => [...orderKeys.all, shopId, 'dashboard'] as const,
  dashboardWorklists: (shopId: string) => [...orderKeys.all, shopId, 'dashboard-worklists'] as const,
  production: (shopId: string, filters: unknown) => [...orderKeys.all, shopId, 'production', filters] as const,
  deliveries: (shopId: string) => [...orderKeys.all, shopId, 'deliveries'] as const,
  due: (shopId: string, search: string) => [...orderKeys.all, shopId, 'due', search] as const,
};
