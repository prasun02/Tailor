import type { OrderDetail } from '../orders/orderService';
import { formatDate } from '../../utils/format';
import { PrintHeader } from './PrintHeader';
import { PrintImageThumb } from './PrintImageThumb';
import { PrintMeasurementTable } from './PrintMeasurementTable';
import { PrintStyleSummary } from './PrintStyleSummary';
import { designForPrint, recordFromPrintValue, shortUserId, withShopBrandDefaults, type ShopBrand } from './printModel';

type ProductionJobCardPrintProps = {
  detail: OrderDetail;
  shop: ShopBrand;
};

export function ProductionJobCardPrint({ detail, shop }: ProductionJobCardPrintProps) {
  const { order, customer, items } = detail;
  const brand = withShopBrandDefaults(shop);

  return (
    <section className="print-document production-copy" data-testid="production-copy">
      <PrintHeader shop={brand} title="Production Copy / Job Card" subtitle="Cutting, stitching and QC sheet" orderNumber={order.order_number} />

      <div className="print-section print-meta-grid">
        <Meta label="Customer" value={customer?.name ?? 'Unknown customer'} />
        <Meta label="Mobile" value={customer?.phone ?? 'Not set'} />
        <Meta label="Delivery Date" value={formatDate(order.delivery_date)} />
        <Meta label="Status" value={order.overall_status.replace(/_/g, ' ')} />
      </div>

      <div className="print-section production-layout">
        <section>
          <h2 className="print-section-title">Order Info</h2>
          {items.map((item) => {
            const design = designForPrint(item);
            const designLabel = design.code ? `${design.name} (${design.code})` : design.name;

            return (
              <article key={item.id} className="print-item-card print-section">
                <div className="print-two-column">
                  <Meta label="Garment" value={item.garment_name_snapshot} />
                  <Meta label="Quantity" value={String(item.quantity)} />
                  <Meta label="Design" value={designLabel} />
                  <Meta label="Assigned Worker" value={shortUserId(item.assigned_to)} />
                  <Meta label="Production Status" value={item.production_status.replace(/_/g, ' ')} />
                  <Meta label="Item Delivery" value={formatDate(item.item_delivery_date ?? order.delivery_date)} />
                </div>

                <div className="print-section">
                  <h3 className="print-section-title">Design / Fabric</h3>
                  <div className="print-image-row">
                    <PrintImageThumb src={design.designImageUrl} label="Design Image" />
                    <PrintImageThumb src={design.fabricImageUrl} label="Fabric Reference" />
                  </div>
                </div>

                <div className="print-section">
                  <h3 className="print-section-title">Token Code</h3>
                  <div className="print-meta-box">
                    <span className="font-mono text-base font-bold tracking-widest">{order.order_number}</span>
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
              <h2 className="print-section-title">{item.garment_name_snapshot} Snapshot</h2>
              <PrintMeasurementTable values={recordFromPrintValue(item.measurement_snapshot)} title="Full Measurement Snapshot" />
              <PrintStyleSummary values={recordFromPrintValue(item.style_snapshot)} title="Style Options" />
            </article>
          ))}
        </section>
      </div>

      <div className="print-check-grid">
        <div className="print-check-item">[ ] Cutting</div>
        <div className="print-check-item">[ ] Stitching</div>
        <div className="print-check-item">[ ] Finishing</div>
        <div className="print-check-item">[ ] QC</div>
        <div className="print-check-item">[ ] Ready</div>
      </div>

      <div className="print-signature-grid print-signature-grid--four">
        <div className="print-signature-line">Cutter Signature</div>
        <div className="print-signature-line">Tailor Signature</div>
        <div className="print-signature-line">QC Signature</div>
        <div className="print-signature-line">Supervisor Signature</div>
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-meta-box">
      <span className="print-label">{label}</span>
      <span className="print-value capitalize">{value}</span>
    </div>
  );
}