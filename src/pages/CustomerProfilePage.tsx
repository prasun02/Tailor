import { Archive, CreditCard, FileText, NotebookText, PackageCheck, Pencil, RotateCcw, Ruler, ShieldAlert, UserRound } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useArchiveCustomer, useCustomer, useRestoreCustomer } from '../features/customers/customerHooks';
import type { CustomerProfile } from '../features/customers/customerService';
import { useShop } from '../features/shop/shopContext';
import { canArchiveCustomers, canManageCustomers, canRestoreCustomers } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';

type ProfileTab = 'overview' | 'measurements' | 'orders' | 'payments' | 'notes';

const tabs: { id: ProfileTab; label: string; icon: typeof UserRound }[] = [
  { id: 'overview', label: 'Overview', icon: UserRound },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'orders', label: 'Orders', icon: PackageCheck },
  { id: 'payments', label: 'Payments summary', icon: CreditCard },
  { id: 'notes', label: 'Notes', icon: NotebookText },
];

export function CustomerProfilePage() {
  const { customerId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentRole, currentShopId } = useShop();
  const customerQuery = useCustomer(currentShopId, customerId);
  const archiveCustomer = useArchiveCustomer(currentShopId ?? '');
  const restoreCustomer = useRestoreCustomer(currentShopId ?? '');
  const activeTab = (searchParams.get('tab') as ProfileTab | null) ?? 'overview';

  if (customerQuery.isLoading) {
    return <Loading label="Loading customer profile" />;
  }

  if (customerQuery.isError || !customerQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Customer not found" message={customerQuery.error?.message ?? 'This customer could not be loaded.'} />;
  }

  const profile = customerQuery.data;
  const { customer } = profile;
  const archived = Boolean(customer.deleted_at || !customer.is_active);
  const canEdit = canManageCustomers(currentRole);
  const canArchive = canArchiveCustomers(currentRole) && !archived;
  const canRestore = canRestoreCustomers(currentRole) && archived;

  async function handleArchive() {
    if (!customerId || !window.confirm('Archive this customer? Orders and measurements will remain available.')) {
      return;
    }

    await archiveCustomer.mutateAsync(customerId);
  }

  async function handleRestore() {
    if (!customerId) {
      return;
    }

    await restoreCustomer.mutateAsync(customerId);
  }

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-950">{customer.name}</h1>
              <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', archived ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-700')}>
                {archived ? 'Archived' : 'Active'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">{customer.customer_code}</p>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <SummaryCard label="Phone" value={customer.phone ?? 'No phone'} />
              <SummaryCard label="Created" value={formatDateTime(customer.created_at)} />
              <SummaryCard label="Latest order" value={profile.summary.latestOrder?.order_number ?? 'No orders'} />
              <SummaryCard label="Outstanding" value={formatCurrency(profile.summary.outstandingAmount)} strong />
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
            {canEdit ? (
              <Link
                to={`/customers/${customer.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
              >
                <Pencil aria-hidden="true" className="h-4 w-4" />
                Edit
              </Link>
            ) : null}
            {canArchive ? (
              <button
                type="button"
                disabled={archiveCustomer.isPending}
                onClick={() => void handleArchive()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-900 shadow-sm transition hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Archive aria-hidden="true" className="h-4 w-4" />
                Archive
              </button>
            ) : null}
            {canRestore ? (
              <button
                type="button"
                disabled={restoreCustomer.isPending}
                onClick={() => void handleRestore()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Restore
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-panel" aria-label="Customer profile tabs">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSearchParams(tab.id === 'overview' ? {} : { tab: tab.id })}
              className={cn(
                'inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition',
                active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950',
              )}
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        {activeTab === 'overview' ? <OverviewTab profile={profile} /> : null}
        {activeTab === 'measurements' ? <MeasurementsTab profile={profile} newIntent={searchParams.get('new') === '1'} /> : null}
        {activeTab === 'orders' ? <OrdersTab profile={profile} /> : null}
        {activeTab === 'payments' ? <PaymentsTab profile={profile} /> : null}
        {activeTab === 'notes' ? <NotesTab profile={profile} /> : null}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn('mt-1 truncate text-slate-700', strong ? 'font-semibold text-slate-950' : null)}>{value}</p>
    </div>
  );
}

function OverviewTab({ profile }: { profile: CustomerProfile }) {
  const { customer, summary } = profile;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoList
        title="Customer details"
        items={[
          ['Name', customer.name],
          ['Phone', customer.phone ?? 'No phone'],
          ['Alternative phone', customer.alternative_phone ?? 'Not set'],
          ['Address', customer.address ?? 'Not set'],
          ['Created', formatDateTime(customer.created_at)],
        ]}
      />
      <InfoList
        title="Activity summary"
        items={[
          ['Latest order', summary.latestOrder?.order_number ?? 'No orders'],
          ['Upcoming delivery', summary.upcomingDelivery ? formatDate(summary.upcomingDelivery.delivery_date) : 'Not scheduled'],
          ['Total paid', formatCurrency(summary.totalPaid)],
          ['Outstanding amount', formatCurrency(summary.outstandingAmount)],
        ]}
      />
    </div>
  );
}

function MeasurementsTab({ profile, newIntent }: { profile: CustomerProfile; newIntent: boolean }) {
  return (
    <div className="space-y-4">
      {newIntent ? (
        <div className="rounded-lg border border-brand-200 bg-brand-50 p-4 text-sm text-brand-900">
          Customer saved. Measurement creation will open here when the measurements module is implemented.
        </div>
      ) : null}
      {profile.measurements.length === 0 ? (
        <EmptyMini icon={Ruler} title="No measurements" message="Measurements for this customer will appear here." />
      ) : (
        <div className="divide-y divide-slate-100">
          {profile.measurements.map((measurement) => (
            <div key={measurement.id} className="py-3">
              <p className="font-semibold text-slate-950">Version {measurement.version_number}</p>
              <p className="mt-1 text-sm text-slate-600">
                {measurement.unit} - {formatDate(measurement.measured_at)} {measurement.is_current ? '- Current' : ''}
              </p>
              {measurement.notes ? <p className="mt-2 text-sm text-slate-600">{measurement.notes}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OrdersTab({ profile }: { profile: CustomerProfile }) {
  if (profile.orders.length === 0) {
    return <EmptyMini icon={PackageCheck} title="No orders" message="Orders for this customer will appear here." />;
  }

  return (
    <div className="divide-y divide-slate-100">
      {profile.orders.map((order) => (
        <div key={order.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-slate-950">{order.order_number}</p>
            <p className="mt-1 text-sm text-slate-600">
              Ordered {formatDate(order.order_date)} - Delivery {formatDate(order.delivery_date)}
            </p>
          </div>
          <div className="text-sm font-semibold text-slate-950">{formatCurrency(order.total_amount)}</div>
        </div>
      ))}
    </div>
  );
}

function PaymentsTab({ profile }: { profile: CustomerProfile }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <SummaryCard label="Total paid" value={formatCurrency(profile.summary.totalPaid)} strong />
        <SummaryCard label="Outstanding" value={formatCurrency(profile.summary.outstandingAmount)} strong />
      </div>
      {profile.payments.length === 0 ? (
        <EmptyMini icon={CreditCard} title="No payments" message="Completed and voided payments for recent orders will appear here." />
      ) : (
        <div className="divide-y divide-slate-100">
          {profile.payments.map((payment) => (
            <div key={payment.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{payment.order_number ?? 'Order'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {payment.payment_method.replace('_', ' ')} - {payment.payment_status} - {formatDateTime(payment.paid_at)}
                </p>
              </div>
              <div className="text-sm font-semibold text-slate-950">{formatCurrency(payment.amount)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function NotesTab({ profile }: { profile: CustomerProfile }) {
  return profile.customer.notes ? (
    <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-6 text-slate-700">{profile.customer.notes}</div>
  ) : (
    <EmptyMini icon={FileText} title="No notes" message="Customer notes will appear here after they are added." />
  );
}

function InfoList({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <dl className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-1 px-3 py-3 text-sm sm:grid-cols-[10rem_1fr]">
            <dt className="font-medium text-slate-500">{label}</dt>
            <dd className="text-slate-800">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function EmptyMini({ icon: Icon, title, message }: { icon: typeof UserRound; title: string; message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </div>
      <h2 className="mt-3 text-base font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{message}</p>
    </div>
  );
}
