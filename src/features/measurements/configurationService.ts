import type { Json } from '../../types/database';
import { getSupabaseClient } from '../../services/supabaseClient';
import { optionalTrimmed } from '../customers/phone';
import type { GarmentFormValues, MeasurementFieldFormValues, StyleFieldFormValues } from './configurationSchemas';
import type { GarmentType, MeasurementField, StyleField } from './types';

const GARMENT_SELECT = 'id, shop_id, name, name_bn, code, description, sort_order, is_active, created_at, updated_at, deleted_at';
const MEASUREMENT_FIELD_SELECT =
  'id, shop_id, garment_type_id, label, label_bn, field_key, field_type, unit, placeholder, help_text, minimum_value, maximum_value, step_value, is_required, sort_order, is_active, created_at, updated_at, deleted_at';
const STYLE_FIELD_SELECT =
  'id, shop_id, garment_type_id, label, label_bn, field_key, field_type, options, is_required, sort_order, is_active, created_at, updated_at, deleted_at';

type SupabaseErrorLike = {
  code?: string;
  message: string;
};

export function getConfigurationMutationErrorMessage(error: SupabaseErrorLike): string {
  if (error.code === '23505') {
    return 'A record with this code or field key already exists for this shop and garment.';
  }

  return error.message;
}

function throwConfigurationError(error: SupabaseErrorLike): never {
  throw new Error(getConfigurationMutationErrorMessage(error));
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_');
}

function toOptionsJson(options: string[]): Json {
  return options.map((option) => option.trim()).filter(Boolean) as Json;
}

export async function listGarmentTypes(shopId: string, includeArchived = false): Promise<GarmentType[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('garment_types')
    .select(GARMENT_SELECT)
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (!includeArchived) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as GarmentType[];
}

export async function getGarmentType(shopId: string, garmentTypeId: string): Promise<GarmentType> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_types')
    .select(GARMENT_SELECT)
    .eq('shop_id', shopId)
    .eq('id', garmentTypeId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error('Garment type not found.');
  }

  return data as GarmentType;
}

export async function createGarmentType(shopId: string, values: GarmentFormValues): Promise<GarmentType> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_types')
    .insert({
      shop_id: shopId,
      name: values.name.trim(),
      name_bn: optionalTrimmed(values.nameBn),
      code: normalizeCode(values.code),
      description: optionalTrimmed(values.description),
      sort_order: values.sortOrder,
      is_active: true,
    })
    .select(GARMENT_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as GarmentType;
}

export async function updateGarmentType(shopId: string, garmentTypeId: string, values: GarmentFormValues): Promise<GarmentType> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_types')
    .update({
      name: values.name.trim(),
      name_bn: optionalTrimmed(values.nameBn),
      code: normalizeCode(values.code),
      description: optionalTrimmed(values.description),
      sort_order: values.sortOrder,
    })
    .eq('shop_id', shopId)
    .eq('id', garmentTypeId)
    .select(GARMENT_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as GarmentType;
}

export async function archiveGarmentType(shopId: string, garmentTypeId: string): Promise<GarmentType> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_types')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('id', garmentTypeId)
    .select(GARMENT_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GarmentType;
}

export async function restoreGarmentType(shopId: string, garmentTypeId: string): Promise<GarmentType> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_types')
    .update({ is_active: true, deleted_at: null })
    .eq('shop_id', shopId)
    .eq('id', garmentTypeId)
    .select(GARMENT_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as GarmentType;
}

export async function listMeasurementFields(shopId: string, garmentTypeId?: string, includeArchived = false): Promise<MeasurementField[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('measurement_fields')
    .select(MEASUREMENT_FIELD_SELECT)
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (garmentTypeId) {
    query = query.eq('garment_type_id', garmentTypeId);
  }

  if (!includeArchived) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as MeasurementField[];
}

