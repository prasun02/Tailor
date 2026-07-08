import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { appEnv } from '../lib/env';
import type { Database } from '../types/database';

export type TypedSupabaseClient = SupabaseClient<Database>;

export const supabase: TypedSupabaseClient | null = appEnv.isConfigured
  ? createClient<Database>(appEnv.supabaseUrl, appEnv.supabasePublishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;

export function getSupabaseClient(): TypedSupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Set the required Vite environment variables first.',
    );
  }

  return supabase;
}
