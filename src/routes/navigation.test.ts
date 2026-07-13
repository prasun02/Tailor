import { describe, expect, it } from 'vitest';
import { appNavigation } from './navigation';

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
});