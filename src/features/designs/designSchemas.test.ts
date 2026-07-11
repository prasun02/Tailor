import { describe, expect, it } from 'vitest';
import { designFormSchema, emptyDesignFormValues } from './designSchemas';

describe('designFormSchema', () => {
  it('accepts valid design library input', () => {
    const parsed = designFormSchema.safeParse({
      ...emptyDesignFormValues,
      garmentTypeId: 'garment-shirt',
      name: 'Full sleeve formal shirt',
      code: 'SH_005',
      styleCategory: 'Full sleeve',
      previewImageUrl: 'https://example.com/shirt.jpg',
      previewVideoUrl: 'https://example.com/shirt.mp4',
      clothReferenceUrl: 'https://example.com/cloth.jpg',
      tagsText: 'full sleeve, formal, office',
      styleMetadataText: '{"fit":"Regular fit","collar":"Classic"}',
      sortOrder: 5,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid design URLs and metadata', () => {
    const parsed = designFormSchema.safeParse({
      ...emptyDesignFormValues,
      garmentTypeId: 'garment-shirt',
      name: 'A',
      code: 'shirt 5',
      previewImageUrl: 'ftp://example.com/shirt.jpg',
      styleMetadataText: '["not","object"]',
    });

    expect(parsed.success).toBe(false);
    if (parsed.success) throw new Error('Expected invalid design form values.');
    expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toEqual(
      expect.arrayContaining(['name', 'code', 'previewImageUrl', 'styleMetadataText']),
    );
  });
});
