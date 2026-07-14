import { describe, expect, it } from 'vitest';
import { designDisplayForOrderItem, displayEntries, previewSummaryEntries } from './orderDisplayUtils';

describe('order display utilities', () => {
  it('formats legacy raw snapshot keys and object arrays without exposing technical labels', () => {
    const entries = displayEntries({
      KEYMEASUREMENTS: [
        { label: 'Chest', value: 54 },
        { label: 'Waist', value: 34 },
      ],
      ESTIMATEDFIT: 'Regular fit',
      DESIGNIMAGEURL: 'https://example.com/design.jpg',
      STYLE_COUNT: 2,
    });

    expect(entries).toEqual([
      { key: 'KEYMEASUREMENTS', label: 'Key Measurements', value: 'Chest: 54; Waist: 34' },
      { key: 'ESTIMATEDFIT', label: 'Estimated Fit', value: 'Regular fit' },
    ]);
    expect(entries.map((entry) => entry.value).join(' ')).not.toContain('[object Object]');
    expect(entries.map((entry) => entry.label).join(' ')).not.toContain('DESIGNIMAGEURL');
  });

  it('extracts design and fabric media from saved item snapshots without exposing raw URLs as labels', () => {
    const display = designDisplayForOrderItem({
      design_snapshot: {
        DESIGN_NAME: 'Long Shirt',
        DESIGN_CODE: 'LS-1',
        STYLE_CATEGORY: 'Slim',
        DESIGNIMAGEURL: 'https://example.com/design.jpg',
      },
      preview_summary: {
        FABRICREFERENCEURL: 'https://example.com/fabric.jpg',
      },
    });

    expect(display).toEqual({
      name: 'Long Shirt',
      code: 'LS-1',
      category: 'Slim',
      designImageUrl: 'https://example.com/design.jpg',
      fabricImageUrl: 'https://example.com/fabric.jpg',
      fabricStatus: 'Added',
      previewVideoUrl: null,
    });
  });

  it('builds human-readable preview summary sections from legacy keys', () => {
    const entries = previewSummaryEntries({
      KEYMEASUREMENTS: [{ label: 'Shoulder', value: 18 }],
      ESTIMATEDFIT: 'Slim fit',
      STYLE_SUMMARY: ['Collar: Band'],
      FABRICREFERENCEURL: 'https://example.com/fabric.jpg',
      VISUAL_NOTES: ['Customer fabric reference added'],
    });

    expect(entries.map((entry) => entry.label)).toEqual([
      'Estimated Fit',
      'Key Measurements',
      'Style Choices',
      'Fabric Reference',
      'Visual Notes',
    ]);
    expect(entries.map((entry) => entry.value).join(' ')).not.toContain('[object Object]');
  });
});
