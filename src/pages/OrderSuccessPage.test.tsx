import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderSuccessPage } from './OrderSuccessPage';

const orderDetail = {
  order: {
    id: 'order-1',
    shop_id: 'shop-1',
    order_number: 'ORD-202607-00001',
    customer_id: 'customer-1',
    order_date: '2026-07-08',
    trial_date: null,
    delivery_date: '2026-07-12',
    priority: 'normal',
    overall_status: 'confirmed',
    subtotal: 1500,
    discount_amount: 0,
    total_amount: 1500,
    notes: null,
    created_by: 'user-1',
    delivered_at: null,
    created_at: '2026-07-08T08:00:00.000Z',
    updated_at: '2026-07-08T08:00:00.000Z',
    deleted_at: null,
  },
  customer: {
    id: 'customer-1',
    shop_id: 'shop-1',
    customer_code: 'CUS-1',
    name: 'Nila Akter',
    normalized_name: 'nila akter',
    phone: '01712345678',
    normalized_phone: '01712345678',
    alternative_phone: null,
    address: 'Dhaka',
    notes: null,
    is_active: true,
    created_by: 'user-1',
    created_at: '2026-07-08T08:00:00.000Z',
    updated_at: '2026-07-08T08:00:00.000Z',
    deleted_at: null,
  },
  items: [],
  payments: [],
  statusHistory: [],
  financial: {
    totalPaid: 500,
    dueAmount: 1000,
    paymentState: 'partial',
  },
};

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({
    currentShopId: 'shop-1',
  }),
}));

vi.mock('../features/orders/orderHooks', () => ({
  useOrderDetail: () => ({ data: orderDetail, isLoading: false, isError: false, error: null }),
}));

describe('OrderSuccessPage', () => {
  it('renders order success summary and print quick actions', () => {
    render(
      <MemoryRouter initialEntries={['/orders/order-1/success']}>
        <Routes>
          <Route path="/orders/:orderId/success" element={<OrderSuccessPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /order created successfully/i })).toBeInTheDocument();
    expect(screen.getByText(/ORD-202607-00001/i)).toBeInTheDocument();
    expect(screen.getByText('Nila Akter')).toBeInTheDocument();
    expect(screen.getByText(/Due Amount:/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /print customer token/i })).toHaveAttribute('href', '/orders/order-1/print/customer-token?autoprint=1');
    expect(screen.getByRole('link', { name: /print production copy/i })).toHaveAttribute('href', '/orders/order-1/print/production-copy?autoprint=1');
    expect(screen.getByRole('link', { name: /print store copy/i })).toHaveAttribute('href', '/orders/order-1/print/store-copy?autoprint=1');
    expect(screen.getByRole('link', { name: /open order detail/i })).toHaveAttribute('href', '/orders/order-1');
    expect(screen.getByRole('link', { name: /create new order/i })).toHaveAttribute('href', '/orders/new');
  });
});
