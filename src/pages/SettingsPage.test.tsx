import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('groups design, measurement, staff, print, shop profile, and backup setup under Settings', () => {
    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Design Library/i })).toHaveAttribute('href', '/settings/designs');
    expect(screen.getByRole('link', { name: /Measurement Setup/i })).toHaveAttribute('href', '/settings/measurement-fields');
    expect(screen.getByText('Garment Types')).toBeInTheDocument();
    expect(screen.getByText('Style Fields')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Shop Profile/i })).toHaveAttribute('href', '/settings/shop-profile');
    expect(screen.getByText('Print Settings')).toBeInTheDocument();
    expect(screen.getByText('Backup')).toBeInTheDocument();
  });
});