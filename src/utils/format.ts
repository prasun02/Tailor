import { format, parseISO } from 'date-fns';

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  try {
    return format(parseISO(value), 'dd MMM yyyy');
  } catch {
    return value;
  }
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return 'Not set';
  }

  try {
    return format(parseISO(value), 'dd MMM yyyy, h:mm a');
  } catch {
    return value;
  }
}

export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
