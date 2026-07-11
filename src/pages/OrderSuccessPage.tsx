import { CheckCircle2, ClipboardList, Plus, Printer, ReceiptText, Scissors, ShieldAlert, type LucideIcon } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useOrderDetail } from '../features/orders/orderHooks';
import { useShop } from '../features/shop/shopContext';
import { formatCurrency, formatDate } from '../utils/format';

export function OrderSuccessPage() {
  const { orderId } = useParams();
  const { currentShopId } = useShop();
  const orderQuery = useOrderDetail(currentShopId, orderId);

  if (orderQuery.isLoading) return <Loading label="Loading order success" />;
  if (orderQuery.isError || !orderQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Order created" message={orderQuery.error?.message ?? 'Order details could not be loaded.'} />;
  }

  const { order, customer, financial } = orderQuery.data;

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <CheckCircle2 aria-hidden="true" className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold text-emerald-950">Order created successfully</h1>
            <p className="mt-1 text-sm text-emerald-900">Token No {order.order_number}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white/80 p-4 text-sm text-emerald-950">
            <p className="font-semibold">{customer?.name ?? 'Unknown customer'}</p>
            <p className="mt-1">Delivery Date: {formatDate(order.delivery_date)}</p>
            <p className="mt-1">Due Amount: {formatCurrency(financial.dueAmount)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Quick actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <QuickAction to={`/orders/${order.id}/print/customer-token?autoprint=1`} icon={ReceiptText} label="Print Customer Token" primary />
          <QuickAction to={`/orders/${order.id}/print/production-copy?autoprint=1`} icon={Scissors} label="Print Production Copy" />
          <QuickAction to={`/orders/${order.id}/print/store-copy?autoprint=1`} icon={Printer} label="Print Store Copy" />
          <QuickAction to={`/orders/${order.id}`} icon={ClipboardList} label="Open Order Detail" />
          <QuickAction to="/orders/new" icon={Plus} label="Create New Order" />
        </div>
      </section>
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
  primary = false,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  primary?: boolean;
}) {
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
