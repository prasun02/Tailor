import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { appBrand } from './brand';
import { appEnv } from '../lib/env';
import { withShopBrandDefaults } from '../features/printing/printModel';

describe('Faabrico branding defaults', () => {
  it('uses Faabrico as the fallback app name and business profile', () => {
    expect(appEnv.appName).toBe('Faabrico');
    expect(appBrand.name).toBe('Faabrico');
    expect(appBrand.phone).toBe('+880 1714-793555');
    expect(appBrand.address).toBe('5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka');
    expect(appBrand.logoUrl).toBe('/brand/faabrico-logo-140x47.png');
  });

  it('replaces old generic shop profile values with Faabrico defaults', () => {
    expect(withShopBrandDefaults({ name: 'Denim-Cut', phone: null, address: null, logo_url: null })).toEqual({
      name: 'Faabrico',
      phone: '+880 1714-793555',
      address: '5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka',
      logo_url: '/brand/faabrico-logo-140x47.png',
    });
  });

  it('keeps the PWA manifest branded as Faabrico', () => {
    const viteConfig = readFileSync('vite.config.ts', 'utf8');

    expect(viteConfig).toContain("name: 'Faabrico'");
    expect(viteConfig).toContain("short_name: 'Faabrico'");
    expect(viteConfig).toContain("theme_color: '#062F2F'");
  });
});