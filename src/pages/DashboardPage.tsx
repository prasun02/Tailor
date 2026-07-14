import { AlertTriangle, Banknote, CalendarClock, Images, PackageCheck, Plus, Search, Shirt, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { appBrand } from '../app/brand';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useDashboardWorklists, useTailorDashboardMetrics } from '../features/orders/orderHooks';
import type { OrderListItem, ProductionItem } from '../features/orders/orderService';
import { useShop } from '../features/shop/shopContext';
import { formatCurrency, formatDate } from '../utils/format';

const quickActions = [
  { to: '/orders/new', label: 'New Design Order', icon: Sparkles, primary: true },
  { to: '/orders/new', label: 'New Customer Order', icon: Plus },
  { to: '/token-search', label: 'Search Token / Customer', icon: Search },
  { to: '/settings/designs', label: 'Design Library', icon: Images },
  { to: '/deliveries', label: 'Today Delivery', icon: PackageCheck },
  { to: '/production', label: 'Production Board', icon: Shirt },
  { to: '/payments', label: 'Due Payments', icon: Banknote },
];

export function DashboardPage() {
  const { currentShopId } = useShop();
  const metricsQuery = useTailorDashboardMetrics(currentShopId);
  const worklistsQuery = useDashboardWorklists(currentShopId);
  const metrics = metricsQuery.data;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <CalendarClock aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">{appBrand.name} Dashboard</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Start new orders, track delivery pressure, production work, and due balances.</p>
        </div>
        <Link to="/orders/new" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Sparkles aria-hidden="true" className="h-5 w-5" />
          New Design Order
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.to}
              to={action.to}
              className={action.primary
                ? 'flex min-h-20 items-center gap-3 rounded-lg bg-brand-600 p-4 text-white shadow-panel hover:bg-brand-700'
                : 'flex min-h-20 items-center gap-3 rounded-lg border border-slate-200 bg-white p-4 text-slate-800 shadow-panel hover:bg-slate-50'}
            >
              <span className={action.primary ? 'flex h-10 w-10 items-center justify-center rounded-lg bg-white/15' : 'flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700'}>
                <Icon aria-hidden="true" className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold">{action.label}</span>
            </Link>
          );
        })}
      </section>

      {metricsQuery.isLoading ? <Loading label="Loading shop metrics" /> : null}
      {metricsQuery.isError ? <EmptyState icon={AlertTriangle} title="Could not load metrics" message={metricsQuery.error.message} /> : null}

      {metrics ? (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <Metric label="New orders today" value={metrics.newOrdersToday} />
          <Metric label="Delivery today" value={metrics.deliveryToday} tone="blue" />
          <Metric label="Delivery tomorrow" value={metrics.deliveryTomorrow} tone="blue" />
          <Metric label="Overdue orders" value={metrics.overdueOrders} tone="red" />
          <Metric label="Ready for delivery" value={metrics.readyForDelivery} tone="green" />
          <Metric label="Total due amount" value={formatCurrency(metrics.totalDueAmount)} tone="amber" />
          <Metric label="In cutting" value={metrics.itemsInCutting} />
          <Metric label="In stitching" value={metrics.itemsInStitching} />
          <Metric label="In finishing" value={metrics.itemsInFinishing} />
          <Metric label="Sales this month" value={formatCurrency(metrics.salesThisMonth)} />
          <Metric label="Orders this month" value={metrics.ordersThisMonth} />
          <Metric label="Customers" value={metrics.customerCount} />
          <Metric label="Active production" value={metrics.productionActiveCount} />
        </section>
      ) : null}

      {worklistsQuery.isLoading ? <Loading label="Loading quick lists" /> : null}
      {worklistsQuery.data ? (
        <section className="grid gap-4 xl:grid-cols-2">
          <OrderList title="Next 5 deliveries" orders={worklistsQuery.data.nextDeliveries} empty="No upcoming delivery orders." />
          <ProductionList title="Ready but not delivered" items={worklistsQuery.data.readyItems} empty="No ready items yet." />
          <OrderList title="Overdue orders" orders={worklistsQuery.data.overdueOrders} empty="No overdue orders." />
          <OrderList title="Due payment orders" orders={worklistsQuery.data.dueOrders} empty="No due payments in the current window." />
          <OrderList title="Recent orders" orders={worklistsQuery.data.recentOrders} empty="No recent orders." />
        </section>
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone = 'slate' }: { label: string; value: string | number; tone?: 'slate' | 'blue' | 'red' | 'green' | 'amber' }) {
  const toneClass = {
    slate: 'bg-slate-50 text-slate-700',
    blue: 'bg-blue-50 text-blue-700',
    red: 'bg-red-50 text-red-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-800',
  }[tone];

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className={`mt-3 inline-flex rounded-lg px-2 py-1 text-2xl font-semibold ${toneClass}`}>{value}</p>
    </article>
  );
}

function OrderList({ title, orders, empty }: { title: string; orders: OrderListItem[]; empty: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {orders.length === 0 ? <p className="py-3 text-sm text-slate-500">{empty}</p> : null}
        {orders.map((order) => (
          <Link key={order.id} to={`/orders/${order.id}`} className="block py-3 text-sm hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{order.order_number}</p>
                <p className="mt-1 text-slate-600">{order.customer?.name ?? 'Unknown'} {order.customer?.phone ? `- ${order.customer.phone}` : ''}</p>
              </div>
              <span className="text-right font-semibold text-slate-950">{formatDate(order.delivery_date)}</span>
            </div>
            {order.dueAmount > 0 ? <p className="mt-1 text-xs font-semibold text-amber-700">Due {formatCurrency(order.dueAmount)}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ProductionList({ title, items, empty }: { title: string; items: ProductionItem[]; empty: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <h2 className="font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 divide-y divide-slate-100">
        {items.length === 0 ? <p className="py-3 text-sm text-slate-500">{empty}</p> : null}
        {items.map((item) => (
          <Link key={item.id} to={`/orders/${item.order_id}`} className="block py-3 text-sm hover:bg-slate-50">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{item.order?.order_number ?? 'Order'} - {item.garment_name_snapshot}</p>
                <p className="mt-1 text-slate-600">{item.customer?.name ?? 'Unknown'} {item.customer?.phone ? `- ${item.customer.phone}` : ''}</p>
              </div>
              <span className="text-right font-semibold text-slate-950">{formatDate(item.dueDate)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}


