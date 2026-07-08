import { describe, expect, it } from 'vitest';
import { customerFormSchema } from './customerSchema';

describe('customer validation', () => {
  it('requires a customer name', () => {
    const result = customerFormSchema.safeParse({ name: '', phone: '', alternativePhone: '', address: '', notes: '' });
    expect(result.success).toBe(false);
  });

  it('accepts Bangla and English customer text', () => {
    const result = customerFormSchema.safeParse({
      name: '???? Uddin',
      phone: '',
      alternativePhone: '',
      address: '????????, Dhaka',
      notes: 'Prefers slim fit / ????? ???',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid phone values when supplied', () => {
    const result = customerFormSchema.safeParse({
      name: 'Rahim',
      phone: '123',
      alternativePhone: '',
      address: '',
      notes: '',
    });

    expect(result.success).toBe(false);
  });
});
