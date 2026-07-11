import type { MeasurementField, StyleField } from '../measurements/types';
import { validateMeasurementValues, validateStyleValues } from '../measurements/dynamicValidation';
import type { OrderItemFormValues } from './orderSchemas';

type GarmentItemValidationInput = {
  items: OrderItemFormValues[];
  styleFields: StyleField[];
  measurementFields: MeasurementField[];
  uploadingFabricItemIds?: ReadonlySet<string>;
  configurationLoading?: boolean;
};

function itemHasMeasurementValues(item: OrderItemFormValues): boolean {
  return Object.values(item.measurementValues ?? {}).some((value) => value !== '' && value !== null && value !== undefined);
}

export function isValidOptionalHttpUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim() ?? '';

  if (!trimmed) {
    return true;
  }

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function validateGarmentItemDetails({
  items,
  styleFields,
  measurementFields,
  uploadingFabricItemIds = new Set<string>(),
  configurationLoading = false,
}: GarmentItemValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  items.forEach((item, index) => {
    const prefix = `items.${index}`;
    const itemStyleFields = styleFields.filter((field) => field.garment_type_id === item.garmentTypeId);
    const itemMeasurementFields = measurementFields.filter((field) => field.garment_type_id === item.garmentTypeId);

    if (configurationLoading) {
      errors[`${prefix}.configuration`] = 'Style and measurement setup is still loading.';
    }

    const styleValidation = validateStyleValues(itemStyleFields, item.styleValues);
    Object.entries(styleValidation.errors).forEach(([fieldKey, message]) => {
      errors[`${prefix}.styleValues.${fieldKey}`] = message;
    });

    if (item.measurementMode === 'previous') {
      if (!item.measurementSetId) {
        errors[`${prefix}.measurementSetId`] = 'Select a previous measurement.';
      }
    } else {
      if (!itemHasMeasurementValues(item)) {
        errors[`${prefix}.measurementValues`] = 'Enter at least one measurement value.';
      }

      const measurementValidation = validateMeasurementValues(itemMeasurementFields, item.measurementValues);
      Object.entries(measurementValidation.errors).forEach(([fieldKey, message]) => {
        errors[`${prefix}.measurementValues.${fieldKey}`] = message;
      });
    }

    if (!isValidOptionalHttpUrl(item.fabricReferenceUrl)) {
      errors[`${prefix}.fabricReferenceUrl`] = 'Enter an http or https fabric image URL.';
    }

    if (uploadingFabricItemIds.has(item.id)) {
      errors[`${prefix}.fabricReferenceUrl`] = 'Wait for the fabric image upload to finish.';
    }
  });

  return errors;
}
