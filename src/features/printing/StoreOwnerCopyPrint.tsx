import type { OrderDetail } from '../orders/orderService';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { PrintHeader } from './PrintHeader';
import { PrintImageThumb } from './PrintImageThumb';
import { PrintMeasurementTable } from './PrintMeasurementTable';
import { PrintStyleSummary } from './PrintStyleSummary';
import {
  designForPrint,
  latestCompletedPayment,
  paymentMethodLabel,
  printedAtDhaka,
  recordFromPrintValue,
  shortUserId,
  type ShopBrand,
} from './printModel';

type StoreOwnerCopyPrintProps = {
  detail: OrderDetail;
  shop: ShopBrand;
  printedBy?: string;
  printedAt?: Date;
};

export function StoreOwnerCopyPrint({ detail, shop, printedBy = 'Current user', printedAt = new Date() }: StoreOwnerCopyPrintProps) {
  const { order, customer, items, payments, financial } = detail;
  const latestPayment = latestCompletedPayment(detail);

  return (
    <section className="print-document store-copy" data-testid="store-copy">
      <PrintHeader shop={shop} title="Owner / Store Copy" subtitle="Complete internal order summary" orderNumber={order.order_number} />

      <div className="print-section print-meta-grid">
        <Meta label="Customer" value={customer?.name ?? 'Unknown customer'} />
        <Meta label="Mobile" value={customer?.phone ?? 'Not set'} />
        <Meta label="Address" value={customer?.address ?? 'Not set'} />
        <Meta label="Order Date" value={formatDate(order.order_date)} />
        <Meta label="Trial Date" value={formatDate(order.trial_date)} />
        <Meta label="Delivery Date" value={formatDate(order.delivery_date)} />
        <Meta label="Created By" value={shortUserId(order.created_by)} />
        <Meta label="Printed By" value={printedBy} />
        <Meta label="Printed Date/Time" value={printedAtDhaka(printedAt)} />
        <Meta label="Payment Method" value={latestPayment ? paymentMethodLabel(latestPayment.payment_method) : 'Not paid'} />
        <Meta label="Payment Reference" value={latestPayment?.reference ?? 'Not set'} />
        <Meta label="Order Status" value={order.overall_status.replace(/_/g, ' ')} />
      </div>

      <section className="print-section">
        <h2 className="print-section-title">Financial Summary</h2>
        <div className="print-two-column">
          <Amount label="Subtotal" value={formatCurrency(order.subtotal)} />
          <Amount label="Discount" value={formatCurrency(order.discount_amount)} />
          <Amount label="Total Amount" value={formatCurrency(order.total_amount)} />
          <Amount label="Advance Paid" value={formatCurrency(financial.totalPaid)} />
          <Amount label="Due Amount" value={formatCurrency(financial.dueAmount)} />
          <Amount label="Payment State" value={financial.paymentState} />
        </div>
      </section>

      <div className="print-section store-layout">
        <section>
          <h2 className="print-section-title">Garment Items</h2>
          {items.map((item) => {
            const design = designForPrint(item);
            const designLabel = design.code ? `${design.name} (${design.code})` : design.name;

            return (
              <article key={item.id} className="print-item-card print-section">
                <div className="print-two-column">
                  <Meta label="Garment" value={item.garment_name_snapshot} />
                  <Meta label="Quantity" value={String(item.quantity)} />
                  <Meta label="Unit Price" value={formatCurrency(item.unit_price)} />
                  <Meta label="Line Total" value={formatCurrency(item.line_total)} />
                  <Meta label="Design" value={designLabel} />
                  <Meta label="Assigned Worker" value={shortUserId(item.assigned_to)} />
                  <Meta label="Production Status" value={item.production_status.replace(/_/g, ' ')} />
                  <Meta label="Item Delivery" value={formatDate(item.item_delivery_date ?? order.delivery_date)} />
                </div>
                <div className="print-section">
                  <div className="print-image-row">
                    <PrintImageThumb src={design.designImageUrl} label="Design Thumbnail" compact />
                    <PrintImageThumb src={design.fabricImageUrl} label="Fabric Thumbnail" compact />
                  </div>
                </div>
                {item.special_instructions ? (
                  <div className="print-note-box print-section">
                    <strong>Special Instructions:</strong> {item.special_instructions}
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>

        <section>
          {items.map((item) => (
            <article key={item.id} className="print-item-card print-section">
              <h2 className="print-section-title">{item.garment_name_snapshot} Details</h2>
              <PrintMeasurementTable values={recordFromPrintValue(item.measurement_snapshot)} title="Full Measurements" />
              <PrintStyleSummary values={recordFromPrintValue(item.style_snapshot)} title="Style Options" />
            </article>
          ))}
        </section>
      </div>

      <section className="print-section">
        <h2 className="print-section-title">Payment History Summary</h2>
        {payments.length === 0 ? (
          <p className="print-muted">No payments recorded.</p>
        ) : (
          <table className="print-table">
            <thead>
              <tr>
                <th>Paid At</th>
                <th>Amount</th>
                <th>Payment Method</th>
                <th>Payment Reference</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td>{formatDateTime(payment.paid_at)}</td>
                  <td>{formatCurrency(payment.amount)}</td>
                  <td>{paymentMethodLabel(payment.payment_method)}</td>
                  <td>{payment.reference ?? 'Not set'}</td>
                  <td>{payment.payment_status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {order.notes ? (
        <div className="print-note-box print-section">
          <strong>Order Notes:</strong> {order.notes}
        </div>
      ) : null}

      <div className="print-signature-grid">
        <div className="print-signature-line">Owner Signature</div>
        <div className="print-signature-line">Customer Signature</div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-meta-box">
      <span className="print-label">{label}</span>
      <span className="print-value">{value}</span>
    </div>
  );
}

function Amount({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-meta-box">
      <span className="print-label">{label}</span>
      <span className="print-value">{value}</span>
    </div>
  );
}
