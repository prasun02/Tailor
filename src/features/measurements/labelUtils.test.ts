import { describe, expect, it } from 'vitest';
import { displayFieldLabel } from './labelUtils';

describe('displayFieldLabel', () => {
  it('falls back to the English label when the localized label is corrupted', () => {
    expect(displayFieldLabel('Shirt length', '??????? ?????')).toBe('Shirt length');
    expect(displayFieldLabel('Chest', '???')).toBe('Chest');
  });

  it('shows a clean localized label when one exists', () => {
    expect(displayFieldLabel('Collar type', 'Collar Bangla')).toBe('Collar type / Collar Bangla');
  });
});
