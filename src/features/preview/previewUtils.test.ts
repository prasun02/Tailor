import { describe, expect, it } from 'vitest';
import type { GarmentDesign } from '../designs/types';
import { emptyOrderItem } from '../orders/orderSchemas';
import { buildPreviewSummary, ESTIMATED_PREVIEW_WARNING } from './previewUtils';

const design: GarmentDesign = {
  id: 'design-shirt',
  shop_id: 'shop-1',
  garment_type_id: 'garment-shirt',
  design_name: 'Classic shirt',
  design_code: 'SH_001',
  style_category: 'Formal',
  preview_image_url: 'https://example.com/design.jpg',
  preview_video_url: null,
  cloth_reference_url: null,
  tags: ['formal'],
  description: null,
  style_metadata: { collar: 'Regular', pocket: 'Single' },
  sort_order: 1,
  is_active: true,
  created_by: 'user-1',
  created_at: '2026-07-01T00:00:00.000Z',
  updated_at: '2026-07-01T00:00:00.000Z',
  deleted_at: null,
};

describe('preview utilities', () => {
  it('builds estimated preview metadata from design, style, fabric, and measurements', () => {
    const summary = buildPreviewSummary({
      garmentName: 'Shirt',
      design,
      item: {
        ...emptyOrderItem(),
        styleValues: { sleeve_type: 'Full sleeve', fit: 'Slim' },
        fabricReferenceUrl: 'https://example.com/fabric.jpg',
      },
      measurementValues: { chest: 40, waist: 37, shirt_length: 29 },
    });

    expect(summary.garmentType).toBe('Shirt');
    expect(summary.selectedDesign).toBe('Classic shirt');
    expect(summary.estimatedFit).toBe('Slim fit');
    expect(summary.fabricReferenceUrl).toBe('https://example.com/fabric.jpg');
    expect(summary.warning).toBe(ESTIMATED_PREVIEW_WARNING);
    expect(summary.keyMeasurements).toEqual([
      { key: 'chest', label: 'Chest', value: '40' },
      { key: 'waist', label: 'Waist', value: '37' },
      { key: 'shirt_length', label: 'Shirt Length', value: '29' },
    ]);
    expect(summary.styleSummary).toEqual(expect.arrayContaining(['Sleeve Type: Full sleeve', 'Fit: Slim fit']));
    expect(summary.visualNotes).toEqual(expect.arrayContaining(['Full sleeve selected', 'Customer fabric reference added']));
  });
});
