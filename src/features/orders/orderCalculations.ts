import type { OrderItemFormValues, OrderWizardValues } from './orderSchemas';

export function lineTotal(item: Pick<OrderItemFormValues, 'quantity' | 'unitPrice'>): number {
  return Number(item.quantity || 0) * Number(item.unitPrice || 0);
}

export function subtotal(items: Pick<OrderItemFormValues, 'quantity' | 'unitPrice'>[]): number {
  return items.reduce((sum, item) => sum + lineTotal(item), 0);
}

export function totalAfterDiscount(items: Pick<OrderItemFormValues, 'quantity' | 'unitPrice'>[], discountAmount: number): number {
  return Math.max(subtotal(items) - Number(discountAmount || 0), 0);
}

export function dueAfterAdvance(values: Pick<OrderWizardValues, 'items' | 'discountAmount' | 'advanceAmount'>): number {
  return Math.max(totalAfterDiscount(values.items, values.discountAmount) - Number(values.advanceAmount || 0), 0);
}

export function isNegativeOrderValue(value: number): boolean {
  return Number(value) < 0;
}

export function createDuplicateSubmitGuard() {
  let submitting = false;

  return {
    begin() {
      if (submitting) {
        return false;
      }
      submitting = true;
      return true;
    },
    end() {
      submitting = false;
    },
    get isSubmitting() {
      return submitting;
    },
  };
}
