import { AlertTriangle, Banknote, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useDueOrders } from '../features/orders/orderHooks';
import type { OrderListItem } from '../features/orders/orderService';
import { useShop } from '../features/shop/shopContext';
import { canRecordPayments } from '../utils/authorization';
import { formatCurrency, formatDate } from '../utils/format';

export function PaymentsDuePage() {
  const { currentRole, currentShopId } = useShop();
  const canTakePayment = canRecordPayments(currentRole);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const dueQuery = useDueOrders(currentShopId, debouncedSearch);
  const orders = dueQuery.data ?? [];
  const totalDue = orders.reduce((sum, order) => sum + Math.max(order.dueAmount, 0), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Banknote aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Payments / Due</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Review outstanding order balances and record additional or final payments.</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
          Visible due total {formatCurrency(totalDue)}
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search token, customer, mobile" className="min-h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>
      </section>

      {dueQuery.isLoading ? <Loading label="Loading due payments" /> : null}
      {dueQuery.isError ? <EmptyState icon={AlertTriangle} title="Could not load due payments" message={dueQuery.error.message} /> : null}
      {!dueQuery.isLoading && orders.length === 0 ? <EmptyState icon={Banknote} title="No due payments found" message="Outstanding orders will appear here." /> : null}

      {orders.length > 0 ? (
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Token No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Paid</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {orders.map((order) => <DueRow key={order.id} order={order} canTakePayment={canTakePayment} />)}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}

function DueRow({ order, canTakePayment }: { order: OrderListItem; canTakePayment: boolean }) {
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-3">
        <Link to={`/orders/${order.id}`} className="font-semibold text-slate-950 hover:text-brand-700">{order.order_number}</Link>
        <p className="mt-1 text-xs text-slate-500">{order.itemCount} item(s)</p>
      </td>
      <td className="px-4 py-3 text-slate-600">
        {order.customer?.name ?? 'Unknown'}
        <p className="text-xs text-slate-500">{order.customer?.phone ?? 'No mobile'}</p>
      </td>
      <td className="px-4 py-3 text-slate-600">{formatDate(order.delivery_date)}</td>
      <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatCurrency(order.total_amount)}</td>
      <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(order.totalPaid)}</td>
      <td className="px-4 py-3 text-right font-semibold text-amber-800">{formatCurrency(order.dueAmount)}</td>
      <td className="px-4 py-3 text-right">
        {canTakePayment ? (
          <Link to={`/orders/${order.id}/payment`} className="inline-flex min-h-10 items-center rounded-lg bg-brand-600 px-3 font-semibold text-white hover:bg-brand-700">
            Add Payment
          </Link>
        ) : (
          <Link to={`/orders/${order.id}`} className="inline-flex min-h-10 items-center rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-100">
            Open
          </Link>
        )}
      </td>
    </tr>
  );
}
