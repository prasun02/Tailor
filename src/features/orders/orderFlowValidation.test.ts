import { describe, expect, it } from 'vitest';
import type { MeasurementField, StyleField } from '../measurements/types';
import { emptyOrderItem, type OrderItemFormValues } from './orderSchemas';
import { validateGarmentItemDetails } from './orderFlowValidation';

const styleFields: StyleField[] = [
  {
    id: 'style-sleeve',
    shop_id: 'shop-1',
    garment_type_id: 'garment-shirt',
    label: 'Sleeve type',
    label_bn: null,
    field_key: 'sleeve_type',
    field_type: 'select',
    options: ['Full sleeve', 'Half sleeve'],
    is_required: true,
    sort_order: 1,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  },
];

const measurementFields: MeasurementField[] = [
  {
    id: 'measurement-length',
    shop_id: 'shop-1',
    garment_type_id: 'garment-shirt',
    label: 'Shirt length',
    label_bn: null,
    field_key: 'shirt_length',
    field_type: 'number',
    unit: 'inch',
    placeholder: null,
    help_text: null,
    minimum_value: 0,
    maximum_value: 120,
    step_value: 0.25,
    is_required: true,
    sort_order: 1,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  },
];

function validItem(patch: Partial<OrderItemFormValues> = {}): OrderItemFormValues {
  return {
    ...emptyOrderItem(),
    id: 'item-1',
    garmentTypeId: 'garment-shirt',
    measurementMode: 'new',
    styleValues: { sleeve_type: 'Full sleeve' },
    measurementValues: { shirt_length: 29 },
    fabricReferenceMode: 'skip',
    fabricReferenceUrl: '',
    ...patch,
  };
}

describe('validateGarmentItemDetails', () => {
  it('allows order continuation when fabric is skipped and required values are present', () => {
    expect(
      validateGarmentItemDetails({
        items: [validItem()],
        styleFields,
        measurementFields,
      }),
    ).toEqual({});
  });

  it('blocks continuation when required style and measurement values are missing', () => {
    const errors = validateGarmentItemDetails({
      items: [validItem({ styleValues: {}, measurementValues: {} })],
      styleFields,
      measurementFields,
    });

    expect(errors['items.0.styleValues.sleeve_type']).toBe('Sleeve type is required.');
    expect(errors['items.0.measurementValues.shirt_length']).toBe('Shirt length is required.');
    expect(errors['items.0.measurementValues']).toBe('Enter at least one measurement value.');
  });

  it('blocks invalid fabric URLs', () => {
    const errors = validateGarmentItemDetails({
      items: [validItem({ fabricReferenceMode: 'url', fabricReferenceUrl: 'ftp://example.com/fabric.jpg' })],
      styleFields,
      measurementFields,
    });

    expect(errors['items.0.fabricReferenceUrl']).toBe('Enter an http or https fabric image URL.');
  });

  it('blocks while a fabric upload is in progress', () => {
    const errors = validateGarmentItemDetails({
      items: [validItem({ fabricReferenceMode: 'upload', fabricReferenceUrl: '' })],
      styleFields,
      measurementFields,
      uploadingFabricItemIds: new Set(['item-1']),
    });

    expect(errors['items.0.fabricReferenceUrl']).toBe('Wait for the fabric image upload to finish.');
  });
});
