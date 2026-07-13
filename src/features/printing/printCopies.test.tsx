import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { OrderDetail } from '../orders/orderService';
import { AllPrintCopies } from './AllPrintCopies';
import { CustomerTokenPrint } from './CustomerTokenPrint';
import { ProductionJobCardPrint } from './ProductionJobCardPrint';
import { StoreOwnerCopyPrint } from './StoreOwnerCopyPrint';
import type { ShopBrand } from './printModel';

const shop: ShopBrand = {
  name: 'Nipu Tailors',
  phone: '01700000000',
  address: 'Barisal',
  logo_url: 'https://example.com/logo.png',
};

const detail: OrderDetail = {
  order: {
    id: 'order-1',
    shop_id: 'shop-1',
    order_number: 'ORD-202607-00001',
    customer_id: 'customer-1',
    order_date: '2026-07-08',
    trial_date: '2026-07-10',
    delivery_date: '2026-07-12',
    priority: 'normal',
    overall_status: 'ready',
    subtotal: 1500,
    discount_amount: 100,
    total_amount: 1400,
    notes: 'Handle carefully',
    created_by: 'user-123456',
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
      measurement_snapshot: { chest: 44, length: 29 },
      style_snapshot: { sleeve_type: 'Full sleeve', collar: 'Classic' },
      special_instructions: 'Use white buttons',
      assigned_to: 'worker-123456',
      production_status: 'ready',
      item_delivery_date: '2026-07-12',
      design_reference_url: 'https://example.com/shirt.jpg',
      design_id: 'design-1',
      design_snapshot: {
        design_name: 'Saved Classic Shirt',
        design_code: 'SHIRT_CLASSIC',
        style_category: 'Classic',
        preview_image_url: 'https://example.com/shirt.jpg',
      },
      preview_summary: { fit: 'Regular fit', measurement_count: 2 },
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
      amount: 500,
      payment_method: 'cash',
      payment_status: 'completed',
      reference: 'TXN-1',
      notes: null,
      paid_at: '2026-07-08T08:00:00.000Z',
      received_by: 'user-1',
      voided_at: null,
      voided_by: null,
      void_reason: null,
      created_at: '2026-07-08T08:00:00.000Z',
    },
  ],
  statusHistory: [],
  financial: {
    totalPaid: 500,
    dueAmount: 900,
    paymentState: 'partial',
  },
};

describe('print copies', () => {
  it('renders a customer token with branding, payment summary, and no full measurements or style details', () => {
    render(<CustomerTokenPrint detail={detail} shop={shop} />);

    expect(screen.getByTestId('customer-token-copy')).toBeInTheDocument();
    expect(screen.getByText('Nipu Tailors')).toBeInTheDocument();
    expect(screen.getByAltText('Nipu Tailors logo')).toBeInTheDocument();
    expect(screen.getByText('ORD-202607-00001')).toBeInTheDocument();
    expect(screen.getByText('Nila Akter')).toBeInTheDocument();
    expect(screen.getByText('12 Jul 2026')).toBeInTheDocument();
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('Advance Paid')).toBeInTheDocument();
    expect(screen.getByText('Due Amount')).toBeInTheDocument();
    expect(screen.queryByText('Chest')).not.toBeInTheDocument();
    expect(screen.queryByText('Full sleeve')).not.toBeInTheDocument();
    expect(screen.queryByText('Use white buttons')).not.toBeInTheDocument();
  });

  it('renders a production copy with snapshots and without pricing', () => {
    render(<ProductionJobCardPrint detail={detail} shop={shop} />);

    expect(screen.getByTestId('production-copy')).toBeInTheDocument();
    expect(screen.getByText('Full Measurement Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('44')).toBeInTheDocument();
    expect(screen.getByText('Sleeve Type')).toBeInTheDocument();
    expect(screen.getByText('Full sleeve')).toBeInTheDocument();
    expect(screen.getByText('Use white buttons')).toBeInTheDocument();
    expect(screen.queryByText('Total Amount')).not.toBeInTheDocument();
    expect(screen.queryByText('Advance Paid')).not.toBeInTheDocument();
    expect(screen.queryByText('Due Amount')).not.toBeInTheDocument();
    expect(screen.queryByText(/BDT/)).not.toBeInTheDocument();
    expect(screen.getByText('[ ] Cutting')).toBeInTheDocument();
    expect(screen.getByText('[ ] Stitching')).toBeInTheDocument();
    expect(screen.getByText('[ ] Finishing')).toBeInTheDocument();
    expect(screen.getByText('[ ] QC')).toBeInTheDocument();
    expect(screen.getByText('[ ] Ready')).toBeInTheDocument();
  });

  it('renders a store copy with full order and payment details', () => {
    render(<StoreOwnerCopyPrint detail={detail} shop={shop} printedBy="owner@example.com" printedAt={new Date('2026-07-11T08:00:00.000Z')} />);

    expect(screen.getByTestId('store-copy')).toBeInTheDocument();
    expect(screen.getByText('Dhaka')).toBeInTheDocument();
    expect(screen.getByText('Trial Date')).toBeInTheDocument();
    expect(screen.getByText('Total Amount')).toBeInTheDocument();
    expect(screen.getByText('Discount')).toBeInTheDocument();
    expect(screen.getAllByText('Payment Method').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Payment Reference').length).toBeGreaterThan(0);
    expect(screen.getAllByText('TXN-1').length).toBeGreaterThan(0);
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Full Measurements')).toBeInTheDocument();
    expect(screen.getByText('Full sleeve')).toBeInTheDocument();
  });

  it('separates all copies with print page breaks', () => {
    const { container } = render(<AllPrintCopies detail={detail} shop={shop} />);

    expect(screen.getByTestId('all-print-copies')).toBeInTheDocument();
    expect(container.querySelectorAll('.print-page')).toHaveLength(3);
    expect(screen.getByTestId('customer-token-copy')).toBeInTheDocument();
    expect(screen.getByTestId('production-copy')).toBeInTheDocument();
    expect(screen.getByTestId('store-copy')).toBeInTheDocument();
  });

  it('uses saved order snapshots and handles missing images without crashing', () => {
    const missingImageDetail: OrderDetail = {
      ...detail,
      items: [
        {
          ...detail.items[0],
          measurement_snapshot: { chest: 46 },
          style_snapshot: { collar: 'Band' },
          design_reference_url: null,
          design_snapshot: { design_name: 'Snapshot Design', design_code: 'SNAP-1' },
          fabric_reference_url: null,
        },
      ],
    };

    render(<ProductionJobCardPrint detail={missingImageDetail} shop={{ ...shop, logo_url: null }} />);

    expect(screen.getByText('Snapshot Design (SNAP-1)')).toBeInTheDocument();
    expect(screen.getByText('46')).toBeInTheDocument();
    expect(screen.getByText('Band')).toBeInTheDocument();
    expect(screen.getAllByText('No image').length).toBeGreaterThanOrEqual(2);
  });
});
