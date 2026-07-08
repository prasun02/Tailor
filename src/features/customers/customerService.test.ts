import { describe, expect, it } from 'vitest';
import { buildCustomerSearchOrFilter, getCustomerMutationErrorMessage } from './customerService';

const duplicateError = { code: '23505', message: 'duplicate key value violates unique constraint' };

describe('customer search parameters', () => {
  it('builds a server-side search filter for name, customer code, and normalized phone', () => {
    expect(buildCustomerSearchOrFilter(' Rahim 017-123 ')).toBe(
      'normalized_name.ilike.%rahim 017-123%,customer_code.ilike.%rahim 017-123%,normalized_phone.ilike.%017123%',
    );
  });

  it('sanitizes PostgREST OR filter separators from search input', () => {
    expect(buildCustomerSearchOrFilter('CUS-1,%')).toBe('normalized_name.ilike.%cus-1%,customer_code.ilike.%cus-1%,normalized_phone.ilike.%1%');
  });
});

describe('customer duplicate handling', () => {
  it('maps the active normalized phone unique constraint to a helpful message', () => {
    expect(getCustomerMutationErrorMessage(duplicateError)).toMatch(/already exists/i);
  });

  it('preserves non-duplicate service errors', () => {
    expect(getCustomerMutationErrorMessage({ message: 'RLS denied' })).toBe('RLS denied');
  });
});

