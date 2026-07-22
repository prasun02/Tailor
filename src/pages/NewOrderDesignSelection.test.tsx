import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { GarmentType } from '../features/measurements/types';
import { emptyOrderItem, type OrderItemFormValues } from '../features/orders/orderSchemas';
import { DesignSelectionStep, GarmentDesignStep } from './NewOrderPage';

const garments: GarmentType[] = [
  garment('garment-suit', 'Suit', 'SUIT', 1),
  garment('garment-shirt', 'Shirt', 'SHIRT', 2),
  garment('garment-pant', 'Pant', 'PANT', 3),
  garment('garment-panjabi', 'Panjabi', 'PANJABI', 4),
];


function garment(id: string, name: string, code: string, sortOrder: number): GarmentType {
  return {
    id,
    shop_id: 'shop-1',
    name,
    name_bn: null,
    code,
    description: null,
    sort_order: sortOrder,
    is_active: true,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    deleted_at: null,
  };
}

function itemFor(garmentTypeId: string): OrderItemFormValues {
  return {
    ...emptyOrderItem(),
    id: 'item-1',
    garmentTypeId,
    quantity: 1,
    unitPrice: 1200,
  };
}

function renderDesignStep({
  item = itemFor('garment-shirt'),
  onUpdateItem = vi.fn<(itemId: string, patch: Partial<OrderItemFormValues>) => void>(),
  onContinueToMeasurement = vi.fn(),
}: {
  item?: OrderItemFormValues;
  onUpdateItem?: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  onContinueToMeasurement?: () => void;
} = {}) {
  render(
    <MemoryRouter>
      <DesignSelectionStep
        items={[item]}
        garments={garments}
        errors={{}}
        onUpdateItem={onUpdateItem}
        onContinueToMeasurement={onContinueToMeasurement}
      />
    </MemoryRouter>,
  );

  return { onUpdateItem, onContinueToMeasurement };
}

async function openDesignSheet(garmentTypeId = 'garment-shirt') {
  const user = userEvent.setup();
  renderDesignStep({ item: itemFor(garmentTypeId) });

  await user.click(screen.getByRole('button', { name: /choose design sheet/i }));

  return { user, dialog: screen.getByRole('dialog', { name: /design selection/i }) };
}

