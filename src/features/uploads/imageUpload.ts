import { getSupabaseClient } from '../../services/supabaseClient';

export const IMAGE_UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const ACCEPTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'] as const;

export type ImageUploadBucket = 'design-assets' | 'order-fabric-images';

export type ImageUploadResult = {
  path: string;
  publicUrl: string;
};

type ImageUploadRequest = {
  bucket: ImageUploadBucket;
  shopId: string;
  folder: string;
  file: File;
};

function fileExtension(fileName: string): string {
  return fileName.split('.').pop()?.trim().toLowerCase() ?? '';
}

function isAcceptedExtension(extension: string): boolean {
  return ACCEPTED_IMAGE_EXTENSIONS.some((accepted) => accepted === extension);
}

function isAcceptedMimeType(mimeType: string): boolean {
  return ACCEPTED_IMAGE_TYPES.some((accepted) => accepted === mimeType);
}

function cleanPathSegment(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function cleanFolderPath(folder: string): string {
  return folder
    .split('/')
    .map(cleanPathSegment)
    .filter(Boolean)
    .join('/');
}

function normalizeShopId(shopId: string): string {
  const normalized = shopId.trim();

  if (!normalized) {
    throw new Error('Select an active shop before uploading an image.');
  }

  if (normalized.includes('/')) {
    throw new Error('Invalid shop id for storage upload.');
  }

  return normalized;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function storageErrorMessage(bucket: ImageUploadBucket, message: string): string {
  if (/bucket.*not.*found|not.*found|does not exist/i.test(message)) {
    return `Storage bucket "${bucket}" is not configured. Create it in Supabase Storage or use the URL field. Required bucket name: ${bucket}.`;
  }

  return message;
}

export function validateImageFile(file: File): string | null {
  const extension = fileExtension(file.name);
  const mimeType = file.type.trim().toLowerCase();

  if (!isAcceptedExtension(extension) || (mimeType && !isAcceptedMimeType(mimeType))) {
    return 'Upload a JPG, JPEG, PNG, or WEBP image.';
  }

  if (file.size > IMAGE_UPLOAD_MAX_BYTES) {
    return 'Image must be 5 MB or smaller.';
  }

  return null;
}

export async function uploadImageToStorage({ bucket, shopId, folder, file }: ImageUploadRequest): Promise<ImageUploadResult> {
  const validationError = validateImageFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const normalizedShopId = normalizeShopId(shopId);
  const extension = fileExtension(file.name);
  const folderPath = cleanFolderPath(folder);
  const objectPath = [normalizedShopId, folderPath, `${randomId()}.${extension}`].filter(Boolean).join('/');
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: '31536000',
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error(storageErrorMessage(bucket, error.message));
  }

  const path = data?.path ?? objectPath;
  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

  if (!publicUrlData.publicUrl) {
    throw new Error(`Could not build a public URL for the uploaded ${bucket} image.`);
  }

  return {
    path,
    publicUrl: publicUrlData.publicUrl,
  };
}
