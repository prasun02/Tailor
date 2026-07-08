import { describe, expect, it } from 'vitest';
import { dueAfterAdvance } from './orderCalculations';
import { buildCreateOrderPayload } from './orderPayload';
import { emptyOrderItem, emptyOrderWizardValues, isOrderStatus, isPaymentState, isProductionStatus, orderWizardSchema, paymentFormSchema } from './orderSchemas';

describe('order filter guards', () => {
  it('narrows valid generated status values', () => {
    expect(isOrderStatus('confirmed')).toBe(true);
    expect(isProductionStatus('cutting')).toBe(true);
    expect(isPaymentState('partial')).toBe(true);
  });

  it('rejects arbitrary strings', () => {
    expect(isOrderStatus('unknown')).toBe(false);
    expect(isProductionStatus('almost_done')).toBe(false);
    expect(isPaymentState('refunded')).toBe(false);
  });

  it('requires delivery date and supports multiple garment items', () => {
    const firstItem = {
      ...emptyOrderItem(),
      garmentTypeId: 'garment-shirt',
      measurementMode: 'previous' as const,
      measurementSetId: 'measurement-shirt',
      quantity: 1,
      unitPrice: 1200,
    };
    const secondItem = {
      ...emptyOrderItem(),
      garmentTypeId: 'garment-pant',
      measurementMode: 'new' as const,
      measurementValues: { waist: 34, length: 40 },
      quantity: 2,
      unitPrice: 900,
    };

    const missingDelivery = orderWizardSchema.safeParse({
      ...emptyOrderWizardValues(),
      customerId: 'customer-1',
      deliveryDate: '',
      items: [firstItem, secondItem],
    });

    expect(missingDelivery.success).toBe(false);

    const valid = orderWizardSchema.safeParse({
      ...emptyOrderWizardValues(),
      customerId: 'customer-1',
      deliveryDate: '2026-07-20',
      discountAmount: 100,
      advanceAmount: 500,
      items: [firstItem, secondItem],
    });

    expect(valid.success).toBe(true);
    if (!valid.success) throw new Error('Expected order wizard values to be valid.');
    expect(valid.data.items).toHaveLength(2);
  });

  it('previews due amount without mutating database totals', () => {
    const values = {
      ...emptyOrderWizardValues(),
      discountAmount: 200,
      advanceAmount: 500,
      items: [
        { ...emptyOrderItem(), quantity: 2, unitPrice: 750 },
        { ...emptyOrderItem(), quantity: 1, unitPrice: 900 },
      ],
    };

    expect(dueAfterAdvance(values)).toBe(1700);
  });

  it('preserves style snapshot and reference URL in the create-order payload', () => {
    const item = {
      ...emptyOrderItem(),
      garmentTypeId: 'garment-shirt',
      measurementMode: 'previous' as const,
      measurementSetId: 'measurement-shirt',
      quantity: 1,
      unitPrice: 1500,
      styleValues: { sleeve_type: 'Full sleeve', fit: 'Slim' },
      designReferenceUrl: 'https://example.com/reference.jpg',
    };

    const payload = buildCreateOrderPayload(
      {
        ...emptyOrderWizardValues(),
        customerId: 'customer-1',
        deliveryDate: '2026-07-20',
        items: [item],
      },
      {},
    );

    expect(payload.items[0].style_snapshot).toEqual({ sleeve_type: 'Full sleeve', fit: 'Slim' });
    expect(payload.items[0].measurement_set_id).toBe('measurement-shirt');
    expect(payload.items[0].design_reference_url).toBe('https://example.com/reference.jpg');
  });

  it('validates payment amount before recording additional or final payment', () => {
    expect(paymentFormSchema.safeParse({ amount: 0, paymentMethod: 'cash', allowOverpayment: false }).success).toBe(false);
    expect(paymentFormSchema.safeParse({ amount: 500, paymentMethod: 'cash', allowOverpayment: false }).success).toBe(true);
  });
});
