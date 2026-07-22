import type { OrderDetail } from '../orders/orderService';
import { formatCurrency, formatDate } from '../../utils/format';
import { PrintHeader } from './PrintHeader';
import { PrintImageThumb } from './PrintImageThumb';
import { completedPaymentTotal, designForPrint, withShopBrandDefaults, type ShopBrand } from './printModel';

type CustomerTokenPrintProps = {
  detail: OrderDetail;
  shop: ShopBrand;
};

export function CustomerTokenPrint({ detail, shop }: CustomerTokenPrintProps) {
  const { order, customer, items, financial } = detail;
  const advancePaid = completedPaymentTotal(detail);
  const brand = withShopBrandDefaults(shop);

  return (
    <section className="print-document customer-token" data-testid="customer-token-copy">
      <PrintHeader shop={brand} title="Customer Token Copy" subtitle="Delivery receipt" orderNumber={order.order_number} />

      <div className="print-section print-meta-grid">
        <Meta label="Customer" value={customer?.name ?? 'Unknown customer'} />
        <Meta label="Mobile" value={customer?.phone ?? 'Not set'} />
        <Meta label="Order Date" value={formatDate(order.order_date)} />
        <Meta label="Delivery Date" value={formatDate(order.delivery_date)} />
      </div>

      <section className="print-section">
        <h2 className="print-section-title">Garment Items</h2>
        <table className="print-table">
          <thead>
            <tr>
              <th>Garment</th>
              <th>Qty</th>
              <th>Design</th>
              <th>Images</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const design = designForPrint(item);
              const designLabel = design.code ? `${design.name} (${design.code})` : design.name;
              const customerDesignSummary = design.summary === 'No design details selected' ? designLabel : design.summary;

              return (
                <tr key={item.id}>
                  <td>{item.garment_name_snapshot}</td>
                  <td>{item.quantity}</td>
                  <td>{customerDesignSummary}</td>
                  <td>
                    <div className="print-image-row">
                      <PrintImageThumb src={design.designImageUrl} label="Design" compact />
                      <PrintImageThumb src={design.fabricImageUrl} label="Fabric" compact emptyText={design.fabricStatus} />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="print-section">
        <h2 className="print-section-title">Payment Summary</h2>
        <AmountRow label="Total Amount" value={formatCurrency(order.total_amount)} />
        <AmountRow label="Advance Paid" value={formatCurrency(advancePaid)} />
        <AmountRow label="Due Amount" value={formatCurrency(financial.dueAmount)} strong />
      </section>

      <p className="print-note-box print-section">Please bring this token during delivery.</p>

      <div className="print-signature-grid">
        <div className="print-signature-line">Owner Signature</div>
        <div className="print-signature-line">Customer Signature</div>
      </div>

      <p className="mt-4 text-center text-sm font-semibold text-slate-700">Thank you for choosing {brand.name}.</p>
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

function AmountRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="print-amount-row">
      <span>{label}</span>
      {strong ? <strong>{value}</strong> : <span>{value}</span>}
    </div>
  );
}
