import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShopRole } from '../types/database';
import { AuthenticatedLayout } from './AuthenticatedLayout';

const faabricoBrand = {
  name: 'Faabrico',
  phone: '+880 1714-793555',
  address: '5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka',
  logo_url: null,
};

const mocks = vi.hoisted(() => ({
  currentRole: 'owner' as ShopRole | null,
}));

vi.mock('../features/auth/authContext', () => ({
  useAuth: () => ({
    signOut: vi.fn(),
    user: { email: 'owner@faabrico.test' },
  }),
}));

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({
    currentRole: mocks.currentRole,
    currentShop: {
      id: 'shop-1',
      name: 'Denim-Cut',
      timezone: 'Asia/Dhaka',
      currency: 'BDT',
      default_measurement_unit: 'inch',
      deleted_at: null,
    },
    currentShopId: 'shop-1',
    hasMultipleShops: false,
    memberships: [],
    setCurrentShopId: vi.fn(),
  }),
}));

vi.mock('../features/printing/useShopBrand', () => ({
  useShopBrand: () => ({ data: faabricoBrand }),
  resolveShopBrand: () => faabricoBrand,
}));

function renderLayout() {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<AuthenticatedLayout />}>
          <Route path="/" element={<div>Workspace content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe('AuthenticatedLayout branding', () => {
  beforeEach(() => {
    mocks.currentRole = 'owner';
  });

  it('shows Faabrico sidebar/header branding from the shop profile and hides old generic names', () => {
    renderLayout();

    expect(screen.getAllByText('Faabrico').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bespoke Tailoring Order & Production Desk').length).toBeGreaterThan(0);
    expect(screen.getAllByText('+880 1714-793555').length).toBeGreaterThan(0);
    expect(screen.getAllByText('owner@faabrico.test').length).toBeGreaterThan(0);
    expect(screen.queryByText(/Tailor Store Manager|Denim-Cut|Tailor Store App|Smart Tailor Manager/)).not.toBeInTheDocument();
  });

  it('filters staff navigation to New Order and Search / Delivery only', () => {
    mocks.currentRole = 'staff';

    renderLayout();

    expect(screen.getAllByRole('link', { name: /new order/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /search \/ delivery/i }).length).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: /^orders$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /payments/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /reports/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /dashboard/i })).not.toBeInTheDocument();
  });
});
