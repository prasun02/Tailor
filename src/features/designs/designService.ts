import type { Json } from '../../types/database';
import { getSupabaseClient } from '../../services/supabaseClient';
import { optionalTrimmed } from '../customers/phone';
import { normalizeCustomerSearch } from '../customers/search';
import type { DesignFormValues } from './designSchemas';
import type { DesignFilters, GarmentDesign } from './types';

const DESIGN_SELECT =
  'id, shop_id, garment_type_id, design_name, design_code, style_category, preview_image_url, preview_video_url, cloth_reference_url, tags, description, style_metadata, sort_order, is_active, created_by, created_at, updated_at, deleted_at';

type SupabaseErrorLike = {
  code?: string;
  message: string;
};

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_');
}

function tagsFromText(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function metadataFromText(value: string | null | undefined): Json {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return {};
  }

  const parsed = JSON.parse(trimmed) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Style metadata must be a JSON object.');
  }

  return parsed as Record<string, Json>;
}

function getDesignMutationErrorMessage(error: SupabaseErrorLike): string {
  if (error.code === '23505') {
    return 'A design with this code already exists for this shop.';
  }

  return error.message;
}

function throwDesignError(error: SupabaseErrorLike): never {
  throw new Error(getDesignMutationErrorMessage(error));
}

export function designToFormValues(design: GarmentDesign): DesignFormValues {
  return {
    garmentTypeId: design.garment_type_id,
    name: design.design_name,
    code: design.design_code,
    description: design.description ?? '',
    styleCategory: design.style_category ?? '',
    previewImageUrl: design.preview_image_url ?? '',
    previewVideoUrl: design.preview_video_url ?? '',
    clothReferenceUrl: design.cloth_reference_url ?? '',
    tagsText: design.tags.join(', '),
    styleMetadataText: JSON.stringify(design.style_metadata ?? {}, null, 2),
    isActive: design.is_active && !design.deleted_at,
    sortOrder: design.sort_order,
  };
}

export async function listGarmentDesigns(shopId: string, filters: DesignFilters = {}): Promise<GarmentDesign[]> {
  const supabase = getSupabaseClient();
  const limit = Math.min(Math.max(filters.limit ?? 80, 1), 200);
  let query = supabase
    .from('garment_designs')
    .select(DESIGN_SELECT)
    .eq('shop_id', shopId)
    .order('sort_order', { ascending: true })
    .order('design_name', { ascending: true })
    .limit(limit);

  if (filters.garmentTypeId) {
    query = query.eq('garment_type_id', filters.garmentTypeId);
  }

  if (filters.garmentTypeIds && filters.garmentTypeIds.length > 0) {
    query = query.in('garment_type_id', filters.garmentTypeIds);
  }

  if (filters.activeOnly ?? true) {
    query = query.eq('is_active', true).is('deleted_at', null);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const designs = (data ?? []) as GarmentDesign[];
  const normalizedSearch = normalizeCustomerSearch(filters.search ?? '');

  if (!normalizedSearch) {
    return designs;
  }

  return designs.filter((design) => {
    const haystack = [
      design.design_name,
      design.design_code,
      design.style_category,
      design.description,
      ...design.tags,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(normalizedSearch);
  });
}

export async function createGarmentDesign(shopId: string, values: DesignFormValues): Promise<GarmentDesign> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_designs')
    .insert({
      shop_id: shopId,
      garment_type_id: values.garmentTypeId,
      design_name: values.name.trim(),
      design_code: normalizeCode(values.code),
      description: optionalTrimmed(values.description),
      style_category: optionalTrimmed(values.styleCategory),
      preview_image_url: optionalTrimmed(values.previewImageUrl),
      preview_video_url: optionalTrimmed(values.previewVideoUrl),
      cloth_reference_url: optionalTrimmed(values.clothReferenceUrl),
      style_metadata: metadataFromText(values.styleMetadataText),
      tags: tagsFromText(values.tagsText),
      is_active: values.isActive,
      sort_order: values.sortOrder,
      deleted_at: values.isActive ? null : new Date().toISOString(),
    })
    .select(DESIGN_SELECT)
    .single();

  if (error) {
    throwDesignError(error);
  }

  return data as GarmentDesign;
}

export async function updateGarmentDesign(shopId: string, designId: string, values: DesignFormValues): Promise<GarmentDesign> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
      .from('garment_designs')
    .update({
      garment_type_id: values.garmentTypeId,
      design_name: values.name.trim(),
      design_code: normalizeCode(values.code),
      description: optionalTrimmed(values.description),
      style_category: optionalTrimmed(values.styleCategory),
      preview_image_url: optionalTrimmed(values.previewImageUrl),
      preview_video_url: optionalTrimmed(values.previewVideoUrl),
      cloth_reference_url: optionalTrimmed(values.clothReferenceUrl),
      style_metadata: metadataFromText(values.styleMetadataText),
      tags: tagsFromText(values.tagsText),
      is_active: values.isActive,
      sort_order: values.sortOrder,
      deleted_at: values.isActive ? null : new Date().toISOString(),
    })
    .eq('shop_id', shopId)
    .eq('id', designId)
    .select(DESIGN_SELECT)
    .single();

  if (error) {
    throwDesignError(error);
  }

  return data as GarmentDesign;
}

export async function archiveGarmentDesign(shopId: string, designId: string): Promise<GarmentDesign> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_designs')
    .update({ is_active: false, deleted_at: new Date().toISOString() })
    .eq('shop_id', shopId)
    .eq('id', designId)
    .select(DESIGN_SELECT)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as GarmentDesign;
}

export async function restoreGarmentDesign(shopId: string, designId: string): Promise<GarmentDesign> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('garment_designs')
    .update({ is_active: true, deleted_at: null })
    .eq('shop_id', shopId)
    .eq('id', designId)
    .select(DESIGN_SELECT)
    .single();

  if (error) {
    throwDesignError(error);
  }

  return data as GarmentDesign;
}
