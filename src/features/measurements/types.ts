import type { Customer } from '../customers/customerService';
import type { Database } from '../../types/database';

export type GarmentType = Database['public']['Tables']['garment_types']['Row'];
export type MeasurementField = Database['public']['Tables']['measurement_fields']['Row'];
export type StyleField = Database['public']['Tables']['style_fields']['Row'];
export type MeasurementSet = Database['public']['Tables']['measurement_sets']['Row'];

export type MeasurementSetWithGarment = MeasurementSet & {
  garmentName: string;
  garmentCode: string;
};

export type CustomerMeasurementContext = {
  customer: Customer;
  measurements: MeasurementSetWithGarment[];
};
