import { describe, expect, it } from 'vitest';
import { buildDesignDetailsSnapshot, designSelectionEntriesFromSnapshot, getBuiltInDesignCategories, garmentDesignFamilyFromName, selectionsFromDesignSnapshot } from './designSelectionUtils';

describe('built-in garment design catalog', () => {
  it('shows suit categories only for suit and blazer garments', () => {
    const categories = getBuiltInDesignCategories('Suit').map((category) => category.categoryName);

    expect(garmentDesignFamilyFromName('Wedding Blazer')).toBe('suit');
    expect(categories).toContain('Lapel Design');
    expect(categories).toContain('Jacket Pocket');
    expect(categories).not.toContain('Collar Type');
  });

  it('shows shirt categories only for shirt garments', () => {
    const categories = getBuiltInDesignCategories('Shirt').map((category) => category.categoryName);

    expect(categories).toContain('Collar Type');
    expect(categories).toContain('Cuff Type');
    expect(categories).toContain('Additional Details');
    expect(categories).not.toContain('Waistband Style');
  });

  it('shows pant categories only for pant and trouser garments', () => {
    const categories = getBuiltInDesignCategories('Trouser Pant').map((category) => category.categoryName);

    expect(categories).toContain('Waistband Style');
    expect(categories).toContain('Fly Type');
    expect(categories).not.toContain('Placket Style');
  });

  it('shows panjabi categories only for panjabi and kurta garments', () => {
    const categories = getBuiltInDesignCategories('Panjabi Kurta').map((category) => category.categoryName);

    expect(categories).toContain('Placket Style');
    expect(categories).toContain('Embroidery / Detailing');
    expect(categories).not.toContain('Trouser Front');
  });
  it('saves and reads the selectedCategories snapshot alias', () => {
    const categories = getBuiltInDesignCategories('Shirt');
    const snapshot = buildDesignDetailsSnapshot({
      garmentName: 'Shirt',
      categories,
      selections: { collar_type: ['spread'] },
    });

    expect(snapshot.selectedCategories).toEqual(snapshot.categories);
    expect(selectionsFromDesignSnapshot({ selectedCategories: snapshot.selectedCategories })).toEqual({ collar_type: ['spread'] });
    expect(designSelectionEntriesFromSnapshot({ selectedCategories: snapshot.selectedCategories })).toEqual([
      { key: 'collar_type', label: 'Collar Type', value: 'Spread' },
    ]);
  });
});
