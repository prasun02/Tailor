import type { MeasurementFieldType, MeasurementUnit, StyleFieldType } from '../../types/database';

export type DynamicFieldValue = string | number | boolean | string[] | null;
export type DynamicValueMap = Record<string, DynamicFieldValue>;

export type DynamicMeasurementFieldDefinition = {
  field_key: string;
  label: string;
  label_bn: string | null;
  field_type: MeasurementFieldType;
  unit: MeasurementUnit | null;
  minimum_value: number | null;
  maximum_value: number | null;
  step_value: number;
  is_required: boolean;
};

export type DynamicStyleFieldDefinition = {
  field_key: string;
  label: string;
  label_bn: string | null;
  field_type: StyleFieldType;
  options: unknown;
  is_required: boolean;
};

export type DynamicValidationResult = {
  values: DynamicValueMap;
  errors: Record<string, string>;
};

function isMissing(value: DynamicFieldValue): boolean {
  return value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0);
}

export function normalizeDynamicValue(fieldType: MeasurementFieldType | StyleFieldType, value: unknown): DynamicFieldValue {
  if (fieldType === 'checkbox') {
    return Boolean(value);
  }

  if (fieldType === 'multiselect') {
    return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
  }

  if (fieldType === 'number') {
    if (value === '' || value === null || value === undefined) {
      return null;
    }

    const numberValue = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

export function getStyleOptions(options: unknown): string[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.map((option) => String(option).trim()).filter(Boolean);
}

export function validateMeasurementValues(
  fields: DynamicMeasurementFieldDefinition[],
  rawValues: Record<string, unknown>,
): DynamicValidationResult {
  const values: DynamicValueMap = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = normalizeDynamicValue(field.field_type, rawValues[field.field_key]);
    values[field.field_key] = value;

    if (field.is_required && isMissing(value)) {
      errors[field.field_key] = `${field.label} is required.`;
      continue;
    }

    if (field.field_type === 'number' && value !== null) {
      const numberValue = Number(value);

      if (!Number.isFinite(numberValue)) {
        errors[field.field_key] = `${field.label} must be a number.`;
      } else if (field.minimum_value !== null && numberValue < field.minimum_value) {
        errors[field.field_key] = `${field.label} must be at least ${field.minimum_value}.`;
      } else if (field.maximum_value !== null && numberValue > field.maximum_value) {
        errors[field.field_key] = `${field.label} must be at most ${field.maximum_value}.`;
      }
    }
  }

  return { values, errors };
}

export function validateStyleValues(
  fields: DynamicStyleFieldDefinition[],
  rawValues: Record<string, unknown>,
): DynamicValidationResult {
  const values: DynamicValueMap = {};
  const errors: Record<string, string> = {};

  for (const field of fields) {
    const value = normalizeDynamicValue(field.field_type, rawValues[field.field_key]);
    const options = getStyleOptions(field.options);
    values[field.field_key] = value;

    if (field.is_required && isMissing(value)) {
      errors[field.field_key] = `${field.label} is required.`;
      continue;
    }

    if (field.field_type === 'select' && value && !options.includes(String(value))) {
      errors[field.field_key] = `${field.label} must use a configured option.`;
    }

    if (field.field_type === 'multiselect' && Array.isArray(value)) {
      const invalid = value.find((selectedValue) => !options.includes(selectedValue));
      if (invalid) {
        errors[field.field_key] = `${field.label} includes an unavailable option.`;
      }
    }
  }

  return { values, errors };
}

function asCopyableDynamicValue(value: unknown): DynamicFieldValue | undefined {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return undefined;
}

function isNormalObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function normalizeDynamicValueMap(values: unknown): DynamicValueMap {
  if (!isNormalObject(values)) {
    return {};
  }

  return Object.entries(values).reduce<DynamicValueMap>((copyValues, [key, value]) => {
    const copyableValue = asCopyableDynamicValue(value);

    if (copyableValue !== undefined) {
      copyValues[key] = copyableValue;
    }

    return copyValues;
  }, {});
}

export function copyPreviousMeasurementValues(values: unknown): DynamicValueMap {
  return normalizeDynamicValueMap(values);
}

export function formatMeasurementVersion(versionNumber: number): string {
  return `Version ${versionNumber}`;
}

export function assertMeasurementValuesImmutable(previousValues: unknown, nextValues: unknown): void {
  if (JSON.stringify(previousValues ?? {}) !== JSON.stringify(nextValues ?? {})) {
    throw new Error('Historical measurement values are immutable. Create a new measurement version instead.');
  }
}
