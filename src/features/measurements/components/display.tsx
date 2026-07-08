import type { ReactElement } from 'react';
import type { Json } from '../../../types/database';
import { getStyleOptions } from '../dynamicValidation';
import type { MeasurementField, StyleField } from '../types';
import { MissingValue } from './DynamicField';

export function displayDynamicValue(value: unknown): string | ReactElement {
  if (value === null || value === undefined || value === '') {
    return <MissingValue />;
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : <MissingValue />;
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

export function optionObjects(options: unknown): { label: string; value: string }[] {
  return getStyleOptions(options).map((option) => ({ label: option, value: option }));
}

export function measurementFieldLabel(field: MeasurementField): string {
  return field.label_bn ? `${field.label} / ${field.label_bn}` : field.label;
}

export function styleFieldLabel(field: StyleField): string {
  return field.label_bn ? `${field.label} / ${field.label_bn}` : field.label;
}

export function jsonObject(value: Json): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
