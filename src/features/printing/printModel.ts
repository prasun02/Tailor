import { appBrand } from '../../app/brand';
import type { OrderDetail } from '../orders/orderService';

export type ShopBrand = {
  name: string;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
};

export type PrintEntry = {
  key: string;
  label: string;
  value: string;
};

export type PrintItemDesign = {
  name: string;
  code: string | null;
  category: string | null;
  designImageUrl: string | null;
  fabricImageUrl: string | null;
};

type OrderItem = OrderDetail['items'][number];

const genericShopNames = new Set([
  'tailor store manager',
  'tailor store app',
  'tailor store',
  'smart tailor manager',
  'denim-cut',
  'denim cut',
  'tailor shop',
  'example tailors',
  'nipu tailors',
  'nipun tailors',
]);
const genericPhones = new Set(['01700000000']);
const genericAddresses = new Set(['shop address', 'barisal']);

type ShopBrandInput = {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
  logo_url?: string | null;
};

function brandedText(value: string | null | undefined, fallback: string, genericValues?: Set<string>): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return fallback;
  }

  if (genericValues?.has(trimmed.toLowerCase())) {
    return fallback;
  }

  return trimmed;
}

export function withShopBrandDefaults(shop?: ShopBrandInput | null): ShopBrand {
  return {
    name: brandedText(shop?.name ?? null, appBrand.name, genericShopNames),
    phone: brandedText(shop?.phone ?? null, appBrand.phone, genericPhones),
    address: brandedText(shop?.address ?? null, appBrand.address, genericAddresses),
    logo_url: shop?.logo_url?.trim() || appBrand.logoUrl || null,
  };
}

export function fallbackShopBrand(name?: string | null): ShopBrand {
  return withShopBrandDefaults({ name });
}


export function recordFromPrintValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function labelFromKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function printValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map(printValue).filter(Boolean).join(', ');
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  if (typeof value === 'object') {
    return '';
  }

  return String(value);
}

export function snapshotEntries(values: Record<string, unknown>): PrintEntry[] {
  return Object.entries(values)
    .map(([key, value]) => ({ key, label: labelFromKey(key), value: printValue(value) }))
    .filter((entry) => entry.value.trim().length > 0);
}

function stringFromRecord(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

export function designForPrint(item: OrderItem): PrintItemDesign {
  const design = recordFromPrintValue(item.design_snapshot);
  const previewSummary = recordFromPrintValue(item.preview_summary);
  const name =
    stringFromRecord(design, ['design_name', 'name', 'selectedDesign', 'design']) ??
    stringFromRecord(previewSummary, ['selectedDesign', 'design']) ??
    'Custom design';
  const code = stringFromRecord(design, ['design_code', 'code']);
  const category =
    stringFromRecord(design, ['style_category', 'styleCategory']) ??
    stringFromRecord(previewSummary, ['styleCategory', 'style_category']);
  const designImageUrl =
    item.design_reference_url?.trim() ||
    stringFromRecord(design, ['preview_image_url', 'designImageUrl']) ||
    stringFromRecord(previewSummary, ['designImageUrl']) ||
    null;
  const fabricImageUrl =
    item.fabric_reference_url?.trim() ||
    stringFromRecord(previewSummary, ['fabricReferenceUrl', 'fabric_reference_url']) ||
    null;

  return { name, code, category, designImageUrl, fabricImageUrl };
}

export function shortUserId(value: string | null | undefined): string {
  return value ? value.slice(0, 8) : 'Unassigned';
}

export function paymentMethodLabel(value: string): string {
  return labelFromKey(value);
}

export function completedPaymentTotal(detail: OrderDetail): number {
  return detail.payments
    .filter((payment) => payment.payment_status === 'completed')
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
}

export function latestCompletedPayment(detail: OrderDetail): OrderDetail['payments'][number] | null {
  return detail.payments.find((payment) => payment.payment_status === 'completed') ?? null;
}

export function printedAtDhaka(date = new Date()): string {
  return new Intl.DateTimeFormat('en-BD', {
    timeZone: 'Asia/Dhaka',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
