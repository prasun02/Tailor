import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./lib/env', () => ({
  appEnv: {
    appName: 'Faabrico',
    supabaseUrl: '',
    supabasePublishableKey: '',
    configurationIssues: ['VITE_SUPABASE_PUBLISHABLE_KEY is required.'],
    isConfigured: false,
  },
}));

import App from './app/App';
import { AppProviders } from './app/providers';

describe('App', () => {
  it('shows a configuration error when Supabase environment variables are missing', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>,
    );

    expect(screen.getByRole('heading', { name: /configuration required/i })).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_PUBLISHABLE_KEY is required/i)).toBeInTheDocument();
  });
});
