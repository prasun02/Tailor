import { AlertTriangle, CheckCircle2, Search, Shirt } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useAuth } from '../features/auth/authContext';
import { useChangeOrderItemStatus, useProductionItems } from '../features/orders/orderHooks';
import { productionStatuses } from '../features/orders/orderSchemas';
import type { ProductionItem } from '../features/orders/orderService';
import { useShop } from '../features/shop/shopContext';
import type { ProductionStatus } from '../types/database';
import { hasAnyRole } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatDate } from '../utils/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const boardStatuses: ProductionStatus[] = productionStatuses.filter((status) => status !== 'delivered' && status !== 'cancelled');

export function ProductionPage() {
  const { user } = useAuth();
  const { currentRole, currentShopId } = useShop();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductionStatus | 'all'>('all');
  const debouncedSearch = useDebouncedValue(search, 300);
  const workerOnly = hasAnyRole(currentRole, ['cutter', 'tailor']) && !hasAnyRole(currentRole, ['owner', 'manager', 'staff']);
  const statuses = statusFilter === 'all' ? boardStatuses : [statusFilter];
  const productionQuery = useProductionItems(currentShopId, {
    statuses,
    assignedTo: workerOnly ? user?.id ?? null : null,
    search: debouncedSearch,
    limit: 160,
  });
  const changeStatus = useChangeOrderItemStatus(currentShopId ?? '');
  const items = useMemo(() => productionQuery.data ?? [], [productionQuery.data]);
  const grouped = useMemo(() => {
    return boardStatuses.reduce<Record<ProductionStatus, ProductionItem[]>>((acc, status) => {
      acc[status] = items.filter((item) => item.production_status === status);
      return acc;
    }, {} as Record<ProductionStatus, ProductionItem[]>);
  }, [items]);

  async function moveItem(item: ProductionItem, status: ProductionStatus) {
    await changeStatus.mutateAsync({ orderItemId: item.id, status, note: `Moved to ${formatStatus(status)}` });
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Shirt aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Production Board</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Track cutting, stitching, finishing, quality check, and ready status per garment item.</p>
        </div>
      </header>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-3 md:grid-cols-[1fr_16rem]">
          <label className="relative block">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search token, mobile, customer, garment" className="min-h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
          </label>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ProductionStatus | 'all')} className="min-h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
            <option value="all">All active statuses</option>
            {boardStatuses.map((status) => <option key={status} value={status}>{formatStatus(status)}</option>)}
          </select>
        </div>
        {workerOnly ? <p className="mt-3 text-sm text-slate-500">Showing assigned work for your cutter/tailor account.</p> : null}
      </section>

      {productionQuery.isLoading ? <Loading label="Loading production board" /> : null}
      {productionQuery.isError ? <EmptyState icon={AlertTriangle} title="Could not load production" message={productionQuery.error.message} /> : null}
      {!productionQuery.isLoading && items.length === 0 ? <EmptyState icon={Shirt} title="No production items found" message="New order items will appear here after confirmation." /> : null}

      <section className="grid gap-4 xl:grid-cols-3">
        {boardStatuses.map((status) => {
          const statusItems = grouped[status] ?? [];

          if (statusFilter !== 'all' && statusFilter !== status) return null;

          return (
            <div key={status} className="rounded-lg border border-slate-200 bg-white shadow-panel">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h2 className="text-sm font-semibold text-slate-950">{formatStatus(status)}</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{statusItems.length}</span>
              </div>
              <div className="space-y-3 p-3">
                {statusItems.length === 0 ? <p className="p-3 text-sm text-slate-500">No items.</p> : null}
                {statusItems.map((item) => <ProductionCard key={item.id} item={item} isUpdating={changeStatus.isPending} onMove={moveItem} />)}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function ProductionCard({ item, isUpdating, onMove }: { item: ProductionItem; isUpdating: boolean; onMove: (item: ProductionItem, status: ProductionStatus) => Promise<void> }) {
  const currentIndex = boardStatuses.indexOf(item.production_status);
  const nextStatus = currentIndex >= 0 ? boardStatuses[currentIndex + 1] : undefined;

  return (
    <article className={cn('rounded-lg border p-3 text-sm', item.isOverdue ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link to={`/orders/${item.order_id}`} className="font-semibold text-slate-950 hover:text-brand-700">{item.order?.order_number ?? 'Order'}</Link>
          <p className="mt-1 text-slate-600">{item.customer?.name ?? 'Unknown customer'} {item.customer?.phone ? `- ${item.customer.phone}` : ''}</p>
        </div>
        {item.isOverdue ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue</span> : null}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-slate-600">
        <p>Garment<br /><strong className="text-slate-950">{item.garment_name_snapshot}</strong></p>
        <p>Quantity<br /><strong className="text-slate-950">{item.quantity}</strong></p>
        <p>Delivery<br /><strong className="text-slate-950">{formatDate(item.dueDate)}</strong></p>
        <p>Worker<br /><strong className="text-slate-950">{item.assigned_to?.slice(0, 8) ?? 'Unassigned'}</strong></p>
      </div>
      {item.special_instructions ? <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-900">Special instruction</p> : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {nextStatus ? (
          <button type="button" disabled={isUpdating} onClick={() => void onMove(item, nextStatus)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50">
            Move to {formatStatus(nextStatus)}
          </button>
        ) : null}
        {item.production_status !== 'ready' ? (
          <button type="button" disabled={isUpdating} onClick={() => void onMove(item, 'ready')} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand-600 px-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            Mark Ready
          </button>
        ) : null}
      </div>
    </article>
  );
}

function formatStatus(status: ProductionStatus): string {
  return status.replace(/_/g, ' ');
}
