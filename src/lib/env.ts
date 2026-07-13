import { z } from 'zod';
import { appBrand } from '../app/brand';

const rawEnv = {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
  VITE_APP_NAME: import.meta.env.VITE_APP_NAME ?? '',
};

const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .trim()
    .min(1, 'VITE_SUPABASE_URL is required.')
    .refine((value) => {
      try {
        const url = new URL(value);
        return url.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'VITE_SUPABASE_URL must be a valid HTTPS Supabase project URL.'),
  VITE_SUPABASE_PUBLISHABLE_KEY: z.string().trim().min(1, 'VITE_SUPABASE_PUBLISHABLE_KEY is required.'),
  VITE_APP_NAME: z.string().trim().min(1, 'VITE_APP_NAME is required.'),
});

const parsedEnv = envSchema.safeParse(rawEnv);
const validationIssues = parsedEnv.success ? [] : parsedEnv.error.issues.map((issue) => issue.message);
const publishableKey = rawEnv.VITE_SUPABASE_PUBLISHABLE_KEY.trim();
const secretKeyPatterns = ['service_role', 'sb_secret_', 'supabase_service_role'];
const secretKeyIssues = secretKeyPatterns.some((pattern) => publishableKey.toLowerCase().includes(pattern))
  ? ['VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key, never a Supabase secret or service-role key.']
  : [];

const configurationIssues = [...validationIssues, ...secretKeyIssues];

export const appEnv = {
  appName: parsedEnv.success ? parsedEnv.data.VITE_APP_NAME : rawEnv.VITE_APP_NAME.trim() || appBrand.name,
  supabaseUrl: parsedEnv.success ? parsedEnv.data.VITE_SUPABASE_URL : '',
  supabasePublishableKey: parsedEnv.success ? parsedEnv.data.VITE_SUPABASE_PUBLISHABLE_KEY : '',
  configurationIssues,
  isConfigured: configurationIssues.length === 0,
} as const;