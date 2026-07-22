import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ShopRole } from '../types/database';
import { ADMIN_ROLES, ORDER_ENTRY_ROLES } from '../utils/authorization';
import { RequireRole, RoleHomeRedirect } from './RouteGuards';

const mocks = vi.hoisted(() => ({
  currentRole: 'staff' as ShopRole | null,
}));

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({ currentRole: mocks.currentRole }),
}));

describe('RequireRole', () => {
  beforeEach(() => {
    mocks.currentRole = 'staff';
  });

  it('allows authorized roles to render protected content', () => {
    mocks.currentRole = 'owner';

    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<RequireRole allowedRoles={ADMIN_ROLES}><div>Settings Content</div></RequireRole>} />
          <Route path="/orders/new" element={<div>New Order Landing</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('Settings Content')).toBeInTheDocument();
  });

  it('redirects regular staff away from admin-only URLs', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <Routes>
          <Route path="/settings" element={<RequireRole allowedRoles={ADMIN_ROLES}><div>Settings Content</div></RequireRole>} />
          <Route path="/orders/new" element={<div>New Order Landing</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('Settings Content')).not.toBeInTheDocument();
    expect(screen.getByText('New Order Landing')).toBeInTheDocument();
  });

  it('blocks production roles from order-entry URLs and sends them to production', () => {
    mocks.currentRole = 'tailor';

    render(
      <MemoryRouter initialEntries={['/orders/new']}>
        <Routes>
          <Route path="/orders/new" element={<RequireRole allowedRoles={ORDER_ENTRY_ROLES}><div>New Order Landing</div></RequireRole>} />
          <Route path="/production" element={<div>Production Landing</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByText('New Order Landing')).not.toBeInTheDocument();
    expect(screen.getByText('Production Landing')).toBeInTheDocument();
  });
});

describe('RoleHomeRedirect', () => {
  it('sends staff home to New Order instead of Dashboard', () => {
    mocks.currentRole = 'staff';

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RoleHomeRedirect />} />
          <Route path="/orders/new" element={<div>New Order Landing</div>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText('New Order Landing')).toBeInTheDocument();
  });
});

