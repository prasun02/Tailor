import { describe, expect, it } from 'vitest';
import { normalizeDynamicValueMap } from './dynamicValidation';

describe('normalizeDynamicValueMap', () => {
  it('keeps only supported dynamic values from database JSON', () => {
    expect(
      normalizeDynamicValueMap({
        chest: 38,
        fit: 'regular',
        urgent: true,
        addons: ['lining', 'buttons', '', 12, false],
        missing: null,
        nested: { unsupported: true },
      }),
    ).toEqual({
      chest: 38,
      fit: 'regular',
      urgent: true,
      addons: ['lining', 'buttons'],
      missing: null,
    });
  });

  it('rejects arrays and non-object values', () => {
    expect(normalizeDynamicValueMap(['chest'])).toEqual({});
    expect(normalizeDynamicValueMap('chest')).toEqual({});
    expect(normalizeDynamicValueMap(null)).toEqual({});
  });
});
