export type DisplayEntry = {
  key: string;
  label: string;
  value: string;
};

export type OrderItemDisplaySource = {
  design_reference_url?: string | null;
  fabric_reference_url?: string | null;
  preview_video_url?: string | null;
  design_snapshot?: unknown;
  preview_summary?: unknown;
};

export type OrderItemDesignDisplay = {
  name: string;
  code: string | null;
  category: string | null;
  designImageUrl: string | null;
  fabricImageUrl: string | null;
  fabricStatus: 'Added' | 'Skipped';
  previewVideoUrl: string | null;
};

const technicalKeys = [
  'id',
  'shop_id',
  'shopId',
  'order_id',
  'orderId',
  'customer_id',
  'customerId',
  'garment_type_id',
  'garmentTypeId',
  'design_id',
  'designId',
  'measurement_set_id',
  'measurementSetId',
  'created_at',
  'createdAt',
  'updated_at',
  'updatedAt',
  'deleted_at',
  'deletedAt',
  'measurement_count',
  'measurementCount',
  'style_count',
  'styleCount',
];

const mediaKeys = [
  'preview_image_url',
  'previewImageUrl',
  'design_image_url',
  'designImageUrl',
  'design_reference_url',
  'designReferenceUrl',
  'fabric_reference_url',
  'fabricReferenceUrl',
  'cloth_reference_url',
  'clothReferenceUrl',
  'preview_video_url',
  'previewVideoUrl',
  'logo_url',
  'logoUrl',
];

const technicalKeySet = normalizedKeySet(technicalKeys);
const mediaKeySet = normalizedKeySet(mediaKeys);

const labelOverrides = new Map<string, string>([
  ['designimageurl', 'Design Image'],
  ['fabricreferenceurl', 'Fabric Reference'],
  ['garmenttype', 'Garment Type'],
  ['stylecount', 'Style Count'],
  ['estimatedfit', 'Estimated Fit'],
  ['keymeasurements', 'Key Measurements'],
  ['stylesummary', 'Style Choices'],
  ['visualnotes', 'Visual Notes'],
  ['fabricreferencestatus', 'Fabric Reference'],
  ['previewvideourl', 'Preview Video'],
]);


function normalizedKeySet(keys: string[]): Set<string> {
  return new Set(keys.flatMap((key) => [normalizedDisplayKey(key), compactDisplayKey(key)]));
}

export function normalizedDisplayKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function compactDisplayKey(key: string): string {
  return normalizedDisplayKey(key).replace(/_/g, '');
}

function keyMatches(key: string, candidates: Set<string>): boolean {
  return candidates.has(normalizedDisplayKey(key)) || candidates.has(compactDisplayKey(key));
}

export function labelFromKey(key: string): string {
  const override = labelOverrides.get(compactDisplayKey(key));
  if (override) return override;

  const normalized = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return 'Value';

  return normalized
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function recordFromUnknown(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function recordOrNull(value: unknown): Record<string, unknown> | null {
  const record = recordFromUnknown(value);
  return Object.keys(record).length > 0 ? record : null;
}

export function valueFromRecord(record: Record<string, unknown>, keys: string[]): unknown {
  const requestedKeys = normalizedKeySet(keys);

  for (const key of keys) {
    if (record[key] !== undefined) {
      return record[key];
    }
  }

  for (const [key, value] of Object.entries(record)) {
    if (keyMatches(key, requestedKeys)) {
      return value;
    }
  }

  return undefined;
}

export function stringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
  const value = valueFromRecord(record, keys);

  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isLikelyUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}

function isHiddenKey(key: string, hiddenKeys?: Set<string>): boolean {
  return keyMatches(key, technicalKeySet) || keyMatches(key, mediaKeySet) || Boolean(hiddenKeys && keyMatches(key, hiddenKeys));
}

function displayNestedRecord(record: Record<string, unknown>, depth: number): string {
  const label = stringFromRecord(record, ['label', 'name', 'key', 'title']);
  const value = valueFromRecord(record, ['value', 'display_value', 'displayValue', 'amount']);
  const display = displayValue(value, undefined, depth + 1);

  if (label && display) {
    return `${label}: ${display}`;
  }

  return displayEntries(record, { depth: depth + 1 })
    .map((entry) => `${entry.label}: ${entry.value}`)
    .join(', ');
}

export function displayValue(value: unknown, key?: string, depth = 0): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';
    if (key && keyMatches(key, mediaKeySet) && isLikelyUrl(trimmed)) return '';
    return trimmed;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : '';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => displayValue(entry, undefined, depth + 1))
      .filter(Boolean)
      .join('; ');
  }

  if (depth >= 3) {
    return '';
  }

  const record = recordOrNull(value);
  return record ? displayNestedRecord(record, depth) : '';
}

