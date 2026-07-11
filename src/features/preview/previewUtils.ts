import type { Json } from '../../types/database';
import type { GarmentDesign } from '../designs/types';
import type { MeasurementSet } from '../measurements/types';
import type { OrderItemFormValues } from '../orders/orderSchemas';

export type PreviewRecord = Record<string, unknown>;

export type PreviewMeasurement = {
  key: string;
  label: string;
  value: string;
};

export type PreviewMetadata = {
  garmentType: string;
  selectedDesign: string;
  styleCategory: string | null;
  designImageUrl: string | null;
  fabricReferenceUrl: string | null;
  fabricReferenceStatus: 'Added' | 'Skipped';
  previewVideoUrl: string | null;
  estimatedFit: string;
  keyMeasurements: PreviewMeasurement[];
  styleSummary: string[];
  visualNotes: string[];
  measurementCount: number;
  styleCount: number;
  warning: string;
};

export const ESTIMATED_PREVIEW_WARNING = 'Estimated preview only. Final fitting depends on tailoring.';

const garmentMeasurementPriority: Record<string, string[]> = {
  shirt: ['chest', 'body_chest', 'waist', 'shirt_length', 'length', 'sleeve_length', 'shoulder'],
  pant: ['waist', 'pant_length', 'length', 'thigh', 'bottom', 'hip', 'inseam'],
  panjabi: ['length', 'panjabi_length', 'chest', 'shoulder', 'sleeve_length', 'collar'],
};

export function recordFromUnknown(value: unknown): PreviewRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as PreviewRecord;
}

function displayPreviewValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(displayPreviewValue).filter(Boolean).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return '';
  }

  return String(value);
}

function isVisibleValue(value: unknown): boolean {
  return displayPreviewValue(value).trim().length > 0;
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizedKey(key: string): string {
  return key.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function prioritizedMeasurementKeys(garmentName: string): string[] {
  const normalizedGarment = garmentName.toLowerCase();

  if (normalizedGarment.includes('pant') || normalizedGarment.includes('trouser')) {
    return garmentMeasurementPriority.pant;
  }

  if (normalizedGarment.includes('panjabi') || normalizedGarment.includes('punjabi') || normalizedGarment.includes('kurta')) {
    return garmentMeasurementPriority.panjabi;
  }

  if (normalizedGarment.includes('shirt')) {
    return garmentMeasurementPriority.shirt;
  }

  return ['chest', 'waist', 'length', 'shoulder', 'sleeve_length', 'hip', 'bottom'];
}

function visibleEntries(values: PreviewRecord): [string, unknown][] {
  return Object.entries(values).filter(([, value]) => isVisibleValue(value));
}

function keyMatchesCandidate(key: string, candidate: string): boolean {
  const normalized = normalizedKey(key);
  const normalizedCandidate = normalizedKey(candidate);

  return normalized === normalizedCandidate || normalized.endsWith(`_${normalizedCandidate}`) || normalized.includes(normalizedCandidate);
}

function keyMeasurementsForPreview(garmentName: string, measurementValues: PreviewRecord, limit = 6): PreviewMeasurement[] {
  const entries = visibleEntries(measurementValues);
  const usedKeys = new Set<string>();
  const selected: PreviewMeasurement[] = [];

  for (const candidate of prioritizedMeasurementKeys(garmentName)) {
    const match = entries.find(([key]) => !usedKeys.has(key) && keyMatchesCandidate(key, candidate));
    if (!match) continue;

    const [key, value] = match;
    usedKeys.add(key);
    selected.push({ key, label: labelFromKey(key), value: displayPreviewValue(value) });

    if (selected.length >= limit) return selected;
  }

  for (const [key, value] of entries) {
    if (usedKeys.has(key)) continue;

    selected.push({ key, label: labelFromKey(key), value: displayPreviewValue(value) });
    if (selected.length >= limit) return selected;
  }

  return selected;
}

function normalizeFitLabel(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (/fit/i.test(trimmed)) {
    return trimmed;
  }

  return `${trimmed} fit`;
}

function stringFromRecord(record: PreviewRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function numberFromRecord(record: PreviewRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export function fitLabelForPreview(
  design: GarmentDesign | null | undefined,
  styleValues: PreviewRecord,
  measurementValues: PreviewRecord,
): string {
  const metadata = recordFromUnknown(design?.style_metadata as Json | undefined);
  const explicitFit = stringFromRecord(styleValues, ['fit', 'fit_type', 'fit_style'])
    ?? stringFromRecord(metadata, ['fit', 'fit_type', 'fit_style']);

  if (explicitFit) {
    return normalizeFitLabel(explicitFit);
  }

  const chest = numberFromRecord(measurementValues, ['chest', 'body_chest', 'bust']);
  const waist = numberFromRecord(measurementValues, ['waist']);

  if (chest && waist) {
    const difference = chest - waist;
    if (difference >= 8) return 'Slim fit';
    if (difference <= 2) return 'Loose fit';
  }

  return 'Regular fit';
}

function styleSummaryForPreview(styleValues: PreviewRecord, limit = 8): string[] {
  return visibleEntries(styleValues)
    .filter(([key]) => !['preview_image_url', 'preview_video_url', 'cloth_reference_url'].includes(normalizedKey(key)))
    .slice(0, limit)
    .map(([key, value]) => `${labelFromKey(key)}: ${displayPreviewValue(value)}`);
}

function visualNotesForPreview({
  fit,
  styleValues,
  fabricReferenceUrl,
}: {
  fit: string;
  styleValues: PreviewRecord;
  fabricReferenceUrl: string | null;
}): string[] {
  const notes = new Set<string>();
  const sleeve = stringFromRecord(styleValues, ['sleeve', 'sleeve_type', 'sleeve_style']);
  const collar = stringFromRecord(styleValues, ['collar', 'collar_type', 'neck']);
  const pocket = stringFromRecord(styleValues, ['pocket', 'pocket_type', 'pocket_style']);
  const bottom = stringFromRecord(styleValues, ['bottom', 'bottom_type', 'bottom_style']);
  const pleat = stringFromRecord(styleValues, ['pleat', 'pleat_type']);

  notes.add(fit);
  if (sleeve) notes.add(`${sleeve} selected`);
  if (collar) notes.add(`${collar} collar`);
  if (pocket) notes.add(`${pocket} pocket style`);
  if (bottom) notes.add(`${bottom} bottom style`);
  if (pleat) notes.add(`${pleat} pleat style`);
  notes.add(fabricReferenceUrl ? 'Customer fabric reference added' : 'Fabric reference skipped');

  return Array.from(notes).slice(0, 6);
}

function stringListFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (typeof entry === 'string') return entry.trim();
      return '';
    })
    .filter(Boolean);
}

function measurementsFromUnknown(value: unknown): PreviewMeasurement[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      return [];
    }

    const record = entry as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const displayValue = typeof record.value === 'string' ? record.value.trim() : displayPreviewValue(record.value);

    if (!label || !displayValue) {
      return [];
    }

    return [{ key: typeof record.key === 'string' ? record.key : label, label, value: displayValue }];
  });
}

