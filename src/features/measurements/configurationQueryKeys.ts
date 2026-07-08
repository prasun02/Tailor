export const configurationKeys = {
  all: ['configuration'] as const,
  garments: (shopId: string, includeArchived = false) => [...configurationKeys.all, shopId, 'garments', includeArchived] as const,
  garment: (shopId: string, garmentTypeId: string) => [...configurationKeys.all, shopId, 'garment', garmentTypeId] as const,
  measurementFields: (shopId: string, garmentTypeId?: string, includeArchived = false) =>
    [...configurationKeys.all, shopId, 'measurement-fields', garmentTypeId ?? 'all', includeArchived] as const,
  styleFields: (shopId: string, garmentTypeId?: string, includeArchived = false) =>
    [...configurationKeys.all, shopId, 'style-fields', garmentTypeId ?? 'all', includeArchived] as const,
};
