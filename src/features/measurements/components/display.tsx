import type { ReactElement } from 'react';
import type { Json } from '../../../types/database';
import { getStyleOptions } from '../dynamicValidation';
import type { MeasurementField, StyleField } from '../types';
import { MissingValue } from './DynamicField';
import { displayFieldLabel } from '../labelUtils';

function valueToText(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(valueToText).filter(Boolean).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const label = typeof record.label === 'string' ? record.label.trim() : '';
    const displayValue = valueToText(record.value);

    if (label && displayValue) {
      return `${label}: ${displayValue}`;
    }

    return Object.entries(record)
      .filter(([key]) => !/url|id|created|updated/i.test(key))
      .map(([key, entryValue]) => {
        const text = valueToText(entryValue);
        return text ? `${key}: ${text}` : '';
      })
      .filter(Boolean)
      .join(', ');
  }

  return String(value);
}

export function displayDynamicValue(value: unknown): string | ReactElement {
  const text = valueToText(value);
  return text || <MissingValue />;
}

export function optionObjects(options: unknown): { label: string; value: string }[] {
  return getStyleOptions(options).map((option) => ({ label: option, value: option }));
}

export function measurementFieldLabel(field: MeasurementField): string {
  return displayFieldLabel(field.label, field.label_bn);
}

export function styleFieldLabel(field: StyleField): string {
  return displayFieldLabel(field.label, field.label_bn);
}

export function jsonObject(value: Json): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}
