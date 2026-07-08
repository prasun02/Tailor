import { z } from 'zod';
import type { OrderPriority, OrderStatus, PaymentMethod, ProductionStatus } from '../../types/database';

export const orderPriorities: OrderPriority[] = ['low', 'normal', 'high', 'urgent'];
export const orderStatuses: OrderStatus[] = ['draft', 'confirmed', 'in_progress', 'ready', 'partially_delivered', 'delivered', 'cancelled'];
export const productionStatuses: ProductionStatus[] = [
  'order_received',
  'measurement_confirmed',
  'cutting',
  'stitching',
  'finishing',
  'ironing',
  'quality_check',
  'ready',
  'delivered',
  'cancelled',
];
export const paymentMethods: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'mobile_banking', 'other'];
export const paymentStates = ['all', 'unpaid', 'partial', 'paid', 'overpaid'] as const;

export function isOrderStatus(value: string): value is OrderStatus {
  return orderStatuses.some((status) => status === value);
}

export function isProductionStatus(value: string): value is ProductionStatus {
  return productionStatuses.some((status) => status === value);
}

export function isPaymentState(value: string): value is PaymentState {
  return paymentStates.some((state) => state === value);
}

const optionalDate = z.string().trim().optional().or(z.literal(''));
const optionalText = z.string().trim().optional().or(z.literal(''));
const nonNegativeNumber = z.coerce.number().min(0, 'Value cannot be negative.');

export const orderItemSchema = z.object({
  id: z.string(),
  garmentTypeId: z.string().min(1, 'Select a garment type.'),
  quantity: z.coerce.number().int('Quantity must be a whole number.').positive('Quantity must be greater than zero.'),
  measurementMode: z.enum(['previous', 'new']).default('new'),
  measurementSetId: optionalText,
  measurementUnit: z.enum(['inch', 'cm']).default('inch'),
  measurementValues: z.record(z.string(), z.unknown()).default({}),
  measurementNotes: optionalText,
  styleValues: z.record(z.string(), z.unknown()).default({}),
  specialInstructions: optionalText,
  assignedTo: optionalText,
  itemDeliveryDate: optionalDate,
  unitPrice: nonNegativeNumber,
  designReferenceUrl: optionalText,
}).refine(
  (value) => value.measurementMode === 'new' || Boolean(value.measurementSetId?.trim()),
  { message: 'Select a previous measurement or enter a new one.', path: ['measurementSetId'] },
);

export const orderWizardSchema = z
  .object({
    customerId: z.string().min(1, 'Select a customer.'),
    orderDate: z.string().min(1, 'Order date is required.'),
    trialDate: optionalDate,
    deliveryDate: z.string().min(1, 'Delivery date is required.'),
    priority: z.enum(orderPriorities),
    notes: optionalText,
    discountAmount: nonNegativeNumber,
    advanceAmount: nonNegativeNumber,
    paymentMethod: z.enum(paymentMethods),
    paymentReference: optionalText,
    items: z.array(orderItemSchema).min(1, 'Add at least one garment item.'),
  })
  .refine((value) => value.discountAmount <= value.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0), {
    message: 'Discount cannot exceed subtotal.',
    path: ['discountAmount'],
  })
  .refine(
    (value) => value.advanceAmount <= value.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0) - value.discountAmount,
    { message: 'Advance cannot exceed order total.', path: ['advanceAmount'] },
  );

export const paymentFormSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero.'),
  paymentMethod: z.enum(paymentMethods),
  reference: optionalText,
  notes: optionalText,
  allowOverpayment: z.boolean().default(false),
});

export const voidPaymentSchema = z.object({
  reason: z.string().trim().min(3, 'Void reason must be at least 3 characters.'),
});

export const orderEditSchema = z.object({
  orderDate: z.string().min(1, 'Order date is required.'),
  trialDate: optionalDate,
  deliveryDate: optionalDate,
  priority: z.enum(orderPriorities),
  notes: optionalText,
});

export type OrderItemFormValues = z.infer<typeof orderItemSchema>;
export type OrderWizardValues = z.infer<typeof orderWizardSchema>;
export type PaymentFormValues = z.infer<typeof paymentFormSchema>;
export type VoidPaymentValues = z.infer<typeof voidPaymentSchema>;
export type OrderEditValues = z.infer<typeof orderEditSchema>;
export type PaymentState = (typeof paymentStates)[number];

export type OrderListFilters = {
  search?: string;
  deliveryDate?: string;
  status?: OrderStatus | '';
  productionStatus?: ProductionStatus | '';
  paymentState?: PaymentState;
  overdueOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export const emptyOrderItem = (): OrderItemFormValues => ({
  id: crypto.randomUUID(),
  garmentTypeId: '',
  quantity: 1,
  measurementSetId: '',
  measurementMode: 'new',
  measurementUnit: 'inch',
  measurementValues: {},
  measurementNotes: '',
  styleValues: {},
  specialInstructions: '',
  assignedTo: '',
  itemDeliveryDate: '',
  unitPrice: 0,
  designReferenceUrl: '',
});

export const emptyOrderWizardValues = (): OrderWizardValues => ({
  customerId: '',
  orderDate: new Date().toISOString().slice(0, 10),
  trialDate: '',
  deliveryDate: '',
  priority: 'normal',
  notes: '',
  discountAmount: 0,
  advanceAmount: 0,
  paymentMethod: 'cash',
  paymentReference: '',
  items: [emptyOrderItem()],
});
