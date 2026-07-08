import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerProfilePage } from './CustomerProfilePage';
import { NewCustomerPage } from './NewCustomerPage';

const mocks = vi.hoisted(() => {
  const customer = {
    id: 'customer-1',
    shop_id: 'shop-1',
    customer_code: 'CUS-1',
    name: 'Nila Akter',
    normalized_name: 'nila akter',
    phone: '01712345678',
    normalized_phone: '01712345678',
    alternative_phone: null,
    address: 'Dhaka',
    notes: 'Prefers blue fabric',
    is_active: true,
    created_by: 'user-1',
    created_at: '2026-07-01T10:00:00.000Z',
    updated_at: '2026-07-01T10:00:00.000Z',
    deleted_at: null,
  };

  return {
    createCustomer: vi.fn(),
    archiveCustomer: vi.fn(),
    restoreCustomer: vi.fn(),
    profile: {
      customer,
      summary: {
        latestOrder: null,
        upcomingDelivery: null,
        outstandingAmount: 0,
        totalPaid: 0,
      },
      orders: [],
      payments: [],
      measurements: [],
    },
  };
});

vi.mock('../features/auth/authContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'owner@example.com' } }),
}));

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({
    currentRole: 'owner',
    currentShopId: 'shop-1',
  }),
}));

vi.mock('../features/customers/customerHooks', () => ({
  useCreateCustomer: () => ({ mutateAsync: mocks.createCustomer, isPending: false, error: null }),
  useDuplicateCustomerPhone: () => ({ data: null, isFetching: false, error: null }),
  useCustomer: () => ({ data: mocks.profile, isLoading: false, isError: false, error: null }),
  useArchiveCustomer: () => ({ mutateAsync: mocks.archiveCustomer, isPending: false, error: null }),
  useRestoreCustomer: () => ({ mutateAsync: mocks.restoreCustomer, isPending: false, error: null }),
}));

describe('customer create and view flow', () => {
  beforeEach(() => {
    mocks.createCustomer.mockReset();
    mocks.archiveCustomer.mockReset();
    mocks.restoreCustomer.mockReset();
    mocks.createCustomer.mockResolvedValue(mocks.profile.customer);
  });

  it('creates a customer and opens the customer profile with mocked services', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/customers/new']}>
        <Routes>
          <Route path="/customers/new" element={<NewCustomerPage />} />
          <Route path="/customers/:customerId" element={<CustomerProfilePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/customer name/i), 'Nila Akter');
    await user.type(screen.getByLabelText(/^phone/i), '01712345678');
    await user.click(screen.getByRole('button', { name: /save and open customer/i }));

    expect(mocks.createCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Nila Akter', phone: '01712345678' }),
    );
    expect(await screen.findByRole('heading', { name: 'Nila Akter' })).toBeInTheDocument();
    expect(screen.getByText('CUS-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /notes/i }));
    expect(screen.getByText(/prefers blue fabric/i)).toBeInTheDocument();
  });
});


