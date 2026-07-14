import {
  Archive,
  Banknote,
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileText,
  ImageOff,
  MessageSquare,
  PackageCheck,
  Printer,
  ReceiptText,
  Scissors,
  Send,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useArchiveOrder, useChangeOrderItemStatus, useConfirmOrderDelivery, useOrderDetail, useVoidOrderPayment } from '../features/orders/orderHooks';
import { voidPaymentSchema } from '../features/orders/orderSchemas';
import { GarmentPreviewCard } from '../features/preview/GarmentPreviewCard';
import { designDisplayForOrderItem, displayEntries, previewSummaryEntries, recordFromUnknown, type DisplayEntry } from '../features/orders/orderDisplayUtils';
import { useShop } from '../features/shop/shopContext';
import { useOrderSmsLogs, useSendOrderSms } from '../features/sms/smsHooks';
import { smsTemplateLabels, type SmsLog } from '../features/sms/smsService';
import type { SmsTemplateKey } from '../types/database';
import { canArchiveOrders, canRecordPayments, canVoidPayments } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';

export function OrderDetailPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const { currentRole, currentShopId } = useShop();
  const orderQuery = useOrderDetail(currentShopId, orderId);
  const archiveOrder = useArchiveOrder(currentShopId ?? '', orderId ?? '');
  const voidPayment = useVoidOrderPayment(currentShopId ?? '', orderId ?? '');
  const changeStatus = useChangeOrderItemStatus(currentShopId ?? '');
  const confirmDelivery = useConfirmOrderDelivery(currentShopId ?? '');
  const smsLogsQuery = useOrderSmsLogs(currentShopId, orderId);
  const sendSms = useSendOrderSms(currentShopId ?? '');
  const [voidPaymentId, setVoidPaymentId] = useState('');
  const [voidReason, setVoidReason] = useState('');
  const [voidError, setVoidError] = useState('');

  useEffect(() => {
    if (searchParams.get('print') !== 'token' || !orderId) return;
    navigate(`/orders/${orderId}/print/customer-token?autoprint=1`, { replace: true });
  }, [navigate, orderId, searchParams]);

  if (orderQuery.isLoading) return <Loading label="Loading order" />;
  if (orderQuery.isError || !orderQuery.data) return <EmptyState icon={ShieldAlert} title="Order not found" message={orderQuery.error?.message ?? 'Order could not be loaded.'} />;

  const detail = orderQuery.data;
  const { order, customer, items, payments, statusHistory, financial } = detail;

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

  async function handleSendSms(templateKey: SmsTemplateKey) {
    if (!orderId) return;
    await sendSms.mutateAsync({ orderId, templateKey });
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
            <a href="#print-copies" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Printer aria-hidden="true" className="h-4 w-4" />Print copies</a>
            {canArchiveOrders(currentRole) ? <button type="button" onClick={() => void handleArchive()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 text-sm font-semibold text-amber-900 hover:bg-amber-100"><Archive aria-hidden="true" className="h-4 w-4" />Archive</button> : null}
          </div>
        </div>
      </header>

      <PrintCopiesPanel orderId={order.id} />
      <SmsPanel
        logs={smsLogsQuery.data ?? []}
        isLoading={smsLogsQuery.isLoading}
        isSending={sendSms.isPending}
        error={smsLogsQuery.error?.message ?? sendSms.error?.message}
        onSend={(templateKey) => void handleSendSms(templateKey)}
      />

      <section className="grid gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-panel sm:grid-cols-2 lg:grid-cols-5 print:border-0 print:p-0 print:shadow-none">
        <Summary label="Subtotal" value={formatCurrency(order.subtotal)} />
        <Summary label="Discount" value={formatCurrency(order.discount_amount)} />
        <Summary label="Total" value={formatCurrency(order.total_amount)} />
        <Summary label="Advance paid" value={formatCurrency(financial.totalPaid)} />
        <Summary label="Due" value={formatCurrency(financial.dueAmount)} />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <h2 className="text-base font-semibold text-slate-950">Items and job cards</h2>
        <div className="mt-4 space-y-4">
          {items.map((item) => {
            const measurementSnapshot = recordFromUnknown(item.measurement_snapshot);
            const styleSnapshot = recordFromUnknown(item.style_snapshot);
            const previewSummary = recordFromUnknown(item.preview_summary);
            const designSummary = designDisplayForOrderItem(item);
            const designName = designSummary.name;
            const styleCategory = designSummary.category;
            const previewImageUrl = designSummary.designImageUrl;
            const fabricReferenceUrl = designSummary.fabricImageUrl;
            const previewVideoUrl = designSummary.previewVideoUrl;
            const designDetails = displayEntries(recordFromUnknown(item.design_snapshot), { hiddenKeys: ['style_metadata', 'tags'] });
            const measurementDetails = displayEntries(measurementSnapshot);
            const styleDetails = displayEntries(styleSnapshot);
            const fitDetails = previewSummaryEntries(previewSummary);

            return (
            <article key={item.id} className="break-inside-avoid rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">{item.garment_name_snapshot}</h3>
                  <p className="mt-1 text-sm text-slate-600">Design: {designName}</p>
                  <p className="mt-1 text-sm text-slate-600">Quantity {item.quantity} - {formatCurrency(item.unit_price)} each - {formatCurrency(item.line_total)}</p>
                  <p className="mt-1 text-sm text-slate-600">Production: {item.production_status} - Worker {item.assigned_to?.slice(0, 8) ?? 'Unassigned'}</p>
                  <p className="mt-1 text-sm text-slate-600">Item delivery: {formatDate(item.item_delivery_date ?? order.delivery_date)}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{item.production_status.replace(/_/g, ' ')}</span>
              </div>
              <div className="mt-3">
                <GarmentPreviewCard
                  title="Saved customer preview"
                  garmentName={item.garment_name_snapshot}
                  designName={designName}
                  styleCategory={styleCategory}
                  previewImageUrl={previewImageUrl}
                  fabricReferenceUrl={fabricReferenceUrl}
                  previewVideoUrl={previewVideoUrl}
                  measurementValues={measurementSnapshot}
                  styleValues={styleSnapshot}
                  previewSummary={previewSummary}
                  compact
                />
              </div>              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <ImageReferencePanel title="Selected Design" imageUrl={previewImageUrl} emptyText="Image unavailable" details={[
                  { key: 'design-name', label: 'Design', value: designName },
                  ...(designSummary.code ? [{ key: 'design-code', label: 'Code', value: designSummary.code }] : []),
                  ...(designSummary.category ? [{ key: 'design-category', label: 'Style Category', value: designSummary.category }] : []),
                  ...designDetails.filter((entry) => !['Design Name', 'Design Code', 'Name', 'Code', 'Style Category'].includes(entry.label)),
                ]} />
                <ImageReferencePanel title="Fabric Reference" imageUrl={fabricReferenceUrl} emptyText="Skipped" details={[{ key: 'fabric-status', label: 'Status', value: designSummary.fabricStatus }]} />
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                <DisplaySection title="Style Choices" entries={styleDetails} emptyText="No style choices saved." />
                <DisplaySection title="Measurements" entries={measurementDetails} emptyText="No measurement snapshot saved." />
              </div>
              <DisplaySection title="Fit / Preview Summary" entries={fitDetails} emptyText="No preview summary saved." />
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
            );
          })}
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

const smsActions: { templateKey: SmsTemplateKey; label: string }[] = [
  { templateKey: 'order_confirmed', label: 'Send confirmed SMS' },
  { templateKey: 'order_ready', label: 'Send ready SMS' },
  { templateKey: 'delivered', label: 'Send delivered SMS' },
];

const smsStatusStyles: Record<SmsLog['status'], string> = {
  queued: 'bg-slate-100 text-slate-700',
  sent: 'bg-emerald-50 text-emerald-800',
  failed: 'bg-red-50 text-red-700',
  skipped: 'bg-amber-50 text-amber-800',
};

function SmsPanel({
  logs,
  isLoading,
  isSending,
  error,
  onSend,
}: {
  logs: SmsLog[];
  isLoading: boolean;
  isSending: boolean;
  error?: string | null;
  onSend: (templateKey: SmsTemplateKey) => void;
}) {
  return (
    <section className="no-print rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <MessageSquare aria-hidden="true" className="h-5 w-5" />
          </div>
          <h2 className="text-base font-semibold text-slate-950">SMS Status</h2>
          <p className="mt-1 text-sm text-slate-600">Send order updates through the Supabase Edge Function and review recent gateway logs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {smsActions.map((action) => (
            <button
              key={action.templateKey}
              type="button"
              disabled={isSending}
              onClick={() => onSend(action.templateKey)}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send aria-hidden="true" className="h-4 w-4" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}

      <div className="mt-4 divide-y divide-slate-100">
        {isLoading ? <p className="py-3 text-sm text-slate-500">Loading SMS logs...</p> : null}
        {!isLoading && logs.length === 0 ? <p className="py-3 text-sm text-slate-500">No SMS attempts recorded for this order.</p> : null}
        {logs.map((log) => (
          <div key={log.id} className="py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-semibold text-slate-950">{smsTemplateLabels[log.template_key]}</p>
              <span className={cn('w-fit rounded-full px-2 py-0.5 text-xs font-semibold capitalize', smsStatusStyles[log.status])}>{log.status}</span>
            </div>
            <p className="mt-1 text-sm text-slate-600">To {log.recipient_phone ?? 'No phone'} - requested {formatDateTime(log.created_at)}</p>
            {log.provider_name || log.provider_message_id ? (
              <p className="mt-1 text-xs text-slate-500">Provider {log.provider_name ?? 'unknown'}{log.provider_message_id ? ` - ${log.provider_message_id}` : ''}</p>
            ) : null}
            {log.error_message ? <p className="mt-1 text-sm font-medium text-red-700">{log.error_message}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
function PrintCopiesPanel({ orderId }: { orderId: string }) {
  return (
    <section id="print-copies" className="no-print rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-950">Print Copies</h2>
          <p className="mt-1 text-sm text-slate-600">Print customer, production, and store copies separately, or preview all copies with page breaks.</p>
        </div>
        <Link to={`/orders/${orderId}/print/customer-token`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
          <FileText aria-hidden="true" className="h-4 w-4" />
          Open Customer Token Preview
        </Link>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PrintCopyLink to={`/orders/${orderId}/print/customer-token?autoprint=1`} icon={ReceiptText} label="Customer Token" primary />
        <PrintCopyLink to={`/orders/${orderId}/print/production-copy?autoprint=1`} icon={Scissors} label="Production Copy" />
        <PrintCopyLink to={`/orders/${orderId}/print/store-copy?autoprint=1`} icon={Printer} label="Store Copy" />
        <PrintCopyLink to={`/orders/${orderId}/print/all?autoprint=1`} icon={FileText} label="Print All Copies" />
      </div>
    </section>
  );
}

function PrintCopyLink({ to, icon: Icon, label, primary = false }: { to: string; icon: LucideIcon; label: string; primary?: boolean }) {
  return (
    <Link
      to={to}
      className={
        primary
          ? 'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700'
          : 'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100'
      }
    >
      <Icon aria-hidden="true" className="h-4 w-4" />
      {label}
    </Link>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs uppercase text-slate-500">{label}</p><p className="mt-1 font-semibold text-slate-950">{value}</p></div>;
}

function DisplaySection({ title, entries, emptyText }: { title: string; entries: DisplayEntry[]; emptyText: string }) {
  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      {entries.length === 0 ? <p className="mt-2 text-sm text-slate-500">{emptyText}</p> : null}
      {entries.length > 0 ? (
        <dl className="mt-3 grid gap-2 sm:grid-cols-2">
          {entries.map((entry) => (
            <div key={entry.key} className="min-w-0 rounded-lg bg-white px-3 py-2 shadow-sm">
              <dt className="text-xs font-semibold uppercase text-slate-500">{entry.label}</dt>
              <dd className="mt-1 break-words text-sm font-medium text-slate-900">{entry.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  );
}

function ImageReferencePanel({ title, imageUrl, emptyText, details }: { title: string; imageUrl: string | null; emptyText: string; details: DisplayEntry[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {imageUrl ? (
          <a href={imageUrl} target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50">
            <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
            Open image
          </a>
        ) : null}
      </div>
      <ReferenceImage src={imageUrl} alt={title} emptyText={emptyText} />
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {details.map((entry) => (
          <div key={entry.key} className="min-w-0 rounded-lg bg-white px-3 py-2 shadow-sm">
            <dt className="text-xs font-semibold uppercase text-slate-500">{entry.label}</dt>
            <dd className="mt-1 break-words text-sm font-medium text-slate-900">{entry.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ReferenceImage({ src, alt, emptyText }: { src: string | null; alt: string; emptyText: string }) {
  const [isBroken, setIsBroken] = useState(false);

  if (src && !isBroken) {
    return <img src={src} alt={alt} className="mt-3 aspect-[5/3] w-full rounded-lg border border-slate-200 bg-white object-cover" loading="lazy" onError={() => setIsBroken(true)} />;
  }

  return (
    <div aria-label={`${alt} unavailable`} className="mt-3 flex aspect-[5/3] w-full flex-col items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-4 text-center text-sm font-semibold text-slate-500">
      <ImageOff aria-hidden="true" className="h-6 w-6 text-slate-400" />
      {isBroken ? 'Image unavailable' : emptyText}
    </div>
  );
}


