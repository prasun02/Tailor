import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GarmentDesign } from '../features/designs/types';
import type { GarmentType } from '../features/measurements/types';
import { emptyOrderItem, type OrderItemFormValues } from '../features/orders/orderSchemas';
import { DesignSelectionStep } from './NewOrderPage';

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
  {
    id: 'garment-pant',
    shop_id: 'shop-1',
    name: 'Pant',
    name_bn: null,
    code: 'PANT',
    description: null,
    sort_order: 2,
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
    style_category: 'Full sleeve',
    preview_image_url: 'https://example.com/shirt.jpg',
    preview_video_url: null,
    cloth_reference_url: 'https://example.com/library-cloth.jpg',
    tags: ['formal', 'office'],
    description: 'Office friendly full sleeve design',
    style_metadata: { fit: 'Regular fit', collar: 'Classic' },
    sort_order: 1,
    is_active: true,
    created_by: 'user-1',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  },
  {
    id: 'design-pant',
    shop_id: 'shop-1',
    garment_type_id: 'garment-pant',
    design_name: 'Slim Pant',
    design_code: 'PT_001',
    style_category: 'Slim',
    preview_image_url: 'https://example.com/pant.jpg',
    preview_video_url: null,
    cloth_reference_url: null,
    tags: ['slim'],
    description: null,
    style_metadata: {},
    sort_order: 2,
    is_active: true,
    created_by: 'user-1',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  },
];

function shirtItem(): OrderItemFormValues {
  return {
    ...emptyOrderItem(),
    id: 'item-1',
    garmentTypeId: 'garment-shirt',
    quantity: 1,
    unitPrice: 1200,
  };
}

function renderDesignStep({
  item = shirtItem(),
  availableDesigns = designs,
  designSearch = '',
  onUpdateItem = vi.fn<(itemId: string, patch: Partial<OrderItemFormValues>) => void>(),
}: {
  item?: OrderItemFormValues;
  availableDesigns?: GarmentDesign[];
  designSearch?: string;
  onUpdateItem?: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
} = {}) {
  render(
    <MemoryRouter>
      <DesignSelectionStep
        items={[item]}
        garments={garments}
        designs={availableDesigns}
        designSearch={designSearch}
        setDesignSearch={vi.fn()}
        isLoading={false}
        canManageDesigns
        onUpdateItem={onUpdateItem}
      />
    </MemoryRouter>,
  );

  return { onUpdateItem };
}

describe('DesignSelectionStep', () => {
  it('filters thumbnails by garment type and tag search', () => {
    renderDesignStep({ designSearch: 'office' });

    expect(screen.getByText('Full sleeve formal shirt')).toBeInTheDocument();
    expect(screen.queryByText('Slim Pant')).not.toBeInTheDocument();
  });

  it('selects a design through the preview modal without changing fabric reference', async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn<(itemId: string, patch: Partial<OrderItemFormValues>) => void>();
    renderDesignStep({ onUpdateItem });

    await user.click(screen.getByRole('button', { name: /full sleeve formal shirt/i }));
    expect(screen.getByRole('heading', { name: /full sleeve formal shirt/i })).toBeInTheDocument();
    expect(screen.getByText('Office friendly full sleeve design')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /choose this design/i }));

    expect(onUpdateItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        designId: 'design-shirt',
        previewVideoUrl: '',
      }),
    );
    expect(onUpdateItem.mock.calls[0]?.[1]).not.toHaveProperty('fabricReferenceUrl');
  });

  it('does not ask for fabric media during design selection', () => {
    renderDesignStep();

    expect(screen.queryByLabelText(/fabric/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fabric \/ Cloth Reference/i)).not.toBeInTheDocument();
  });

  it('shows an empty state and fallback thumbnail', () => {
    const brokenDesign: GarmentDesign = { ...designs[0], preview_image_url: 'https://example.com/missing.jpg' };
    const { container } = render(
      <MemoryRouter>
        <DesignSelectionStep
          items={[shirtItem()]}
          garments={garments}
          designs={[brokenDesign]}
          designSearch=""
          setDesignSearch={vi.fn()}
          isLoading={false}
          canManageDesigns={false}
          onUpdateItem={vi.fn()}
        />
      </MemoryRouter>,
    );

    const image = container.querySelector('img');
    expect(image).not.toBeNull();
    if (!image) throw new Error('Expected a design thumbnail image.');
    fireEvent.error(image);
    expect(screen.getByLabelText(/image unavailable/i)).toBeInTheDocument();
  });

  it('shows a garment-specific empty state when no designs exist', () => {
    renderDesignStep({ availableDesigns: [] });

    expect(screen.getByText('No designs added for Shirt yet. Add designs from Design Library.')).toBeInTheDocument();
  });
});
