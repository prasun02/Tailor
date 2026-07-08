import type { Json } from '../../types/database';
import { validateStyleValues, type DynamicStyleFieldDefinition } from '../measurements/dynamicValidation';
import type { OrderWizardValues } from './orderSchemas';

export type CreateOrderPayload = {
  order_date: string;
  trial_date: string | null;
  delivery_date: string | null;
  priority: string;
  notes: string | null;
  discount_amount: number;
  items: Array<{
    garment_type_id: string;
    quantity: number;
    unit_price: number;
    measurement_set_id: string;
    style_snapshot: Record<string, unknown>;
    special_instructions: string | null;
    assigned_to: string | null;
    production_status: 'order_received';
    item_delivery_date: string | null;
    design_reference_url: string | null;
  }>;
  advance_payment: {
    amount: number;
    payment_method: string;
    reference: string | null;
    notes: string | null;
  };
};

export function nullableText(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed ? trimmed : null;
}

export function buildCreateOrderPayload(
  values: OrderWizardValues,
  styleDefinitionsByItemId: Record<string, DynamicStyleFieldDefinition[]>,
): CreateOrderPayload {
  const items = values.items.map((item) => {
    const styleDefinitions = styleDefinitionsByItemId[item.id] ?? [];
    const validation = styleDefinitions.length > 0
      ? validateStyleValues(styleDefinitions, item.styleValues)
      : { values: item.styleValues, errors: {} };

    if (Object.keys(validation.errors).length > 0) {
      throw new Error(Object.values(validation.errors)[0]);
    }

    return {
      garment_type_id: item.garmentTypeId,
      quantity: Number(item.quantity),
      unit_price: Number(item.unitPrice),
      measurement_set_id: item.measurementSetId ?? '',
      style_snapshot: validation.values as Record<string, unknown>,
      special_instructions: nullableText(item.specialInstructions),
      assigned_to: nullableText(item.assignedTo),
      production_status: 'order_received' as const,
      item_delivery_date: nullableText(item.itemDeliveryDate),
      design_reference_url: nullableText(item.designReferenceUrl),
    };
  });

  return {
    order_date: values.orderDate,
    trial_date: nullableText(values.trialDate),
    delivery_date: nullableText(values.deliveryDate),
    priority: values.priority,
    notes: nullableText(values.notes),
    discount_amount: Number(values.discountAmount || 0),
    items,
    advance_payment: {
      amount: Number(values.advanceAmount || 0),
      payment_method: values.paymentMethod,
      reference: nullableText(values.paymentReference),
      notes: null,
    },
  };
}

export function asJsonPayload(payload: CreateOrderPayload): Json {
  return payload as unknown as Json;
}

