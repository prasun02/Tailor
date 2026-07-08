import { useQuery } from '@tanstack/react-query';
import { Archive, Banknote, CheckCircle2, ClipboardList, PackageCheck, Printer, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { displayDynamicValue } from '../features/measurements/components/display';
import { useArchiveOrder, useChangeOrderItemStatus, useConfirmOrderDelivery, useOrderDetail, useVoidOrderPayment } from '../features/orders/orderHooks';
import { jsonObject } from '../features/orders/orderService';
import { voidPaymentSchema } from '../features/orders/orderSchemas';
import { useShop } from '../features/shop/shopContext';
import { getSupabaseClient } from '../services/supabaseClient';
import { canArchiveOrders, canRecordPayments, canVoidPayments } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const { currentRole, currentShop, currentShopId } = useShop();
  const orderQuery = useOrderDetail(currentShopId, orderId);
  const archiveOrder = useArchiveOrder(currentShopId ?? '', orderId ?? '');
  const voidPayment = useVoidOrderPayment(currentShopId ?? '', orderId ?? '');
  const changeStatus = useChangeOrderItemStatus(currentShopId ?? '');
  const confirmDelivery = useConfirmOrderDelivery(currentShopId ?? '');
  const shopContactQuery = useQuery({
    queryKey: ['shop-contact', currentShopId],
    queryFn: async () => {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('shops')
        .select('name, phone, address')
        .eq('id', currentShopId ?? '')
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data as { name: string; phone: string | null; address: string | null } | null;
    },
    enabled: Boolean(currentShopId),
  });
  const [voidPaymentId, setVoidPaymentId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  useEffect(() => {
    if (searchParams.get('print') !== 'token') return;
    const timer = window.setTimeout(() => window.print(), 500);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  if (orderQuery.isLoading) return <Loading label="Loading order" />;
  if (orderQuery.isError || !orderQuery.data) return <EmptyState icon={ShieldAlert} title="Order not found" message={orderQuery.error?.message ?? 'Order could not be loaded.'} />;

  const detail = orderQuery.data;
  const { order, customer, items, payments, statusHistory, financial } = detail;
  const shopContact = shopContactQuery.data;

  async function handleArchive() {
    if (!window.confirm('Archive this order? Payment and status history will remain available.')) return;
    await archiveOrder.mutateAsync();
    navigate('/orders');
  }

  async function handleVoid() {
    const parsed = voidPaymentSchema.safeParse({ reason: voidReason });
    if (!parsed.success) {
      setVoidError(parsed.error.issues[0]?.message ?? 'Void reason is required.');
      return;
    }
    await voidPayment.mutateAsync({ paymentId: voidPaymentId, reason: parsed.data.reason });
    setVoidPaymentId('');
    setVoidReason('');
    setVoidError('');
  }

  async function handleReady(itemId: string) {
    await changeStatus.mutateAsync({ orderItemId: itemId, status: 'ready', note: 'Marked ready from order details' });
  }

  async function handleDelivered(itemId: string) {
    if (financial.dueAmount > 0) {
      window.alert('Due amount must be paid before delivery.');
      return;
    }

    if (!window.confirm(`Confirm delivery for ${order.order_number}?`)) return;
    await confirmDelivery.mutateAsync({ orderItemId: itemId, note: 'Delivered to customer' });
  }

  return (
    <div className="space-y-5">
      {searchParams.get('created') ? (
        <div className="no-print rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-900">
          Order confirmed. Token No {order.order_number} is ready to print.
        </div>
      ) : null}

      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700 print:hidden"><ClipboardList aria-hidden="true" className="h-6 w-6" /></div>
            <p className="text-xs font-semibold uppercase text-slate-500">Token No</p>
            <h1 className="text-2xl font-semibold text-slate-950">{order.order_number}</h1>
            <p className="mt-1 text-sm text-slate-600">{customer?.name ?? 'Unknown customer'} {customer?.phone ? `- ${customer.phone}` : ''}</p>
            <p className="mt-1 text-sm text-slate-600">Order {formatDate(order.order_date)} - Delivery {formatDate(order.delivery_date)}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            {canRecordPayments(currentRole) ? <Link to={`/orders/${order.id}/payment`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><Banknote aria-hidden="true" className="h-4 w-4" />Add payment</Link> : null}
            <Link to={`/orders/${order.id}/edit`} className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">Edit</Link>
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Printer aria-hidden="true" className="h-4 w-4" />Print token/job card</button>
            {canArchiveOrders(currentRole) ? <button type="button" onClick={() => void handleArchive()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"><Archive aria-hidden="true" className="h-4 w-4" />Archive</button> : null}
          </div>
        </div>
      </header>

      <section className="receipt-print rounded-lg border border-slate-200 bg-white p-5 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-4 border-b border-dashed border-slate-300 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{shopContact?.name ?? currentShop?.name ?? 'Tailor Shop'}</h2>
            <p className="mt-1 text-sm text-slate-600">{shopContact?.phone ?? 'Shop phone not set'}</p>
            <p className="mt-1 text-sm text-slate-600">{shopContact?.address ?? 'Shop address not set'}</p>
            <p className="mt-1 text-xs text-slate-500">Please bring this token during delivery.</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase text-slate-500">Token No</p>
            <p className="text-2xl font-semibold text-slate-950">{order.order_number}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Summary label="Customer" value={customer?.name ?? 'Unknown'} />
          <Summary label="Mobile" value={customer?.phone ?? 'Not set'} />
          <Summary label="Order date" value={formatDate(order.order_date)} />
          <Summary label="Delivery date" value={formatDate(order.delivery_date)} />
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:grid-cols-4 print:border-0 print:p-0 print:shadow-none">
        <Summary label="Subtotal" value={formatCurrency(order.subtotal)} />
        <Summary label="Discount" value={formatCurrency(order.discount_amount)} />
        <Summary label="Total" value={formatCurrency(order.total_amount)} />
        <Summary label="Due" value={formatCurrency(financial.dueAmount)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <h2 className="text-base font-semibold text-slate-950">Items and job cards</h2>
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <article key={item.id} className="break-inside-avoid rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">{item.garment_name_snapshot}</h3>
                  <p className="mt-1 text-sm text-slate-600">Quantity {item.quantity} - {formatCurrency(item.unit_price)} each - {formatCurrency(item.line_total)}</p>
                  <p className="mt-1 text-sm text-slate-600">Production: {item.production_status} - Worker {item.assigned_to?.slice(0, 8) ?? 'Unassigned'}</p>
                  <p className="mt-1 text-sm text-slate-600">Item delivery: {formatDate(item.item_delivery_date ?? order.delivery_date)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{item.production_status.replace(/_/g, ' ')}</span>
              </div>
              <Snapshot title="Measurement snapshot" values={jsonObject(item.measurement_snapshot)} />
              <Snapshot title="Style snapshot" values={jsonObject(item.style_snapshot)} />
              {item.design_reference_url ? (
                <div className="mt-3">
                  <p className="text-sm font-semibold text-slate-800">Cloth / reference photo</p>
                  <img src={item.design_reference_url} alt="" className="mt-2 h-40 w-full max-w-sm rounded-lg border border-slate-200 object-cover" />
                </div>
              ) : null}
              {item.special_instructions ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{item.special_instructions}</p> : null}
              <div className="no-print mt-4 flex flex-wrap gap-2">
                {item.production_status !== 'ready' && item.production_status !== 'delivered' && item.production_status !== 'cancelled' ? (
                  <button type="button" disabled={changeStatus.isPending} onClick={() => void handleReady(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                    <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                    Mark Ready
                  </button>
                ) : null}
                {item.production_status === 'ready' ? (
                  <button type="button" disabled={confirmDelivery.isPending || financial.dueAmount > 0} onClick={() => void handleDelivered(item.id)} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                    <PackageCheck aria-hidden="true" className="h-4 w-4" />
                    Mark Delivered
                  </button>
                ) : null}
                {item.production_status === 'ready' && financial.dueAmount > 0 ? <span className="inline-flex min-h-10 items-center rounded-lg bg-amber-50 px-3 text-sm font-semibold text-amber-800">Due must be paid first</span> : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Payment history</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {payments.length === 0 ? <p className="py-3 text-sm text-slate-500">No payments recorded.</p> : null}
          {payments.map((payment) => (
            <div key={payment.id} className="py-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className={cn('font-semibold', payment.payment_status === 'voided' ? 'text-slate-500 line-through' : 'text-slate-950')}>{formatCurrency(payment.amount)} - {payment.payment_method.replace('_', ' ')}</p>
                  <p className="mt-1 text-sm text-slate-600">{payment.reference ?? 'No reference'} - received by {payment.received_by?.slice(0, 8) ?? 'unknown'} - {formatDateTime(payment.paid_at)}</p>
                  {payment.void_reason ? <p className="mt-1 text-sm text-red-700">Voided: {payment.void_reason}</p> : null}
                </div>
                {payment.payment_status === 'completed' && canVoidPayments(currentRole) ? <button type="button" onClick={() => setVoidPaymentId(payment.id)} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100">Void</button> : null}
              </div>
            </div>
          ))}
        </div>
        {voidPaymentId ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-red-900">Void reason</span>
              <textarea value={voidReason} onChange={(event) => setVoidReason(event.target.value)} className="min-h-24 w-full rounded-lg border border-red-200 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-red-200" />
            </label>
            {voidError || voidPayment.error ? <p className="mt-2 text-sm font-semibold text-red-700">{voidError || voidPayment.error?.message}</p> : null}
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => void handleVoid()} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white">Confirm void</button>
              <button type="button" onClick={() => setVoidPaymentId('')} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700">Cancel</button>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Status history</h2>
        <div className="mt-4 divide-y divide-slate-100">
          {statusHistory.map((entry) => <p key={entry.id} className="py-3 text-sm text-slate-600">{entry.new_status} - {entry.note ?? 'No note'} - {formatDateTime(entry.changed_at)}</p>)}
        </div>
      </section>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>;
}

function Snapshot({ title, values }: { title: string; values: Record<string, unknown> }) {
  const entries = Object.entries(values);
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {entries.length === 0 ? <p className="mt-2 text-sm text-slate-500">No snapshot values.</p> : null}
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => <div key={key}><dt className="text-xs uppercase text-slate-500">{key}</dt><dd className="text-sm font-medium text-slate-800">{displayDynamicValue(value)}</dd></div>)}
      </dl>
    </div>
  );
}
