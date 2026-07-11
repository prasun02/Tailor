import type { Database } from '../../types/database';

export type GarmentDesign = Database['public']['Tables']['garment_designs']['Row'];

export type DesignFilters = {
  garmentTypeId?: string;
  garmentTypeIds?: string[];
  search?: string;
  activeOnly?: boolean;
  limit?: number;
};