export async function createMeasurementField(shopId: string, values: MeasurementFieldFormValues): Promise<MeasurementField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_fields')
    .insert({
      shop_id: shopId,
      garment_type_id: values.garmentTypeId,
      label: values.label.trim(),
      label_bn: optionalTrimmed(values.labelBn),
      field_key: values.fieldKey.trim(),
      field_type: values.fieldType,
      unit: values.unit || null,
      placeholder: optionalTrimmed(values.placeholder),
      help_text: optionalTrimmed(values.helpText),
      minimum_value: values.minimumValue,
      maximum_value: values.maximumValue,
      step_value: values.stepValue,
      is_required: values.isRequired,
      sort_order: values.sortOrder,
      is_active: true,
    })
    .select(MEASUREMENT_FIELD_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as MeasurementField;
}

export async function updateMeasurementField(shopId: string, fieldId: string, values: MeasurementFieldFormValues): Promise<MeasurementField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_fields')
    .update({
      garment_type_id: values.garmentTypeId,
      label: values.label.trim(),
      label_bn: optionalTrimmed(values.labelBn),
      field_type: values.fieldType,
      unit: values.unit || null,
      placeholder: optionalTrimmed(values.placeholder),
      help_text: optionalTrimmed(values.helpText),
      minimum_value: values.minimumValue,
      maximum_value: values.maximumValue,
      step_value: values.stepValue,
      is_required: values.isRequired,
      sort_order: values.sortOrder,
    })
    .eq('shop_id', shopId)
    .eq('id', fieldId)
    .select(MEASUREMENT_FIELD_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as MeasurementField;
}

export async function archiveMeasurementField(shopId: string, fieldId: string): Promise<MeasurementField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_fields')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('id', fieldId)
    .select(MEASUREMENT_FIELD_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MeasurementField;
}

export async function restoreMeasurementField(shopId: string, fieldId: string): Promise<MeasurementField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('measurement_fields')
    .update({ is_active: true, deleted_at: null })
    .eq('shop_id', shopId)
    .eq('id', fieldId)
    .select(MEASUREMENT_FIELD_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as MeasurementField;
}

export async function listStyleFields(shopId: string, garmentTypeId?: string, includeArchived = false): Promise<StyleField[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('style_fields')
    .select(STYLE_FIELD_SELECT)
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('label', { ascending: true });

  if (garmentTypeId) {
    query = query.eq('garment_type_id', garmentTypeId);
  }

  if (!includeArchived) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as StyleField[];
}

export async function createStyleField(shopId: string, values: StyleFieldFormValues): Promise<StyleField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('style_fields')
    .insert({
      shop_id: shopId,
      garment_type_id: values.garmentTypeId,
      label: values.label.trim(),
      label_bn: optionalTrimmed(values.labelBn),
      field_key: values.fieldKey.trim(),
      field_type: values.fieldType,
      options: toOptionsJson(values.options),
      is_required: values.isRequired,
      sort_order: values.sortOrder,
      is_active: true,
    })
    .select(STYLE_FIELD_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as StyleField;
}

export async function updateStyleField(shopId: string, fieldId: string, values: StyleFieldFormValues): Promise<StyleField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('style_fields')
    .update({
      garment_type_id: values.garmentTypeId,
      label: values.label.trim(),
      label_bn: optionalTrimmed(values.labelBn),
      field_type: values.fieldType,
      options: toOptionsJson(values.options),
      is_required: values.isRequired,
      sort_order: values.sortOrder,
    })
    .eq('shop_id', shopId)
    .eq('id', fieldId)
    .select(STYLE_FIELD_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as StyleField;
}

export async function archiveStyleField(shopId: string, fieldId: string): Promise<StyleField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('style_fields')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('id', fieldId)
    .select(STYLE_FIELD_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as StyleField;
}

export async function restoreStyleField(shopId: string, fieldId: string): Promise<StyleField> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('style_fields')
    .update({ is_active: true, deleted_at: null })
    .eq('shop_id', shopId)
    .eq('id', fieldId)
    .select(STYLE_FIELD_SELECT)
    .single();

  if (error) {
    throwConfigurationError(error);
  }

  return data as StyleField;
}
