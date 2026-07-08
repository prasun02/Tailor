import type { GarmentFormValues, MeasurementFieldFormValues, StyleFieldFormValues } from './configurationSchemas';
import { getStyleOptions } from './dynamicValidation';
import type { GarmentType, MeasurementField, StyleField } from './types';

export function garmentToFormValues(garment: GarmentType): GarmentFormValues {
  return {
    name: garment.name,
    nameBn: garment.name_bn ?? '',
    code: garment.code,
    description: garment.description ?? '',
    sortOrder: garment.sort_order,
  };
}

export function measurementFieldToFormValues(field: MeasurementField): MeasurementFieldFormValues {
  return {
    garmentTypeId: field.garment_type_id,
    label: field.label,
    labelBn: field.label_bn ?? '',
    fieldKey: field.field_key,
    fieldType: field.field_type,
    unit: field.unit ?? '',
    placeholder: field.placeholder ?? '',
    helpText: field.help_text ?? '',
    minimumValue: field.minimum_value,
    maximumValue: field.maximum_value,
    stepValue: field.step_value,
    isRequired: field.is_required,
    sortOrder: field.sort_order,
  };
}

export function styleFieldToFormValues(field: StyleField): StyleFieldFormValues {
  return {
    garmentTypeId: field.garment_type_id,
    label: field.label,
    labelBn: field.label_bn ?? '',
    fieldKey: field.field_key,
    fieldType: field.field_type,
    options: getStyleOptions(field.options),
    isRequired: field.is_required,
    sortOrder: field.sort_order,
  };
}
