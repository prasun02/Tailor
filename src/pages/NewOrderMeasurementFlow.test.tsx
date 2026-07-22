import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GarmentDesign } from '../features/designs/types';
import type { GarmentType, MeasurementField, MeasurementSet, StyleField } from '../features/measurements/types';
import { emptyOrderItem, emptyOrderWizardValues, type OrderItemFormValues } from '../features/orders/orderSchemas';
import { FabricReferenceStep, FinalPreviewStep, MeasurementStep, PaymentDeliveryStep, PreviewGarmentStep, StyleOptionsStep } from './NewOrderPage';

const mocks = vi.hoisted(() => ({
  styleFields: [
    {
      id: 'style-sleeve',
      shop_id: 'shop-1',
      garment_type_id: 'garment-shirt',
      label: 'Sleeve type',
      label_bn: '????? ???',
      field_key: 'sleeve_type',
      field_type: 'select',
      options: ['Full sleeve', 'Half sleeve'],
      is_required: true,
      sort_order: 1,
      is_active: true,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: null,
    },
  ] satisfies StyleField[],
  measurementFields: [
    {
      id: 'measurement-length',
      shop_id: 'shop-1',
      garment_type_id: 'garment-shirt',
      label: 'Shirt length',
      label_bn: '??????? ?????',
      field_key: 'shirt_length',
      field_type: 'number',
      unit: 'inch',
      placeholder: null,
      help_text: null,
      minimum_value: 0,
      maximum_value: 120,
      step_value: 0.25,
      is_required: true,
      sort_order: 1,
      is_active: true,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
      deleted_at: null,
    },
  ] satisfies MeasurementField[],
}));

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({
    currentRole: 'owner',
    currentShopId: 'shop-1',
  }),
}));

vi.mock('../features/measurements/configurationHooks', () => ({
  useStyleFields: () => ({ data: mocks.styleFields, isLoading: false, isError: false, error: null }),
  useMeasurementFields: () => ({ data: mocks.measurementFields, isLoading: false, isError: false, error: null }),
}));

const garments: GarmentType[] = [
  {
    id: 'garment-shirt',
    shop_id: 'shop-1',
    name: 'Shirt',
    name_bn: null,
    code: 'SHIRT',
    description: null,
    sort_order: 1,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  },
];

const designs: GarmentDesign[] = [
  {
    id: 'design-shirt',
    shop_id: 'shop-1',
    garment_type_id: 'garment-shirt',
    design_name: 'Full sleeve formal shirt',
    design_code: 'SH_005',
    style_category: 'Formal',
    preview_image_url: 'https://example.com/shirt.jpg',
    preview_video_url: null,
    cloth_reference_url: null,
    tags: ['formal'],
    description: null,
    style_metadata: { fit: 'Regular fit' },
    sort_order: 1,
    is_active: true,
    created_by: 'user-1',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  },
];

const measurements: MeasurementSet[] = [];

const visualDesignSnapshot = {
  source: 'built_in_catalog',
  garmentType: 'Shirt',
  garmentFamily: 'shirt',
  design_name: 'Shirt Design Details',
  design_code: 'BUILT_IN_SHIRT_DESIGN',
  name: 'Shirt Design Details',
  code: 'BUILT_IN_SHIRT_DESIGN',
  categories: [
    {
      categoryKey: 'collar_type',
      categoryName: 'Collar Type',
      selectionType: 'single',
      selectedOptions: [
        {
          optionKey: 'spread_collar',
          optionName: 'Spread Collar',
          description: 'Spread Collar for collar type.',
          svgIconKey: 'collar_type_spread_collar',
          imageUrl: null,
        },
      ],
    },
  ],
  summary: 'Spread Collar',
};
function item(values: Partial<OrderItemFormValues> = {}): OrderItemFormValues {
  return {
    ...emptyOrderItem(),
    id: 'item-1',
    garmentTypeId: 'garment-shirt',
    designId: 'design-shirt',
    measurementMode: 'new',
    measurementValues: { shirt_length: 29 },
    styleValues: { sleeve_type: 'Full sleeve' },
    fabricReferenceMode: 'skip',
    designSnapshot: visualDesignSnapshot,
    ...values,
  };
}

function StyleHarness({ initialItem = item(), errors = {} }: { initialItem?: OrderItemFormValues; errors?: Record<string, string> }) {
  const [items, setItems] = useState<OrderItemFormValues[]>([initialItem]);

  return (
    <MemoryRouter>
      <StyleOptionsStep
        items={items}
        garments={garments}
        errors={errors}
        onUpdateItem={(itemId, patch) => setItems((current) => current.map((entry) => (entry.id === itemId ? { ...entry, ...patch } : entry)))}
      />
    </MemoryRouter>
  );
}

