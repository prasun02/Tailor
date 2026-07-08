import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
  password: z.string().min(6, 'Password must be at least 6 characters.'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.'),
});

export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm the new password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export const onboardingSchema = z.object({
  ownerFullName: z.string().trim().min(2, 'Owner full name is required.').max(120, 'Owner name is too long.'),
  ownerPhone: z.string().trim().min(5, 'Owner phone is required.').max(30, 'Owner phone is too long.'),
  shopName: z.string().trim().min(2, 'Shop name must be at least 2 characters.').max(120, 'Shop name is too long.'),
  shopPhone: z.string().trim().min(5, 'Shop phone is required.').max(30, 'Shop phone is too long.'),
  shopAddress: z.string().trim().min(3, 'Shop address is required.').max(300, 'Shop address is too long.'),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
