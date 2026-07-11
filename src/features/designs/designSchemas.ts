import { z } from 'zod';

const optionalText = z.string().trim().optional().or(z.literal(''));
const optionalUrl = optionalText.refine((value) => !value || /^https?:\/\//i.test(value), 'Enter an http or https URL.');

export const designFormSchema = z
  .object({
    garmentTypeId: z.string().min(1, 'Select a garment type.'),
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120, 'Name must be 120 characters or fewer.'),
    code: z
      .string()
      .trim()
      .min(2, 'Code must be at least 2 characters.')
      .max(40, 'Code must be 40 characters or fewer.')
      .regex(/^[A-Z0-9_]+$/, 'Use uppercase letters, numbers, or underscores.'),
    description: z.string().trim().max(600, 'Description must be 600 characters or fewer.').optional().or(z.literal('')),
    styleCategory: z.string().trim().max(80, 'Style category must be 80 characters or fewer.').optional().or(z.literal('')),
    previewImageUrl: optionalUrl,
    previewVideoUrl: optionalUrl,
    clothReferenceUrl: optionalUrl,
    tagsText: z.string().trim().max(240, 'Tags must be 240 characters or fewer.').optional().or(z.literal('')),
    styleMetadataText: z.string().trim().max(2000, 'Metadata must be 2000 characters or fewer.').optional().or(z.literal('')),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int('Sort order must be a whole number.'),
  })
  .superRefine((value, context) => {
    const metadata = value.styleMetadataText?.trim();
    if (!metadata) return;

    try {
      const parsed = JSON.parse(metadata) as unknown;
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        context.addIssue({ code: 'custom', path: ['styleMetadataText'], message: 'Style metadata must be a JSON object.' });
      }
    } catch {
      context.addIssue({ code: 'custom', path: ['styleMetadataText'], message: 'Enter valid JSON metadata.' });
    }
  });

export type DesignFormValues = z.infer<typeof designFormSchema>;

export const emptyDesignFormValues: DesignFormValues = {
  garmentTypeId: '',
  name: '',
  code: '',
  description: '',
  styleCategory: '',
  previewImageUrl: '',
  previewVideoUrl: '',
  clothReferenceUrl: '',
  tagsText: '',
  styleMetadataText: '',
  isActive: true,
  sortOrder: 0,
};
