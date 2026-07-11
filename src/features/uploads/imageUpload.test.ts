import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_UPLOAD_MAX_BYTES, uploadImageToStorage, validateImageFile } from './imageUpload';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  upload: vi.fn(),
  getPublicUrl: vi.fn(),
}));

vi.mock('../../services/supabaseClient', () => ({
  getSupabaseClient: () => ({
    storage: {
      from: (bucket: string) => {
        mocks.from(bucket);
        return {
          upload: mocks.upload,
          getPublicUrl: mocks.getPublicUrl,
        };
      },
    },
  }),
}));

beforeEach(() => {
  mocks.from.mockReset();
  mocks.upload.mockReset();
  mocks.getPublicUrl.mockReset();
});

describe('validateImageFile', () => {
  it('accepts jpg, jpeg, png, and webp images for design or fabric uploads', () => {
    expect(validateImageFile(new File(['image'], 'design.jpg', { type: 'image/jpeg' }))).toBeNull();
    expect(validateImageFile(new File(['image'], 'design.jpeg', { type: 'image/jpeg' }))).toBeNull();
    expect(validateImageFile(new File(['image'], 'fabric.png', { type: 'image/png' }))).toBeNull();
    expect(validateImageFile(new File(['image'], 'fabric.webp', { type: 'image/webp' }))).toBeNull();
  });

  it('rejects unsupported image types', () => {
    expect(validateImageFile(new File(['image'], 'design.gif', { type: 'image/gif' }))).toBe('Upload a JPG, JPEG, PNG, or WEBP image.');
    expect(validateImageFile(new File(['image'], 'fabric.svg', { type: 'image/svg+xml' }))).toBe('Upload a JPG, JPEG, PNG, or WEBP image.');
  });

  it('rejects images larger than 5 MB', () => {
    const oversizedImage = new File([new Uint8Array(IMAGE_UPLOAD_MAX_BYTES + 1)], 'fabric.png', { type: 'image/png' });

    expect(validateImageFile(oversizedImage)).toBe('Image must be 5 MB or smaller.');
  });

  it('uploads with a shop-safe path and preserved extension', async () => {
    mocks.upload.mockResolvedValue({ data: { path: 'shop-1/designs/generated.webp' }, error: null });
    mocks.getPublicUrl.mockReturnValue({ data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/design-assets/shop-1/designs/generated.webp' } });

    const result = await uploadImageToStorage({
      bucket: 'design-assets',
      shopId: 'shop-1',
      folder: 'designs',
      file: new File(['image'], 'formal shirt.webp', { type: 'image/webp' }),
    });

    expect(mocks.from).toHaveBeenCalledWith('design-assets');
    expect(mocks.upload.mock.calls[0]?.[0]).toMatch(/^shop-1\/designs\/[-a-zA-Z0-9]+\.webp$/);
    expect(result.publicUrl).toContain('/design-assets/shop-1/designs/');
  });

  it('blocks upload when shop id is unavailable', async () => {
    await expect(uploadImageToStorage({
      bucket: 'order-fabric-images',
      shopId: '',
      folder: 'orders/item-1',
      file: new File(['image'], 'fabric.png', { type: 'image/png' }),
    })).rejects.toThrow('Select an active shop before uploading an image.');

    expect(mocks.upload).not.toHaveBeenCalled();
  });

  it('turns a missing bucket response into a clear warning', async () => {
    mocks.upload.mockResolvedValue({ data: null, error: { message: 'Bucket not found' } });

    await expect(uploadImageToStorage({
      bucket: 'design-assets',
      shopId: 'shop-1',
      folder: 'designs',
      file: new File(['image'], 'design.jpg', { type: 'image/jpeg' }),
    })).rejects.toThrow('Storage bucket "design-assets" is not configured. Create it in Supabase Storage or use the URL field. Required bucket name: design-assets.');
  });
});