function measurementsFromSummaryStrings(value: unknown): PreviewMeasurement[] {
  return stringListFromUnknown(value).flatMap((entry) => {
    const [labelPart, ...valueParts] = entry.split(':');
    const label = labelPart?.trim() ?? '';
    const displayValue = valueParts.join(':').trim();

    if (!label || !displayValue) {
      return [];
    }

    return [{ key: normalizedKey(label), label, value: displayValue }];
  });
}

export function buildPreviewMetadata({
  garmentName,
  designName,
  styleCategory,
  designImageUrl,
  fabricReferenceUrl,
  previewVideoUrl,
  measurementValues,
  styleValues,
  previewSummary = {},
}: {
  garmentName: string;
  designName?: string | null;
  styleCategory?: string | null;
  designImageUrl?: string | null;
  fabricReferenceUrl?: string | null;
  previewVideoUrl?: string | null;
  measurementValues: PreviewRecord;
  styleValues: PreviewRecord;
  previewSummary?: PreviewRecord;
}): PreviewMetadata {
  const storedMeasurements = measurementsFromUnknown(previewSummary.keyMeasurements);
  const storedSnakeMeasurements = storedMeasurements.length > 0 ? storedMeasurements : measurementsFromUnknown(previewSummary.key_measurements);
  const storedSummaryMeasurements = storedSnakeMeasurements.length > 0 ? storedSnakeMeasurements : measurementsFromSummaryStrings(previewSummary.measurement_summary);
  const keyMeasurements = storedMeasurements.length > 0
    ? storedMeasurements
    : storedSummaryMeasurements.length > 0
      ? storedSummaryMeasurements
    : keyMeasurementsForPreview(garmentName, measurementValues);
  const storedStyles = stringListFromUnknown(previewSummary.styleSummary);
  const storedSnakeStyles = storedStyles.length > 0 ? storedStyles : stringListFromUnknown(previewSummary.style_summary);
  const styleSummary = storedStyles.length > 0
    ? storedStyles
    : storedSnakeStyles.length > 0
      ? storedSnakeStyles
      : styleSummaryForPreview(styleValues);
  const summaryFit = typeof previewSummary.estimatedFit === 'string'
    ? previewSummary.estimatedFit
    : typeof previewSummary.fit === 'string'
      ? previewSummary.fit
      : '';
  const estimatedFit = normalizeFitLabel(summaryFit || stringFromRecord(styleValues, ['fit', 'fit_type', 'fit_style']) || 'Regular fit');
  const normalizedFabricUrl = fabricReferenceUrl?.trim() || null;
  const storedNotes = stringListFromUnknown(previewSummary.visualNotes);
  const storedSnakeNotes = storedNotes.length > 0 ? storedNotes : stringListFromUnknown(previewSummary.visual_notes);
  const visualNotes = storedNotes.length > 0
    ? storedNotes
    : storedSnakeNotes.length > 0
      ? storedSnakeNotes
    : visualNotesForPreview({ fit: estimatedFit, styleValues, fabricReferenceUrl: normalizedFabricUrl });

  return {
    garmentType: garmentName,
    selectedDesign: designName?.trim() || 'No selected design',
    styleCategory: styleCategory?.trim() || null,
    designImageUrl: designImageUrl?.trim() || null,
    fabricReferenceUrl: normalizedFabricUrl,
    fabricReferenceStatus: normalizedFabricUrl ? 'Added' : 'Skipped',
    previewVideoUrl: previewVideoUrl?.trim() || null,
    estimatedFit,
    keyMeasurements,
    styleSummary,
    visualNotes,
    measurementCount: visibleEntries(measurementValues).length,
    styleCount: visibleEntries(styleValues).length,
    warning: ESTIMATED_PREVIEW_WARNING,
  };
}