describe('DesignSelectionStep', () => {
  it('opens all suit categories together and removes the forced next-category workflow', async () => {
    const { dialog } = await openDesignSheet('garment-suit');
    const sheet = within(dialog);

    expect(screen.getByRole('dialog', { name: /suit design selection/i })).toBeInTheDocument();
    expect(sheet.getAllByText('Lapel Design').length).toBeGreaterThan(0);
    expect(sheet.getAllByText('Satin Lapel').length).toBeGreaterThan(0);
    expect(sheet.getAllByText('Jacket Pocket').length).toBeGreaterThan(0);
    expect(sheet.getAllByText('Trouser Bottom').length).toBeGreaterThan(0);
    expect(sheet.getAllByText('Fit Type').length).toBeGreaterThan(0);
    expect(sheet.getAllByTestId('design-category-panel')).toHaveLength(13);
    expect(sheet.getByTestId('design-sheet-category-grid')).toHaveClass('lg:grid-cols-3', '2xl:grid-cols-4');
    expect(sheet.queryByText('Collar Type')).not.toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: /next category/i })).not.toBeInTheDocument();
  });

  it.each([
    ['garment-shirt', /shirt design selection/i, ['Collar Type', 'Cuff Type', 'Placket Style', 'Contrast Options', 'Additional Details'], ['Waistband Style', 'Lapel Design']],
    ['garment-pant', /pant design selection/i, ['Front Style', 'Waistband Style', 'Fly Type'], ['Collar Type', 'Lapel Design']],
    ['garment-panjabi', /panjabi design selection/i, ['Collar Type', 'Placket Style', 'Embroidery / Detailing'], ['Trouser Front', 'Jacket Pocket']],
  ])('shows only the selected garment family categories for %s', async (garmentTypeId, dialogName, expectedCategories, excludedCategories) => {
    const { dialog } = await openDesignSheet(garmentTypeId);
    const sheet = within(dialog);

    expect(screen.getByRole('dialog', { name: dialogName })).toBeInTheDocument();
    expectedCategories.forEach((category) => expect(sheet.getAllByText(category).length).toBeGreaterThan(0));
    excludedCategories.forEach((category) => expect(sheet.queryByText(category)).not.toBeInTheDocument());
  });

  it('selects an option directly from the sheet and marks the category selected', async () => {
    const { user, dialog } = await openDesignSheet();
    const sheet = within(dialog);

    await user.click(sheet.getByRole('button', { name: /^select spread$/i }));

    expect(sheet.getByRole('button', { name: /^selected spread$/i })).toHaveAttribute('aria-pressed', 'true');
    expect(sheet.getByText(/1 \/ 14 categories/i)).toBeInTheDocument();
    expect(sheet.getAllByText('Spread').length).toBeGreaterThan(0);
  });

  it('opens an option preview popup and can choose from the popup', async () => {
    const { user, dialog } = await openDesignSheet();
    const sheet = within(dialog);

    await user.click(sheet.getAllByRole('button', { name: /^preview spread$/i })[0]);

    expect(screen.getByRole('dialog', { name: /spread/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /choose this option/i }));

    expect(sheet.getByRole('button', { name: /^selected spread$/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('validates required categories before continuing to measurement', async () => {
    const user = userEvent.setup();
    const onContinueToMeasurement = vi.fn();
    renderDesignStep({ onContinueToMeasurement });

    await user.click(screen.getByRole('button', { name: /choose design sheet/i }));
    await user.click(screen.getByRole('button', { name: /continue to measurement/i }));

    expect(screen.getByText(/Please select required design options before measurement: Collar Type, Cuff Type, Sleeve Type, Fit Type\./i)).toBeInTheDocument();
    expect(onContinueToMeasurement).not.toHaveBeenCalled();
  });

  it('continues to measurement after saving a complete required design snapshot', async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn<(itemId: string, patch: Partial<OrderItemFormValues>) => void>();
    const onContinueToMeasurement = vi.fn();
    renderDesignStep({ onUpdateItem, onContinueToMeasurement });

    await user.click(screen.getByRole('button', { name: /choose design sheet/i }));
    const dialog = screen.getByRole('dialog', { name: /shirt design selection/i });
    const sheet = within(dialog);

    await user.click(sheet.getByRole('button', { name: /^select spread$/i }));
    await user.click(sheet.getByRole('button', { name: /^select single round$/i }));
    await user.click(sheet.getByRole('button', { name: /^select full sleeve$/i }));
    await user.click(sheet.getByRole('button', { name: /^select slim fit$/i }));
    await user.click(sheet.getByRole('button', { name: /continue to measurement/i }));

    expect(onContinueToMeasurement).toHaveBeenCalledTimes(1);
    expect(onUpdateItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        designSnapshot: expect.objectContaining({
          garmentType: 'Shirt',
          selectedCategories: expect.arrayContaining([
            expect.objectContaining({ categoryKey: 'collar_type', categoryName: 'Collar Type' }),
            expect.objectContaining({ categoryKey: 'cuff_type', categoryName: 'Cuff Type' }),
            expect.objectContaining({ categoryKey: 'sleeve_type', categoryName: 'Sleeve Type' }),
            expect.objectContaining({ categoryKey: 'fit_type', categoryName: 'Fit Type' }),
          ]),
          summary: expect.stringContaining('Spread'),
        }),
        styleValues: expect.objectContaining({
          collar_type: 'Spread',
          cuff_type: 'Single Round',
          sleeve_type: 'Full Sleeve',
          fit_type: 'Slim Fit',
        }),
      }),
    );
  });

  it('saves an incomplete selection without jumping to measurement', async () => {
    const user = userEvent.setup();
    const onUpdateItem = vi.fn<(itemId: string, patch: Partial<OrderItemFormValues>) => void>();
    renderDesignStep({ onUpdateItem });

    await user.click(screen.getByRole('button', { name: /choose design sheet/i }));
    const dialog = screen.getByRole('dialog', { name: /shirt design selection/i });
    const sheet = within(dialog);
    await user.click(sheet.getByRole('button', { name: /^select spread$/i }));
    await user.click(sheet.getByRole('button', { name: /^save selection$/i }));

    expect(sheet.getByText('Design selection saved.')).toBeInTheDocument();
    expect(onUpdateItem).toHaveBeenCalledWith(
      'item-1',
      expect.objectContaining({
        designSnapshot: expect.objectContaining({
          categories: [expect.objectContaining({ categoryKey: 'collar_type' })],
          selectedCategories: [expect.objectContaining({ categoryKey: 'collar_type' })],
        }),
      }),
    );
  });

  it('removes uploaded library design samples from the order-entry flow', () => {
    renderDesignStep();

    expect(screen.getByRole('button', { name: /choose design/i })).toBeInTheDocument();
    expect(screen.queryByText(/search uploaded library designs/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/optional uploaded design sample/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/full sleeve formal shirt/i)).not.toBeInTheDocument();
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument();
  });

  it('does not ask for fabric media during design detail selection', () => {
    renderDesignStep();

    expect(screen.queryByLabelText(/fabric/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fabric \/ Cloth Reference/i)).not.toBeInTheDocument();
  });
  it('keeps garment and design selection free of payment and delivery fields', () => {
    render(
      <MemoryRouter>
        <GarmentDesignStep
          items={[itemFor('garment-shirt')]}
          garments={garments}
          defaultUnit="inch"
          errors={{}}
          onAddItem={vi.fn()}
          onRemoveItem={vi.fn()}
          onUpdateItem={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText(/select garment item/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /choose design sheet/i })).toBeInTheDocument();
    expect(screen.getByText(/no visual design details selected yet/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/quantity/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/unit price/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/delivery date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/assigned worker/i)).not.toBeInTheDocument();
  });
});
