export const measurementKeys = {
  all: ['customer-measurements'] as const,
  customer: (shopId: string, customerId: string) => [...measurementKeys.all, shopId, customerId] as const,
  fields: (shopId: string, garmentTypeId: string) => [...measurementKeys.all, shopId, 'fields', garmentTypeId] as const,
  latest: (shopId: string, customerId: string, garmentTypeId: string) =>
    [...measurementKeys.customer(shopId, customerId), 'latest', garmentTypeId] as const,
  detail: (shopId: string, customerId: string, measurementId: string) =>
    [...measurementKeys.customer(shopId, customerId), 'detail', measurementId] as const,
  copy: (shopId: string, customerId: string, measurementId: string) =>
    [...measurementKeys.customer(shopId, customerId), 'copy', measurementId] as const,
};
