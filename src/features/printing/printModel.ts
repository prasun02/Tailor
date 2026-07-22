import { appBrand } from '../../app/brand';
import type { OrderDetail } from '../orders/orderService';
import {
  designDisplayForOrderItem,
  displayEntries,
  displayValue,
  labelFromKey,
  recordFromUnknown,
} from '../orders/orderDisplayUtils';
import { designSummaryFromSnapshot } from '../design-selection/designSelectionUtils';

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
  fabricStatus: 'Added' | 'Skipped';
  summary: string;
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
  return recordFromUnknown(value);
}

export { labelFromKey };

export function printValue(value: unknown): string {
  return displayValue(value);
}

export function snapshotEntries(values: Record<string, unknown>): PrintEntry[] {
  return displayEntries(values);
}

export function designForPrint(item: OrderItem): PrintItemDesign {
  const design = designDisplayForOrderItem(item);

  return { ...design, summary: designSummaryFromSnapshot(item.design_snapshot) };
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
