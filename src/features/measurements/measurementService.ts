import type { Json, MeasurementUnit } from '../../types/database';
import { getSupabaseClient } from '../../services/supabaseClient';
import { getCustomer, type Customer } from '../customers/customerService';
import { normalizeDynamicValueMap, type DynamicValueMap } from './dynamicValidation';
import type { GarmentType, MeasurementField, MeasurementSet, MeasurementSetWithGarment } from './types';

const MEASUREMENT_SELECT =
  'id, shop_id, customer_id, garment_type_id, version_number, unit, values, notes, measured_at, measured_by, is_current, created_at';
const GARMENT_SELECT = 'id, shop_id, name, name_bn, code, description, sort_order, is_active, created_at, updated_at, deleted_at';
const MEASUREMENT_FIELD_SELECT =
  'id, shop_id, garment_type_id, label, label_bn, field_key, field_type, unit, placeholder, help_text, minimum_value, maximum_value, step_value, is_required, sort_order, is_active, created_at, updated_at, deleted_at';

export type MeasurementDetail = {
  customer: Customer;
  measurement: MeasurementSetWithGarment;
  garment: GarmentType;
  fields: MeasurementField[];
  versionHistory: MeasurementSetWithGarment[];
};

export type NewMeasurementContext = {
  customer: Customer;
  garments: GarmentType[];
};

function asValueObject(values: Json): Record<string, unknown> {
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    return {};
  }

  return values as Record<string, unknown>;
}

function addGarmentNames(measurements: MeasurementSet[], garments: GarmentType[]): MeasurementSetWithGarment[] {
  const garmentById = new Map(garments.map((garment) => [garment.id, garment]));

  return measurements.map((measurement) => {
    const garment = garmentById.get(measurement.garment_type_id);

    return {
      ...measurement,
      garmentName: garment?.name ?? 'Unknown garment',
      garmentCode: garment?.code ?? 'UNKNOWN',
    };
  });
}

export async function listCustomerMeasurementContext(shopId: string, customerId: string) {
  const supabase = getSupabaseClient();
  const [customerProfile, garmentsResult, measurementsResult] = await Promise.all([
    getCustomer(shopId, customerId),
    supabase.from('garment_types').select(GARMENT_SELECT).eq('shop_id', shopId),
    supabase
      .from('measurement_sets')
      .select(MEASUREMENT_SELECT)
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .order('garment_type_id', { ascending: true })
      .order('version_number', { ascending: false }),
  ]);

  if (garmentsResult.error) {
    throw new Error(garmentsResult.error.message);
  }

  if (measurementsResult.error) {
    throw new Error(measurementsResult.error.message);
  }

  return {
    customer: customerProfile.customer,
    measurements: addGarmentNames((measurementsResult.data ?? []) as MeasurementSet[], (garmentsResult.data ?? []) as GarmentType[]),
  };
}

export async function getNewMeasurementContext(shopId: string, customerId: string): Promise<NewMeasurementContext> {
  const [customerProfile, garments] = await Promise.all([getCustomer(shopId, customerId), listActiveGarmentsForMeasurements(shopId)]);

  return {
    customer: customerProfile.customer,
    garments,
  };
}

export async function listActiveGarmentsForMeasurements(shopId: string): Promise<GarmentType[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_types')
    .select(GARMENT_SELECT)
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GarmentType[];
}

export async function listActiveMeasurementFields(shopId: string, garmentTypeId: string): Promise<MeasurementField[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_fields')
    .select(MEASUREMENT_FIELD_SELECT)
    .eq('shop_id', shopId)
    .eq('garment_type_id', garmentTypeId)
    .eq('is_active', true)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MeasurementField[];
}

export async function getLatestMeasurementForGarment(
  shopId: string,
  customerId: string,
  garmentTypeId: string,
): Promise<MeasurementSet | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_sets')
    .select(MEASUREMENT_SELECT)
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .eq('garment_type_id', garmentTypeId)
    .eq('is_current', true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as MeasurementSet | null) ?? null;
}

export async function getMeasurementDetail(shopId: string, customerId: string, measurementId: string): Promise<MeasurementDetail> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_sets')
    .select(MEASUREMENT_SELECT)
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .eq('id', measurementId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Measurement version not found.');
  }

  const measurement = data as MeasurementSet;
  const [customerProfile, garmentResult, fieldsResult, historyResult] = await Promise.all([
    getCustomer(shopId, customerId),
    supabase.from('garment_types').select(GARMENT_SELECT).eq('shop_id', shopId).eq('id', measurement.garment_type_id).maybeSingle(),
    supabase
      .from('measurement_fields')
      .select(MEASUREMENT_FIELD_SELECT)
      .eq('shop_id', shopId)
      .eq('garment_type_id', measurement.garment_type_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('measurement_sets')
      .select(MEASUREMENT_SELECT)
      .eq('shop_id', shopId)
      .eq('customer_id', customerId)
      .eq('garment_type_id', measurement.garment_type_id)
      .order('version_number', { ascending: false }),
  ]);

  if (garmentResult.error) {
    throw new Error(garmentResult.error.message);
  }

  if (!garmentResult.data) {
    throw new Error('Garment type not found for this measurement.');
  }

  if (fieldsResult.error) {
    throw new Error(fieldsResult.error.message);
  }

  if (historyResult.error) {
    throw new Error(historyResult.error.message);
  }

  const garment = garmentResult.data as GarmentType;

  return {
    customer: customerProfile.customer,
    garment,
    fields: (fieldsResult.data ?? []) as MeasurementField[],
    measurement: addGarmentNames([measurement], [garment])[0],
    versionHistory: addGarmentNames((historyResult.data ?? []) as MeasurementSet[], [garment]),
  };
}

export async function getMeasurementValuesForCopy(shopId: string, customerId: string, measurementId: string): Promise<DynamicValueMap> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_sets')
    .select('values')
    .eq('shop_id', shopId)
    .eq('customer_id', customerId)
    .eq('id', measurementId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return normalizeDynamicValueMap(data?.values);
}

export async function createMeasurementVersion(params: {
  shopId: string;
  customerId: string;
  garmentTypeId: string;
  unit: MeasurementUnit;
  values: Record<string, unknown>;
  notes?: string | null;
}): Promise<MeasurementSet> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('create_measurement_version', {
    target_shop_id: params.shopId,
    target_customer_id: params.customerId,
    target_garment_type_id: params.garmentTypeId,
    target_unit: params.unit,
    measurement_values: params.values as Json,
    measurement_notes: params.notes ?? null,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as MeasurementSet;
}

export function getMeasurementValueObject(measurement: MeasurementSet): Record<string, unknown> {
  return asValueObject(measurement.values);
}
