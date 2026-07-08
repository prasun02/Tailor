import { AlertCircle, Archive, ChevronLeft, ChevronRight, Plus, Search, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useShop } from '../features/shop/shopContext';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useCustomerList } from '../features/customers/customerHooks';
import type { CustomerListItem } from '../features/customers/customerService';
import { canManageCustomers, canViewArchivedCustomers } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate } from '../utils/format';
import { useState } from 'react';

const PAGE_SIZE = 10;

export function CustomersPage() {
  const { currentRole, currentShopId } = useShop();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [includeArchived, setIncludeArchived] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 350);
  const canCreate = canManageCustomers(currentRole);
  const canShowArchived = canViewArchivedCustomers(currentRole);
  const customersQuery = useCustomerList({
    shopId: currentShopId,
    search: debouncedSearch,
    includeArchived: canShowArchived && includeArchived,
    page,
    pageSize: PAGE_SIZE,
  });
  const result = customersQuery.data;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <UsersRound aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Customers</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            Search customer records by name, phone, or customer code. Active customers are shown by default.
          </p>
        </div>
        {canCreate ? (
          <Link
            to="/customers/new"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            New customer
          </Link>
        ) : null}
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block flex-1">
            <span className="sr-only">Search customers</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, or code"
              className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          {canShowArchived ? (
            <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(event) => {
                  setIncludeArchived(event.target.checked);
                  setPage(1);
                }}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
              />
              Show archived customers
            </label>
          ) : null}
        </div>
      </section>

      {customersQuery.isLoading ? <Loading label="Loading customers" /> : null}

      {customersQuery.isError ? (
        <EmptyState
          icon={AlertCircle}
          title="Could not load customers"
          message={customersQuery.error.message}
        />
      ) : null}

      {result && result.customers.length === 0 ? (
        <EmptyState
          icon={Archive}
          title="No customers found"
          message="Adjust the search, include archived customers if permitted, or create a new customer."
          action={canCreate ? <Link className="font-semibold text-brand-700 underline" to="/customers/new">Create customer</Link> : null}
        />
      ) : null}

      {result && result.customers.length > 0 ? (
        <>
          <div className="grid gap-3 md:hidden">
            {result.customers.map((customer) => (
              <CustomerCard key={customer.id} customer={customer} />
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel md:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Latest order</th>
                  <th className="px-4 py-3">Upcoming delivery</th>
                  <th className="px-4 py-3 text-right">Outstanding</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.customers.map((customer) => (
                  <tr key={customer.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link className="font-semibold text-slate-950 hover:text-brand-700" to={`/customers/${customer.id}`}>
                        {customer.name}
                      </Link>
                      <p className="mt-1 text-xs text-slate-500">{customer.customer_code}</p>
                      <CustomerStatus customer={customer} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{customer.phone ?? 'No phone'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {customer.latestOrder ? customer.latestOrder.order_number : 'No orders'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {customer.upcomingDelivery ? formatDate(customer.upcomingDelivery.delivery_date) : 'Not scheduled'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-950">
                      {formatCurrency(customer.outstandingAmount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-panel sm:flex-row sm:items-center sm:justify-between">
            <span>
              Page {result.page} of {result.pageCount} - {result.count} customer{result.count === 1 ? '' : 's'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((currentPage) => Math.max(currentPage - 1, 1))}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft aria-hidden="true" className="h-4 w-4" />
                Previous
              </button>
              <button
                type="button"
                disabled={page >= result.pageCount}
                onClick={() => setPage((currentPage) => Math.min(currentPage + 1, result.pageCount))}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
                <ChevronRight aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function CustomerCard({ customer }: { customer: CustomerListItem }) {
  return (
    <Link to={`/customers/${customer.id}`} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel transition hover:border-brand-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-slate-950">{customer.name}</p>
          <p className="mt-1 text-xs text-slate-500">{customer.customer_code}</p>
        </div>
        <CustomerStatus customer={customer} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <SummaryItem label="Phone" value={customer.phone ?? 'No phone'} />
        <SummaryItem label="Created" value={formatDate(customer.created_at)} />
        <SummaryItem label="Latest order" value={customer.latestOrder?.order_number ?? 'No orders'} />
        <SummaryItem label="Upcoming" value={customer.upcomingDelivery ? formatDate(customer.upcomingDelivery.delivery_date) : 'Not scheduled'} />
      </div>
      <p className="mt-4 text-sm font-semibold text-slate-950">Outstanding: {formatCurrency(customer.outstandingAmount)}</p>
    </Link>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 truncate text-slate-700">{value}</p>
    </div>
  );
}

function CustomerStatus({ customer }: { customer: CustomerListItem }) {
  const archived = customer.deleted_at || !customer.is_active;

  return (
    <span
      className={cn(
        'mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
        archived ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-700',
      )}
    >
      {archived ? 'Archived' : 'Active'}
    </span>
  );
}
