export type CustomerListParams = {
  shopId: string;
  search?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};

export const customerKeys = {
  all: ['customers'] as const,
  lists: (shopId: string) => [...customerKeys.all, shopId, 'list'] as const,
  list: (params: CustomerListParams) =>
    [
      ...customerKeys.lists(params.shopId),
      {
        search: params.search?.trim() ?? '',
        includeArchived: Boolean(params.includeArchived),
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 10,
      },
    ] as const,
  details: (shopId: string) => [...customerKeys.all, shopId, 'detail'] as const,
  detail: (shopId: string, customerId: string) => [...customerKeys.details(shopId), customerId] as const,
  duplicatePhone: (shopId: string, normalizedPhone: string | null, customerId?: string) =>
    [...customerKeys.all, shopId, 'duplicate-phone', normalizedPhone ?? '', customerId ?? 'new'] as const,
};