export function displayEntries(
  values: Record<string, unknown>,
  options: { hiddenKeys?: string[]; depth?: number } = {},
): DisplayEntry[] {
  const hiddenKeys = options.hiddenKeys ? normalizedKeySet(options.hiddenKeys) : undefined;
  const depth = options.depth ?? 0;

  return Object.entries(values)
    .filter(([key]) => !isHiddenKey(key, hiddenKeys))
    .map(([key, value]) => ({
      key,
      label: labelFromKey(key),
      value: displayValue(value, key, depth),
    }))
    .filter((entry) => entry.value.trim().length > 0);
}

function addPreviewEntry(entries: DisplayEntry[], key: string, label: string, value: unknown) {
  const display = displayValue(value, key);

  if (!display || entries.some((entry) => entry.label === label && entry.value === display)) {
    return;
  }

  entries.push({ key, label, value: display });
}

export function previewSummaryEntries(summary: Record<string, unknown>): DisplayEntry[] {
  const entries: DisplayEntry[] = [];
  const fabricStatus = stringFromRecord(summary, ['fabricReferenceStatus', 'fabric_reference_status'])
    ?? (stringFromRecord(summary, ['fabricReferenceUrl', 'fabric_reference_url']) ? 'Added' : null);

  addPreviewEntry(entries, 'estimatedFit', 'Estimated Fit', valueFromRecord(summary, ['estimatedFit', 'estimated_fit', 'fit']));
  addPreviewEntry(entries, 'keyMeasurements', 'Key Measurements', valueFromRecord(summary, ['keyMeasurements', 'key_measurements', 'measurement_summary']));
  addPreviewEntry(entries, 'styleSummary', 'Style Choices', valueFromRecord(summary, ['styleSummary', 'style_summary']));
  addPreviewEntry(entries, 'fabricReferenceStatus', 'Fabric Reference', fabricStatus);
  addPreviewEntry(entries, 'visualNotes', 'Visual Notes', valueFromRecord(summary, ['visualNotes', 'visual_notes']));
  addPreviewEntry(entries, 'warning', 'Preview Note', valueFromRecord(summary, ['warning']));

  if (entries.length > 0) {
    return entries;
  }

  return displayEntries(summary, {
    hiddenKeys: ['garmentType', 'garment', 'selectedDesign', 'design', 'styleCategory'],
  });
}

export function designDisplayForOrderItem(item: OrderItemDisplaySource): OrderItemDesignDisplay {
  const design = recordFromUnknown(item.design_snapshot);
  const previewSummary = recordFromUnknown(item.preview_summary);
  const name =
    stringFromRecord(design, ['design_name', 'name', 'selectedDesign', 'selected_design', 'design']) ??
    stringFromRecord(previewSummary, ['selectedDesign', 'selected_design', 'design']) ??
    'Custom design';
  const code = stringFromRecord(design, ['design_code', 'code']);
  const category =
    stringFromRecord(design, ['style_category', 'styleCategory', 'category']) ??
    stringFromRecord(previewSummary, ['styleCategory', 'style_category', 'category']);
  const designImageUrl =
    item.design_reference_url?.trim() ||
    stringFromRecord(design, ['preview_image_url', 'previewImageUrl', 'designImageUrl', 'design_image_url']) ||
    stringFromRecord(previewSummary, ['designImageUrl', 'design_image_url', 'previewImageUrl', 'preview_image_url']) ||
    null;
  const fabricImageUrl =
    item.fabric_reference_url?.trim() ||
    stringFromRecord(previewSummary, ['fabricReferenceUrl', 'fabric_reference_url', 'clothReferenceUrl', 'cloth_reference_url']) ||
    null;
  const previewVideoUrl =
    item.preview_video_url?.trim() ||
    stringFromRecord(design, ['preview_video_url', 'previewVideoUrl']) ||
    stringFromRecord(previewSummary, ['previewVideoUrl', 'preview_video_url']) ||
    null;

  return {
    name,
    code,
    category,
    designImageUrl,
    fabricImageUrl,
    fabricStatus: fabricImageUrl ? 'Added' : 'Skipped',
    previewVideoUrl,
  };
}

