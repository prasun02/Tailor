import { z } from 'zod';
import { isValidPhone } from './phone';

const optionalPhoneSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .refine((value) => !value || isValidPhone(value), 'Enter a valid phone number.');

const optionalEmailSchema = z.string().trim().email('Enter a valid email address.').optional().or(z.literal(''));

export const customerFormSchema = z.object({
  name: z.string().trim().min(1, 'Customer name is required.').max(120, 'Name must be 120 characters or fewer.'),
  phone: optionalPhoneSchema,
  alternativePhone: optionalPhoneSchema,
  email: optionalEmailSchema,
  address: z.string().trim().max(500, 'Address must be 500 characters or fewer.').optional().or(z.literal('')),
  notes: z.string().trim().max(1500, 'Notes must be 1500 characters or fewer.').optional().or(z.literal('')),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export const emptyCustomerFormValues: CustomerFormValues = {
  name: '',
  phone: '',
  alternativePhone: '',
  email: '',
  address: '',
  notes: '',
};
