import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GarmentType } from '../features/measurements/types';
import { DesignLibrarySettingsPage } from './DesignLibrarySettingsPage';

const mocks = vi.hoisted(() => ({
  createDesign: vi.fn(),
  uploadImageToStorage: vi.fn(),
  garments: [
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
  ] satisfies GarmentType[],
}));

vi.mock('../features/shop/shopContext', () => ({
  useShop: () => ({
    currentRole: 'owner',
    currentShopId: 'shop-1',
  }),
}));

vi.mock('../features/measurements/configurationHooks', () => ({
  useGarmentTypes: () => ({ data: mocks.garments, isLoading: false }),
}));

vi.mock('../features/designs/designHooks', () => ({
  useGarmentDesigns: () => ({ data: [], isLoading: false, isError: false, error: null }),
  useCreateGarmentDesign: () => ({ mutateAsync: mocks.createDesign, isPending: false, error: null }),
  useUpdateGarmentDesign: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useArchiveGarmentDesign: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
  useRestoreGarmentDesign: () => ({ mutateAsync: vi.fn(), isPending: false, error: null }),
}));

vi.mock('../features/uploads/imageUpload', async () => {
  const actual = await vi.importActual<typeof import('../features/uploads/imageUpload')>('../features/uploads/imageUpload');

  return {
    ...actual,
    uploadImageToStorage: mocks.uploadImageToStorage,
  };
});

describe('DesignLibrarySettingsPage', () => {
  beforeEach(() => {
    mocks.createDesign.mockReset();
    mocks.uploadImageToStorage.mockReset();
  });

  it('submits a new design and previews the image URL before save', async () => {
    const user = userEvent.setup();
    mocks.createDesign.mockResolvedValue({ id: 'design-1' });
    const { container } = render(<DesignLibrarySettingsPage />);

    await user.selectOptions(screen.getByLabelText(/garment type/i), 'garment-shirt');
    await user.type(screen.getByLabelText(/design name/i), 'Full sleeve formal shirt');
    await user.type(screen.getByLabelText(/design code/i), 'SH_005');
    await user.type(screen.getByLabelText(/style category/i), 'Full sleeve');
    await user.type(screen.getByLabelText(/preview image url/i), 'https://example.com/shirt.jpg');
    await user.type(screen.getByLabelText(/tags/i), 'formal, office');

    expect(container.querySelector('img[src="https://example.com/shirt.jpg"]')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: /create design/i }));

    await waitFor(() => {
      expect(mocks.createDesign).toHaveBeenCalledWith(
        expect.objectContaining({
          garmentTypeId: 'garment-shirt',
          name: 'Full sleeve formal shirt',
          code: 'SH_005',
          styleCategory: 'Full sleeve',
          previewImageUrl: 'https://example.com/shirt.jpg',
          tagsText: 'formal, office',
        }),
      );
    });
  });

  it('validates preview image upload type before saving', async () => {
    const user = userEvent.setup({ applyAccept: false });
    render(<DesignLibrarySettingsPage />);

    const invalidImage = new File(['not-image'], 'shirt.gif', { type: 'image/gif' });
    await user.upload(screen.getByLabelText(/preview image upload/i), invalidImage);

    expect(await screen.findByText('Upload a JPG, JPEG, PNG, or WEBP image.')).toBeInTheDocument();
    expect(mocks.createDesign).not.toHaveBeenCalled();
  });

  it('shows a missing bucket warning and still allows the URL option', async () => {
    const user = userEvent.setup();
    mocks.createDesign.mockResolvedValue({ id: 'design-1' });
    mocks.uploadImageToStorage.mockRejectedValue(new Error('Storage bucket "design-assets" is not configured. Create it in Supabase Storage or use the URL field. Required bucket name: design-assets.'));
    render(<DesignLibrarySettingsPage />);

    await user.selectOptions(screen.getByLabelText(/garment type/i), 'garment-shirt');
    await user.type(screen.getByLabelText(/design name/i), 'Classic panjabi');
    await user.type(screen.getByLabelText(/design code/i), 'PNJ_001');
    await user.upload(screen.getByLabelText(/preview image upload/i), new File(['image'], 'panjabi.jpg', { type: 'image/jpeg' }));

    expect(await screen.findByText(/Required bucket name: design-assets/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/preview image url/i), 'https://example.com/panjabi.jpg');
    await user.click(screen.getByRole('button', { name: /create design/i }));

    await waitFor(() => {
      expect(mocks.createDesign).toHaveBeenCalledWith(expect.objectContaining({ previewImageUrl: 'https://example.com/panjabi.jpg' }));
    });
  });
});
