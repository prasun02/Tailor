import { describe, expect, it } from 'vitest';
import { isValidPhone, normalizeDigits, normalizePhone, normalizePhoneInput } from './phone';

describe('customer phone utilities', () => {
  it('normalizes Bangla and Arabic-family digits to ASCII digits', () => {
    expect(normalizeDigits('\u09e6\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee\u09ef')).toBe('0123456789');
    expect(normalizeDigits('\u0660\u0661\u0662\u06f3')).toBe('0123');
  });

  it('normalizes phone values the same way the database search field stores them', () => {
    expect(normalizePhone('+880 1712-345678')).toBe('8801712345678');
    expect(normalizePhone('\u09e6\u09e7\u09ed\u09e7\u09e8\u09e9\u09ea\u09eb\u09ec\u09ed\u09ee')).toBe('01712345678');
    expect(normalizePhone('not a phone')).toBeNull();
  });

  it('normalizes display input without stripping punctuation before save', () => {
    expect(normalizePhoneInput('\u09e6\u09e7\u09ed\u09e7 234-5678')).toBe('0171 234-5678');
  });

  it('validates optional phone input when supplied', () => {
    expect(isValidPhone('01712345678')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});
