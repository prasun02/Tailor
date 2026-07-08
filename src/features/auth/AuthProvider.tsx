import type { Session } from '@supabase/supabase-js';
import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { appEnv } from '../../lib/env';
import { queryClient } from '../../lib/queryClient';
import { supabase } from '../../services/supabaseClient';
import { AuthContext, type AuthContextValue } from './authContext';

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(appEnv.isConfigured);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isMounted = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (isMounted) {
          setSession(data.session);
          setAuthError(error?.message ?? null);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setAuthError(error instanceof Error ? error.message : 'Could not restore your session.');
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      setAuthError(null);

      if (event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isConfigured: appEnv.isConfigured,
      isLoading,
      authError,
      session,
      user: session?.user ?? null,
      signIn: async (email, password) => {
        if (!supabase) {
          return { error: 'Supabase environment variables are missing or invalid.' };
        }

        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        if (supabase) {
          const { error } = await supabase.auth.signOut();
          queryClient.clear();
          return { error: error?.message ?? null };
        }

        return { error: null };
      },
      sendPasswordResetEmail: async (email) => {
        if (!supabase) {
          return { error: 'Supabase environment variables are missing or invalid.' };
        }

        const redirectTo =
          typeof window === 'undefined' ? undefined : `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        return { error: error?.message ?? null };
      },
      updatePassword: async (password) => {
        if (!supabase) {
          return { error: 'Supabase environment variables are missing or invalid.' };
        }

        const { error } = await supabase.auth.updateUser({ password });
        return { error: error?.message ?? null };
      },
    }),
    [authError, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
