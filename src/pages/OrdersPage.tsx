import { CalendarDays, ChevronLeft, ChevronRight, ClipboardList, Plus, Search, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useOrders } from '../features/orders/orderHooks';
import {
  isOrderStatus,
  isPaymentState,
  isProductionStatus,
  orderStatuses,
  paymentStates,
  productionStatuses,
  type PaymentState,
} from '../features/orders/orderSchemas';
import type { OrderListItem } from '../features/orders/orderService';
import { useShop } from '../features/shop/shopContext';
import type { OrderStatus, ProductionStatus } from '../types/database';
import { canCreateOrders } from '../utils/authorization';
import { formatCurrency, formatDate } from '../utils/format';

const PAGE_SIZE = 10;

export function OrdersPage() {
  const { currentRole, currentShopId } = useShop();
  const canCreate = canCreateOrders(currentRole);
  const [search, setSearch] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [productionStatus, setProductionStatus] = useState<ProductionStatus | ''>('');
  const [paymentState, setPaymentState] = useState<PaymentState>('all');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 350);
  const ordersQuery = useOrders(currentShopId, {
    search: debouncedSearch,
    deliveryDate,
    status,
    productionStatus,
    paymentState,
    overdueOnly,
    page,
    pageSize: PAGE_SIZE,
  });
  const result = ordersQuery.data;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ClipboardList aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Orders</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Search and filter tailoring orders without loading the full order book.</p>
        </div>
        {canCreate ? (
          <Link to="/orders/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
            <Plus aria-hidden="true" className="h-4 w-4" />
            New order
          </Link>
        ) : null}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_repeat(5,minmax(0,1fr))]">
          <label className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); resetPage(); }} placeholder="Order number, customer, phone" className="min-h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <input aria-label="Delivery date" type="date" value={deliveryDate} onChange={(event) => { setDeliveryDate(event.target.value); resetPage(); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          <select aria-label="Order status" value={status} onChange={(event) => { setStatus(toOrderStatusFilter(event.target.value)); resetPage(); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
            <option value="">All statuses</option>
            {orderStatuses.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <select aria-label="Production status" value={productionStatus} onChange={(event) => { setProductionStatus(toProductionStatusFilter(event.target.value)); resetPage(); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
            <option value="">All production</option>
            {productionStatuses.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <select aria-label="Payment state" value={paymentState} onChange={(event) => { setPaymentState(toPaymentStateFilter(event.target.value)); resetPage(); }} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
            {paymentStates.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
          </select>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={overdueOnly} onChange={(event) => { setOverdueOnly(event.target.checked); resetPage(); }} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            Overdue
          </label>
        </div>
      </section>

      {ordersQuery.isLoading ? <Loading label="Loading orders" /> : null}
      {ordersQuery.isError ? <EmptyState icon={ShieldAlert} title="Could not load orders" message={ordersQuery.error.message} /> : null}
      {result && result.orders.length === 0 ? <EmptyState icon={CalendarDays} title="No orders found" message="Adjust filters or create a new order." /> : null}

      {result && result.orders.length > 0 ? (
        <>
          <div className="grid gap-3 md:hidden">
            {result.orders.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <tr><th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Delivery</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Due</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.orders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><Link className="font-semibold text-slate-950 hover:text-brand-700" to={`/orders/${order.id}`}>{order.order_number}</Link><p className="mt-1 text-xs text-slate-500">{order.itemCount} item(s)</p></td>
                    <td className="px-4 py-3 text-slate-600">{order.customer?.name ?? 'Unknown'}<p className="text-xs text-slate-500">{order.customer?.phone ?? 'No phone'}</p></td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(order.delivery_date)}</td>
                    <td className="px-4 py-3 text-slate-600">{order.overall_status}<p className="text-xs text-slate-500">{order.productionStatuses.join(', ') || 'No items'}</p></td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-950">{formatCurrency(order.dueAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-panel sm:flex-row sm:items-center sm:justify-between">
            <span>Page {result.page} of {result.pageCount} - {result.count} order{result.count === 1 ? '' : 's'}</span>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"><ChevronLeft aria-hidden="true" className="h-4 w-4" />Previous</button>
              <button type="button" disabled={page >= result.pageCount} onClick={() => setPage((current) => Math.min(current + 1, result.pageCount))} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">Next<ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function toOrderStatusFilter(value: string): OrderStatus | '' {
  return isOrderStatus(value) ? value : '';
}

function toProductionStatusFilter(value: string): ProductionStatus | '' {
  return isProductionStatus(value) ? value : '';
}

function toPaymentStateFilter(value: string): PaymentState {
  return isPaymentState(value) ? value : 'all';
}

function OrderCard({ order }: { order: OrderListItem }) {
  return (
    <Link to={`/orders/${order.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-semibold text-slate-950">{order.order_number}</p><p className="mt-1 text-sm text-slate-600">{order.customer?.name ?? 'Unknown customer'}</p></div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{order.overall_status}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
        <p>Delivery<br /><strong className="text-slate-950">{formatDate(order.delivery_date)}</strong></p>
        <p>Due<br /><strong className="text-slate-950">{formatCurrency(order.dueAmount)}</strong></p>
      </div>
    </Link>
  );
}
