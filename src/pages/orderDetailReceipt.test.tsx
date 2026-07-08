import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { OrderDetailPage } from './OrderDetailPage';

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
    overall_status: 'ready',
    subtotal: 1500,
    discount_amount: 0,
    total_amount: 1500,
    notes: 'Handle carefully',
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
  items: [
    {
      id: 'item-1',
      shop_id: 'shop-1',
      order_id: 'order-1',
      garment_type_id: 'garment-1',
      garment_name_snapshot: 'Shirt',
      quantity: 1,
      unit_price: 1500,
      line_total: 1500,
      measurement_set_id: 'measurement-1',
      measurement_snapshot: { chest: 40, length: 29 },
      style_snapshot: { sleeve_type: 'Full sleeve' },
      special_instructions: 'Use white buttons',
      assigned_to: 'worker-1',
      production_status: 'ready',
      item_delivery_date: '2026-07-12',
      design_reference_url: 'https://example.com/shirt.jpg',
      created_at: '2026-07-08T08:00:00.000Z',
      updated_at: '2026-07-08T08:00:00.000Z',
    },
  ],
  payments: [
    {
      id: 'payment-1',
      shop_id: 'shop-1',
      order_id: 'order-1',
      amount: 1500,
      payment_method: 'cash',
      payment_status: 'completed',
      reference: null,
      notes: null,
      paid_at: '2026-07-08T08:00:00.000Z',
      received_by: 'user-1',
      voided_at: null,
      voided_by: null,
      void_reason: null,
      created_at: '2026-07-08T08:00:00.000Z',
    },
  ],
  statusHistory: [
    {
      id: 'history-1',
      shop_id: 'shop-1',
      order_id: 'order-1',
      order_item_id: 'item-1',
      previous_status: 'quality_check',
      new_status: 'ready',
      note: 'Ready',
      changed_by: 'user-1',
      changed_at: '2026-07-08T08:00:00.000Z',
    },
  ],
  financial: {
    totalPaid: 1500,
    dueAmount: 0,
    paymentState: 'paid',
  },
};

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({
    currentRole: 'owner',
    currentShopId: 'shop-1',
    currentShop: { id: 'shop-1', name: 'Nipu Tailors', timezone: 'Asia/Dhaka', currency: 'BDT', default_measurement_unit: 'inch' },
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { name: 'Nipu Tailors', phone: '01700000000', address: 'Barisal' }, isLoading: false, isError: false }),
}));

vi.mock('../features/orders/orderHooks', () => ({
  useOrderDetail: () => ({ data: orderDetail, isLoading: false, isError: false, error: null }),
  useArchiveOrder: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useVoidOrderPayment: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useChangeOrderItemStatus: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useConfirmOrderDelivery: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

describe('OrderDetailPage receipt rendering', () => {
  it('renders token, receipt totals, snapshots, and delivery action', () => {
    render(
      <MemoryRouter initialEntries={['/orders/order-1?created=1']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('ORD-202607-00001').length).toBeGreaterThan(0);
    expect(screen.getByText('Nipu Tailors')).toBeInTheDocument();
    expect(screen.getByText('Please bring this token during delivery.')).toBeInTheDocument();
    expect(screen.getByText('Measurement snapshot')).toBeInTheDocument();
    expect(screen.getByText('Style snapshot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mark delivered/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /print token\/job card/i })).toBeInTheDocument();
  });
});
