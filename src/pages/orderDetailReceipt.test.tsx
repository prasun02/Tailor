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
    email: null,
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
      measurement_snapshot: { chest: 40, length: 29, keyMeasurements: [{ label: 'Waist', value: 34 }] },
      style_snapshot: { sleeve_type: 'Full sleeve', extras: [{ label: 'Collar', value: 'Band' }] },
      special_instructions: 'Use white buttons',
      assigned_to: 'worker-1',
      production_status: 'ready',
      item_delivery_date: '2026-07-12',
      design_reference_url: 'https://example.com/shirt.jpg',
      design_id: 'design-1',
      design_snapshot: { DESIGN_NAME: 'Classic Shirt', DESIGN_CODE: 'SHIRT_CLASSIC', STYLE_CATEGORY: 'Classic', DESIGNIMAGEURL: 'https://example.com/shirt.jpg' },
      preview_summary: {
        ESTIMATEDFIT: 'Regular fit',
        KEYMEASUREMENTS: [{ label: 'Chest', value: 40 }],
        STYLE_SUMMARY: ['Sleeve Type: Full sleeve'],
        FABRICREFERENCEURL: 'https://example.com/cloth.jpg',
      },
      fabric_reference_url: 'https://example.com/cloth.jpg',
      preview_video_url: null,
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
    currentShop: { id: 'shop-1', name: 'Faabrico', timezone: 'Asia/Dhaka', currency: 'BDT', default_measurement_unit: 'inch' },
  }),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({ data: { name: 'Faabrico', phone: '+880 1714-793555', address: '5th Floor, Lake Manor, House 9 Rd 35, Gulshan 2, Dhaka' }, isLoading: false, isError: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useMutation: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

vi.mock('../features/sms/smsHooks', () => ({
  useOrderSmsLogs: () => ({ data: [], isLoading: false, error: null }),
  useSendOrderSms: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));
vi.mock('../features/orders/orderHooks', () => ({
  useOrderDetail: () => ({ data: orderDetail, isLoading: false, isError: false, error: null }),
  useArchiveOrder: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useVoidOrderPayment: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useChangeOrderItemStatus: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useConfirmOrderDelivery: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

describe('OrderDetailPage print section rendering', () => {
  it('renders professional item sections and never exposes raw snapshot internals', () => {
    render(
      <MemoryRouter initialEntries={['/orders/order-1?created=1']}>
        <Routes>
          <Route path="/orders/:orderId" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getAllByText('ORD-202607-00001').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Classic Shirt/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/SHIRT_CLASSIC/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /print copies/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^customer token$/i })).toHaveAttribute('href', '/orders/order-1/print/customer-token?autoprint=1');
    expect(screen.getByRole('link', { name: /^production copy$/i })).toHaveAttribute('href', '/orders/order-1/print/production-copy?autoprint=1');
    expect(screen.getByRole('link', { name: /^store copy$/i })).toHaveAttribute('href', '/orders/order-1/print/store-copy?autoprint=1');
    expect(screen.getByRole('link', { name: /print all copies/i })).toHaveAttribute('href', '/orders/order-1/print/all?autoprint=1');
    expect(screen.getByRole('link', { name: /open customer token preview/i })).toHaveAttribute('href', '/orders/order-1/print/customer-token');
    expect(screen.getAllByText('Selected Design').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fabric Reference').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Style Choices').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Measurements').length).toBeGreaterThan(0);
    expect(screen.getByText('Fit / Preview Summary')).toBeInTheDocument();
    expect(screen.getAllByText('Open image').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /mark delivered/i })).toBeInTheDocument();

    const renderedText = document.body.textContent ?? '';
    expect(renderedText).not.toMatch(/DESIGNIMAGEURL|KEYMEASUREMENTS|ESTIMATEDFIT|STYLE_COUNT|FABRICREFERENCEURL|\[object Object\]|https:\/\/example\.com\/cloth\.jpg/);
  });
});

