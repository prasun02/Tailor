import { z } from 'zod';
import type { MeasurementFieldType, MeasurementUnit, StyleFieldType } from '../../types/database';

export const measurementFieldTypes: MeasurementFieldType[] = ['number', 'text', 'textarea', 'select', 'checkbox'];
export const styleFieldTypes: StyleFieldType[] = ['select', 'multiselect', 'text', 'number', 'checkbox', 'textarea'];
export const measurementUnits: MeasurementUnit[] = ['inch', 'cm'];

const optionalNumber = z
  .string()
  .trim()
  .optional()
  .or(z.literal(''))
  .transform((value) => (value ? Number(value) : null))
  .refine((value) => value === null || Number.isFinite(value), 'Enter a valid number.');

export const garmentFormSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(80, 'Name must be 80 characters or fewer.'),
  nameBn: z.string().trim().max(80, 'Bangla name must be 80 characters or fewer.').optional().or(z.literal('')),
  code: z
    .string()
    .trim()
    .min(2, 'Code must be at least 2 characters.')
    .max(20, 'Code must be 20 characters or fewer.')
    .regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, numbers, or underscores.'),
  description: z.string().trim().max(500, 'Description must be 500 characters or fewer.').optional().or(z.literal('')),
  sortOrder: z.coerce.number().int('Sort order must be a whole number.'),
});

export const measurementFieldFormSchema = z
  .object({
    garmentTypeId: z.string().min(1, 'Select a garment type.'),
    label: z.string().trim().min(2, 'Label must be at least 2 characters.').max(80, 'Label must be 80 characters or fewer.'),
    labelBn: z.string().trim().max(80, 'Bangla label must be 80 characters or fewer.').optional().or(z.literal('')),
    fieldKey: z
      .string()
      .trim()
      .min(2, 'Field key must be at least 2 characters.')
      .max(61, 'Field key must be 61 characters or fewer.')
      .regex(/^[a-z][a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores. Start with a letter.'),
    fieldType: z.enum(measurementFieldTypes),
    unit: z.enum(measurementUnits).optional().or(z.literal('')),
    placeholder: z.string().trim().max(120, 'Placeholder must be 120 characters or fewer.').optional().or(z.literal('')),
    helpText: z.string().trim().max(240, 'Help text must be 240 characters or fewer.').optional().or(z.literal('')),
    minimumValue: optionalNumber,
    maximumValue: optionalNumber,
    stepValue: z.coerce.number().positive('Step must be greater than zero.'),
    isRequired: z.boolean(),
    sortOrder: z.coerce.number().int('Sort order must be a whole number.'),
  })
  .refine(
    (value) => value.minimumValue === null || value.maximumValue === null || value.minimumValue <= value.maximumValue,
    { message: 'Minimum must be less than or equal to maximum.', path: ['maximumValue'] },
  );

export const styleFieldFormSchema = z.object({
  garmentTypeId: z.string().min(1, 'Select a garment type.'),
  label: z.string().trim().min(2, 'Label must be at least 2 characters.').max(80, 'Label must be 80 characters or fewer.'),
  labelBn: z.string().trim().max(80, 'Bangla label must be 80 characters or fewer.').optional().or(z.literal('')),
  fieldKey: z
    .string()
    .trim()
    .min(2, 'Field key must be at least 2 characters.')
    .max(61, 'Field key must be 61 characters or fewer.')
    .regex(/^[a-z][a-z0-9_]+$/, 'Use lowercase letters, numbers, and underscores. Start with a letter.'),
  fieldType: z.enum(styleFieldTypes),
  options: z.array(z.string().trim().min(1, 'Option cannot be empty.')).default([]),
  isRequired: z.boolean(),
  sortOrder: z.coerce.number().int('Sort order must be a whole number.'),
});

export type GarmentFormValues = z.infer<typeof garmentFormSchema>;
export type MeasurementFieldFormValues = z.infer<typeof measurementFieldFormSchema>;
export type StyleFieldFormValues = z.infer<typeof styleFieldFormSchema>;

export const emptyGarmentFormValues: GarmentFormValues = {
  name: '',
  nameBn: '',
  code: '',
  description: '',
  sortOrder: 0,
};

export const emptyMeasurementFieldFormValues: MeasurementFieldFormValues = {
  garmentTypeId: '',
  label: '',
  labelBn: '',
  fieldKey: '',
  fieldType: 'number',
  unit: 'inch',
  placeholder: '',
  helpText: '',
  minimumValue: null,
  maximumValue: null,
  stepValue: 0.25,
  isRequired: false,
  sortOrder: 0,
};

export const emptyStyleFieldFormValues: StyleFieldFormValues = {
  garmentTypeId: '',
  label: '',
  labelBn: '',
  fieldKey: '',
  fieldType: 'select',
  options: [],
  isRequired: false,
  sortOrder: 0,
};
