import type { CustomerFormValues } from './customerSchema';
import type { Customer } from './customerService';

export function customerToFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone ?? '',
    alternativePhone: customer.alternative_phone ?? '',
    email: customer.email ?? '',
    address: customer.address ?? '',
    notes: customer.notes ?? '',
  };
}
