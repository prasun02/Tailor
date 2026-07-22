import { describe, expect, it } from 'vitest';
import { appNavigation, navigationForRole } from './navigation';

describe('appNavigation', () => {
  it('uses the shorter premium sidebar menu with Dashboard last', () => {
    expect(appNavigation.map((item) => item.label)).toEqual([
      'New Order',
      'Search / Delivery',
      'Orders',
      'Production',
      'Payments',
      'Reports',
      'Settings',
      'Dashboard',
    ]);
  });

  it('keeps setup screens out of the top-level sidebar', () => {
    const labels = appNavigation.map((item) => item.label);

    expect(labels).not.toContain('Design Library');
    expect(labels).not.toContain('Measurements');
    expect(labels[labels.length - 1]).toBe('Dashboard');
  });

  it('shows only New Order and Search / Delivery for regular order staff', () => {
    expect(navigationForRole('staff').map((item) => item.label)).toEqual([
      'New Order',
      'Search / Delivery',
    ]);
  });

  it('shows admin-level business sections for owners and managers', () => {
    expect(navigationForRole('owner').map((item) => item.label)).toEqual([
      'New Order',
      'Search / Delivery',
      'Orders',
      'Production',
      'Payments',
      'Reports',
      'Settings',
      'Dashboard',
    ]);
    expect(navigationForRole('manager').map((item) => item.label)).toEqual(navigationForRole('owner').map((item) => item.label));
  });

  it('keeps production roles away from payments, reports, settings, and dashboard', () => {
    expect(navigationForRole('tailor').map((item) => item.label)).toEqual([
      'Search / Delivery',
      'Production',
    ]);
  });
});
