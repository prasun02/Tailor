import { AlertTriangle, Banknote, CheckCircle2, PackageCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useConfirmOrderDelivery, useDeliverySections } from '../features/orders/orderHooks';
import type { ProductionItem } from '../features/orders/orderService';
import { useShop } from '../features/shop/shopContext';
import { canRecordPayments } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate } from '../utils/format';

export function DeliveriesPage() {
  const { currentRole, currentShopId } = useShop();
  const deliveryQuery = useDeliverySections(currentShopId);
  const confirmDelivery = useConfirmOrderDelivery(currentShopId ?? '');
  const canTakePayment = canRecordPayments(currentRole);
  const sections = deliveryQuery.data;

  async function markDelivered(item: ProductionItem) {
    if (!window.confirm(`Mark ${item.order?.order_number ?? 'this item'} for ${item.customer?.name ?? 'customer'} as delivered?`)) return;
    await confirmDelivery.mutateAsync({ orderItemId: item.id, note: 'Delivered to customer' });
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <PackageCheck aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Delivery</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Check ready garments, due balance, and delivery confirmation before handing items to customers.</p>
      </header>

      {deliveryQuery.isLoading ? <Loading label="Loading deliveries" /> : null}
      {deliveryQuery.isError ? <EmptyState icon={AlertTriangle} title="Could not load deliveries" message={deliveryQuery.error.message} /> : null}
      {confirmDelivery.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{confirmDelivery.error.message}</p> : null}

      {sections ? (
        <div className="space-y-4">
          <DeliverySection title="Ready for Delivery" items={sections.ready} empty="No ready items." canTakePayment={canTakePayment} isUpdating={confirmDelivery.isPending} onDelivered={markDelivered} />
          <DeliverySection title="Today Delivery" items={sections.today} empty="No delivery due today." canTakePayment={canTakePayment} isUpdating={confirmDelivery.isPending} onDelivered={markDelivered} />
          <DeliverySection title="Tomorrow Delivery" items={sections.tomorrow} empty="No delivery due tomorrow." canTakePayment={canTakePayment} isUpdating={confirmDelivery.isPending} onDelivered={markDelivered} />
          <DeliverySection title="Overdue" items={sections.overdue} empty="No overdue delivery items." canTakePayment={canTakePayment} isUpdating={confirmDelivery.isPending} onDelivered={markDelivered} />
          <DeliverySection title="Delivered" items={sections.delivered} empty="No delivered items in the recent window." canTakePayment={canTakePayment} isUpdating={confirmDelivery.isPending} onDelivered={markDelivered} />
        </div>
      ) : null}
    </div>
  );
}

function DeliverySection({
  title,
  items,
  empty,
  canTakePayment,
  isUpdating,
  onDelivered,
}: {
  title: string;
  items: ProductionItem[];
  empty: string;
  canTakePayment: boolean;
  isUpdating: boolean;
  onDelivered: (item: ProductionItem) => Promise<void>;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h2 className="font-semibold text-slate-950">{title}</h2>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{items.length}</span>
      </div>
      <div className="grid gap-3 p-3 lg:grid-cols-2">
        {items.length === 0 ? <p className="p-3 text-sm text-slate-500">{empty}</p> : null}
        {items.map((item) => (
          <DeliveryCard key={`${title}-${item.id}`} item={item} canTakePayment={canTakePayment} isUpdating={isUpdating} onDelivered={onDelivered} />
        ))}
      </div>
    </section>
  );
}

function DeliveryCard({
  item,
  canTakePayment,
  isUpdating,
  onDelivered,
}: {
  item: ProductionItem;
  canTakePayment: boolean;
  isUpdating: boolean;
  onDelivered: (item: ProductionItem) => Promise<void>;
}) {
  const hasDue = item.financial.dueAmount > 0;
  const isDelivered = item.production_status === 'delivered';
  const canDeliver = item.production_status === 'ready' && !hasDue;

  return (
    <article className={cn('rounded-lg border p-4 text-sm', hasDue ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white')}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link to={`/orders/${item.order_id}`} className="font-semibold text-slate-950 hover:text-brand-700">{item.order?.order_number ?? 'Order'}</Link>
          <p className="mt-1 text-slate-600">{item.customer?.name ?? 'Unknown customer'} {item.customer?.phone ? `- ${item.customer.phone}` : ''}</p>
          <p className="mt-1 text-slate-600">{item.garment_name_snapshot} x {item.quantity}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-slate-700">{item.production_status.replace(/_/g, ' ')}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-slate-600 sm:grid-cols-4">
        <p>Total<br /><strong className="text-slate-950">{formatCurrency(item.order?.total_amount ?? 0)}</strong></p>
        <p>Paid<br /><strong className="text-slate-950">{formatCurrency(item.financial.totalPaid)}</strong></p>
        <p>Due<br /><strong className={hasDue ? 'text-amber-800' : 'text-slate-950'}>{formatCurrency(item.financial.dueAmount)}</strong></p>
        <p>Delivery<br /><strong className="text-slate-950">{formatDate(item.dueDate)}</strong></p>
      </div>
      {hasDue ? <p className="mt-3 rounded-lg bg-white p-2 text-sm font-semibold text-amber-800">Due amount remaining</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {hasDue && canTakePayment ? (
          <Link to={`/orders/${item.order_id}/payment`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 font-semibold text-white hover:bg-brand-700">
            <Banknote aria-hidden="true" className="h-4 w-4" />
            Record Final Payment
          </Link>
        ) : null}
        {canDeliver ? (
          <button type="button" disabled={isUpdating} onClick={() => void onDelivered(item)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Mark Delivered
          </button>
        ) : null}
        {isDelivered ? <span className="inline-flex min-h-10 items-center rounded-lg bg-emerald-50 px-3 font-semibold text-emerald-700">Delivered</span> : null}
        <Link to={`/orders/${item.order_id}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-100">
          Open Order
        </Link>
      </div>
    </article>
  );
}
