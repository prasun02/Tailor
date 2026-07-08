import { AlertTriangle, CalendarDays, Search } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useOrders } from '../features/orders/orderHooks';
import type { OrderListItem } from '../features/orders/orderService';
import { useShop } from '../features/shop/shopContext';
import { formatCurrency, formatDate } from '../utils/format';

export function TokenSearchPage() {
  const { currentShopId } = useShop();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const ordersQuery = useOrders(currentShopId, {
    search: debouncedSearch,
    page: 1,
    pageSize: 20,
  });
  const orders = ordersQuery.data?.orders ?? [];
  const hasSearch = debouncedSearch.trim().length > 0;

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Search aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Token / Customer Search</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Find customer orders by token number, order number, mobile, customer name, or customer code.</p>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <label className="relative block">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Token No, mobile, customer name, customer code"
            className="min-h-14 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
      </section>

      {ordersQuery.isLoading ? <Loading label="Searching orders" /> : null}
      {ordersQuery.isError ? <EmptyState icon={AlertTriangle} title="Search failed" message={ordersQuery.error.message} /> : null}
      {!ordersQuery.isLoading && hasSearch && orders.length === 0 ? <EmptyState icon={CalendarDays} title="No matching token found" message="Try token number, mobile number, customer name, or customer code." /> : null}
      {!hasSearch ? <EmptyState icon={Search} title="Search token or customer" message="Enter a token number, mobile number, customer name, or customer code to begin." /> : null}

      {orders.length > 0 ? (
        <section className="grid gap-3">
          {orders.map((order) => <SearchResultCard key={order.id} order={order} />)}
        </section>
      ) : null}
    </div>
  );
}

function SearchResultCard({ order }: { order: OrderListItem }) {
  const isDue = order.dueAmount > 0;

  return (
    <Link to={`/orders/${order.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel hover:bg-slate-50">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-950">{order.order_number}</p>
          <p className="mt-1 text-sm text-slate-600">{order.customer?.name ?? 'Unknown customer'} {order.customer?.phone ? `- ${order.customer.phone}` : ''}</p>
          <p className="mt-1 text-xs text-slate-500">{order.customer?.customer_code ?? 'No customer code'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{order.overall_status.replace(/_/g, ' ')}</span>
          <span className={isDue ? 'rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800' : 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700'}>
            {isDue ? `Due ${formatCurrency(order.dueAmount)}` : 'Paid'}
          </span>
        </div>
      </div>
      <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-4">
        <p>Order date<br /><strong className="text-slate-950">{formatDate(order.order_date)}</strong></p>
        <p>Delivery date<br /><strong className="text-slate-950">{formatDate(order.delivery_date)}</strong></p>
        <p>Production<br /><strong className="text-slate-950">{order.productionStatuses.join(', ') || 'No items'}</strong></p>
        <p>Total<br /><strong className="text-slate-950">{formatCurrency(order.total_amount)}</strong></p>
      </div>
    </Link>
  );
}
