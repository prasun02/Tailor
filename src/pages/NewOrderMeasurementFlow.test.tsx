import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GarmentDesign } from '../features/designs/types';
import type { GarmentType, MeasurementField, MeasurementSet, StyleField } from '../features/measurements/types';
import { emptyOrderItem, type OrderItemFormValues } from '../features/orders/orderSchemas';
import { MeasurementStep, PreviewGarmentStep } from './NewOrderPage';

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
    ...values,
  };
}

function MeasurementHarness({ initialItem = item(), errors = {} }: { initialItem?: OrderItemFormValues; errors?: Record<string, string> }) {
  const [items, setItems] = useState<OrderItemFormValues[]>([initialItem]);

  return (
    <MemoryRouter>
      <MeasurementStep
        customerId="customer-1"
        items={items}
        garments={garments}
        designs={designs}
        measurements={measurements}
        defaultUnit="inch"
        errors={errors}
        onFabricUploadStateChange={vi.fn()}
        onUpdateItem={(itemId, patch) => setItems((current) => current.map((entry) => (entry.id === itemId ? { ...entry, ...patch } : entry)))}
      />
    </MemoryRouter>
  );
}

describe('New order style, measurement, and fabric flow', () => {
  it('shows style options before measurement fields and hides corrupted Bangla labels', () => {
    render(<MeasurementHarness />);

    const styleHeading = screen.getByRole('heading', { name: 'Style Options' });
    const measurementHeading = screen.getByRole('heading', { name: 'Measurements' });

    expect(styleHeading.compareDocumentPosition(measurementHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByLabelText(/Sleeve type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Shirt length/i)).toBeInTheDocument();
    expect(screen.queryByText(/\?{2,}/)).not.toBeInTheDocument();
  });

  it('shows fabric URL preview and keeps skip as a non-blocking choice', async () => {
    const user = userEvent.setup();
    const { container } = render(<MeasurementHarness />);
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
    expect(screen.getByText('29')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/fabric.jpg')).toBeInTheDocument();
    expect(screen.getByText('Estimated preview only. Final fitting depends on tailoring.')).toBeInTheDocument();
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
    expect(screen.getAllByText('Measurement summary').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Style summary').length).toBeGreaterThan(0);
  });
});