export function designSnapshot(design: GarmentDesign | null | undefined): PreviewRecord {
  if (!design) {
    return {};
  }

  return {
    id: design.id,
    design_name: design.design_name,
    design_code: design.design_code,
    name: design.design_name,
    code: design.design_code,
    description: design.description,
    style_category: design.style_category,
    preview_image_url: design.preview_image_url,
    preview_video_url: design.preview_video_url,
    cloth_reference_url: design.cloth_reference_url,
    style_metadata: design.style_metadata,
    tags: design.tags,
  };
}

export function measurementValuesForItem(item: OrderItemFormValues, measurements: MeasurementSet[]): PreviewRecord {
  if (item.measurementMode === 'previous') {
    const measurement = measurements.find((entry) => entry.id === item.measurementSetId);
    return recordFromUnknown(measurement?.values);
  }

  return item.measurementValues;
}

export function buildPreviewSummary({
  garmentName,
  design,
  item,
  measurementValues,
}: {
  garmentName: string;
  design: GarmentDesign | null | undefined;
  item: OrderItemFormValues;
  measurementValues: PreviewRecord;
}): PreviewRecord {
  const metadata = recordFromUnknown(design?.style_metadata as Json | undefined);
  const combinedStyleValues = { ...metadata, ...item.styleValues };
  const fit = fitLabelForPreview(design, item.styleValues, measurementValues);
  const metadataPreview = buildPreviewMetadata({
    garmentName,
    designName: design?.design_name,
    styleCategory: design?.style_category,
    designImageUrl: design?.preview_image_url,
    fabricReferenceUrl: item.fabricReferenceUrl || null,
    previewVideoUrl: design?.preview_video_url ?? item.previewVideoUrl,
    measurementValues,
    styleValues: { ...combinedStyleValues, fit },
    previewSummary: { estimatedFit: fit },
  });

  return {
    garmentType: metadataPreview.garmentType,
    garment: metadataPreview.garmentType,
    selectedDesign: metadataPreview.selectedDesign,
    design: metadataPreview.selectedDesign,
    styleCategory: metadataPreview.styleCategory,
    style_category: metadataPreview.styleCategory,
    designImageUrl: metadataPreview.designImageUrl,
    fabricReferenceUrl: metadataPreview.fabricReferenceUrl,
    fabric_reference_url: metadataPreview.fabricReferenceUrl,
    fabricReferenceStatus: metadataPreview.fabricReferenceStatus,
    previewVideoUrl: metadataPreview.previewVideoUrl,
    preview_video_url: metadataPreview.previewVideoUrl,
    estimatedFit: metadataPreview.estimatedFit,
    fit: metadataPreview.estimatedFit,
    keyMeasurements: metadataPreview.keyMeasurements,
    key_measurements: metadataPreview.keyMeasurements,
    measurement_summary: metadataPreview.keyMeasurements.map((measurement) => `${measurement.label}: ${measurement.value}`),
    styleSummary: metadataPreview.styleSummary,
    style_summary: metadataPreview.styleSummary,
    visualNotes: metadataPreview.visualNotes,
    visual_notes: metadataPreview.visualNotes,
    measurement_count: metadataPreview.measurementCount,
    style_count: metadataPreview.styleCount,
    warning: metadataPreview.warning,
  };
}