function MeasurementHarness({ initialItem = item(), errors = {} }: { initialItem?: OrderItemFormValues; errors?: Record<string, string> }) {
  const [items, setItems] = useState<OrderItemFormValues[]>([initialItem]);

  return (
    <MemoryRouter>
      <MeasurementStep
        customerId="customer-1"
        items={items}
        garments={garments}
        measurements={measurements}
        defaultUnit="inch"
        errors={errors}
        onUpdateItem={(itemId, patch) => setItems((current) => current.map((entry) => (entry.id === itemId ? { ...entry, ...patch } : entry)))}
      />
    </MemoryRouter>
  );
}

function FabricHarness({ initialItem = item(), errors = {} }: { initialItem?: OrderItemFormValues; errors?: Record<string, string> }) {
  const [items, setItems] = useState<OrderItemFormValues[]>([initialItem]);

  return (
    <MemoryRouter>
      <FabricReferenceStep
        items={items}
        garments={garments}
        measurements={measurements}
        errors={errors}
        onFabricUploadStateChange={vi.fn()}
        onUpdateItem={(itemId, patch) => setItems((current) => current.map((entry) => (entry.id === itemId ? { ...entry, ...patch } : entry)))}
      />
    </MemoryRouter>
  );
}

describe('New order style, measurement, and fabric flow', () => {
  it('shows style options before measurement fields and hides corrupted Bangla labels', () => {
    render(
      <>
        <StyleHarness />
        <MeasurementHarness />
      </>,
    );

    const styleIntro = screen.getByText(/Select the garment style choices after design selection/i);
    const measurementIntro = screen.getByText(/Enter garment-specific measurements with the selected design summary visible/i);

    expect(styleIntro.compareDocumentPosition(measurementIntro) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText(/Sleeve type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shirt length/i)).toBeInTheDocument();
    expect(screen.getByText('Measurement focus from selected design')).toBeInTheDocument();
    expect(screen.getByText(/Full Sleeve selected: include sleeve length, cuff, and wrist\./i)).toBeInTheDocument();
    expect(screen.queryByText(/\?{2,}/)).not.toBeInTheDocument();
  });

  it('shows measurement before fabric reference in the separated workflow', () => {
    render(
      <>
        <MeasurementHarness />
        <FabricHarness />
      </>,
    );

    const measurementIntro = screen.getByText(/Enter garment-specific measurements with the selected design summary visible/i);
    const fabricIntro = screen.getByText(/Add the actual customer-selected cloth reference after measurements/i);

    expect(measurementIntro.compareDocumentPosition(fabricIntro) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('shows fabric URL preview and keeps skip as a non-blocking choice', async () => {
    const user = userEvent.setup();
    const { container } = render(<FabricHarness />);
    const fabricSection = screen.getByRole('heading', { name: 'Fabric / Cloth Reference' }).closest('section');

    if (!fabricSection) throw new Error('Expected the fabric reference section to render.');
    expect(within(fabricSection).getAllByText('Skipped').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: /use url/i }));
    await user.type(screen.getByLabelText(/fabric image url/i), 'https://example.com/fabric.jpg');

    expect(container.querySelector('img[src="https://example.com/fabric.jpg"]')).not.toBeNull();
  });

  it('renders estimated preview with design, style, measurement, warning, and fabric as separate media', () => {
    const { container } = render(
      <PreviewGarmentStep
        items={[item({ fabricReferenceUrl: 'https://example.com/fabric.jpg', fabricReferenceMode: 'url' })]}
        garments={garments}
        designs={designs}
        measurements={measurements}
      />,
    );

    expect(screen.getByText(/Item 1 estimated garment preview/i)).toBeInTheDocument();
    expect(screen.getByText('Full sleeve formal shirt - Formal')).toBeInTheDocument();
    expect(screen.getByText('Selected Design')).toBeInTheDocument();
    expect(screen.getByText('Fabric / Cloth Reference')).toBeInTheDocument();
    expect(screen.getAllByText(/Full sleeve/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Spread Collar/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('29').length).toBeGreaterThan(0);
    expect(screen.queryByText('https://example.com/fabric.jpg')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /open image/i }).some((link) => link.getAttribute('href') === 'https://example.com/fabric.jpg')).toBe(true);
    expect(screen.getByText('Estimated visual preview. Final fitting depends on tailoring and fabric behavior.')).toBeInTheDocument();
    expect(container.querySelector('img[src="https://example.com/shirt.jpg"]')).not.toBeNull();
    expect(container.querySelector('img[src="https://example.com/fabric.jpg"]')).not.toBeNull();
  });

  it('shows skipped fabric status without replacing it with the design image', () => {
    render(
      <PreviewGarmentStep
        items={[item({ fabricReferenceUrl: '', fabricReferenceMode: 'skip' })]}
        garments={garments}
        designs={designs}
        measurements={measurements}
      />,
    );

    const fabricSection = screen.getByText('Fabric / Cloth Reference').closest('section');

    if (!fabricSection) throw new Error('Expected fabric section to render.');
    expect(within(fabricSection).getAllByText('Skipped').length).toBeGreaterThan(0);
    expect(within(fabricSection).queryByText('Full sleeve formal shirt')).not.toBeInTheDocument();
  });

  it('opens the big estimated preview modal', async () => {
    const user = userEvent.setup();
    render(
      <PreviewGarmentStep
        items={[item({ fabricReferenceUrl: 'https://example.com/fabric.jpg', fabricReferenceMode: 'url' })]}
        garments={garments}
        designs={designs}
        measurements={measurements}
      />,
    );

    await user.click(screen.getByRole('button', { name: /open big preview/i }));

    expect(screen.getByRole('dialog', { name: /shirt estimated preview/i })).toBeInTheDocument();
    expect(screen.getAllByText('Key measurements').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Style summary').length).toBeGreaterThan(0);
  });

  it('renders preview navigation actions when callbacks are provided', () => {
    render(
      <PreviewGarmentStep
        items={[item()]}
        garments={garments}
        designs={designs}
        measurements={measurements}
        onBackToStyle={vi.fn()}
        onBackToMeasurement={vi.fn()}
        onContinue={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /back to design details/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to measurement/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^continue$/i })).toBeInTheDocument();
  });

  it('renders final preview as customer, order, garment, and payment sections', () => {
    const values = {
      ...emptyOrderWizardValues(),
      orderDate: '2026-07-08',
      trialDate: '2026-07-10',
      deliveryDate: '2026-07-12',
      priority: 'high' as const,
      discountAmount: 100,
      advanceAmount: 500,
      items: [item({ quantity: 1, unitPrice: 1500, specialInstructions: 'Use white buttons' })],
    };

    render(
      <FinalPreviewStep
        values={values}
        customerDraft={{ name: 'Nila Akter', phone: '01712345678', alternativePhone: '', email: '', address: 'Dhaka', notes: '' }}
        selectedCustomer={null}
        garments={garments}
        measurements={measurements}
        subtotalValue={1500}
        totalValue={1400}
        dueValue={900}
      />,
    );

    expect(screen.getByText('Faabrico')).toBeInTheDocument();
    expect(screen.getByText('Bespoke Tailoring Order & Production Desk')).toBeInTheDocument();
    expect(screen.getByText('Customer Information')).toBeInTheDocument();
    expect(screen.getByText('Garment Information')).toBeInTheDocument();
    expect(screen.getByText('Design Selection Summary')).toBeInTheDocument();
    expect(screen.getByText('Measurement Summary')).toBeInTheDocument();
    expect(screen.getByText('Fabric Reference')).toBeInTheDocument();
    expect(screen.getByText('Estimated Visual Preview')).toBeInTheDocument();
    expect(screen.getByText('Payment Summary')).toBeInTheDocument();
    expect(screen.getByText('Will be generated')).toBeInTheDocument();
    expect(screen.getAllByText('Spread Collar').length).toBeGreaterThan(0);
    expect(screen.getByText('Use white buttons')).toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
    expect(screen.queryByText('Estimated visual preview. Final fitting depends on tailoring and fabric behavior.')).not.toBeInTheDocument();
  });
  it('keeps pricing, payment, delivery, worker, and priority fields in Payment + Delivery', () => {
    function PaymentHarness() {
      const [values, setValues] = useState({
        ...emptyOrderWizardValues(),
        orderDate: '2026-07-08',
        deliveryDate: '2026-07-12',
        items: [item({ quantity: 1, unitPrice: 1500 })],
      });

      return (
        <PaymentDeliveryStep
          values={values}
          garments={garments}
          members={[{ user_id: 'worker-1', role: 'tailor' }]}
          canAssign
          setValues={setValues}
          onUpdateItem={vi.fn()}
          errors={{}}
        />
      );
    }

    render(<PaymentHarness />);

    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/unit price/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/discount/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/advance payment/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payment method/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/order date/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/delivery date/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/assigned worker/i)).toBeInTheDocument();
    expect(screen.getByText('Due')).toBeInTheDocument();
  });
});
