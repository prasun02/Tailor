import { ClipboardList, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { TextField } from '../components/ui/FormField';
import { useOrderDetail, useUpdateOrderDetails } from '../features/orders/orderHooks';
import { orderEditSchema, orderPriorities, type OrderEditValues } from '../features/orders/orderSchemas';
import { useShop } from '../features/shop/shopContext';
import { canCreateOrders } from '../utils/authorization';

export function EditOrderPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { currentRole, currentShopId } = useShop();
  const orderQuery = useOrderDetail(currentShopId, orderId);
  const updateOrder = useUpdateOrderDetails(currentShopId ?? '', orderId ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState<OrderEditValues | null>(null);

  if (!canCreateOrders(currentRole)) {
    return <EmptyState icon={ShieldAlert} title="Order editing is restricted" message="Only owners, managers, and staff can edit order details." />;
  }

  if (orderQuery.isLoading) return <Loading label="Loading order" />;
  if (orderQuery.isError || !orderQuery.data) return <EmptyState icon={ShieldAlert} title="Order not found" message={orderQuery.error?.message ?? 'Order could not be loaded.'} />;

  const formValues = values ?? {
    orderDate: orderQuery.data.order.order_date,
    trialDate: orderQuery.data.order.trial_date ?? '',
    deliveryDate: orderQuery.data.order.delivery_date ?? '',
    priority: orderQuery.data.order.priority,
    notes: orderQuery.data.order.notes ?? '',
  };

  async function submit() {
    const parsed = orderEditSchema.safeParse(formValues);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { next[String(issue.path[0])] = issue.message; });
      setErrors(next);
      return;
    }
    await updateOrder.mutateAsync(parsed.data);
    navigate(`/orders/${orderId}`);
  }

  function patch(patchValues: Partial<OrderEditValues>) {
    setValues({ ...formValues, ...patchValues });
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><ClipboardList aria-hidden="true" className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold text-slate-950">Edit order</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Update dates, priority, and notes. Financial totals and item snapshots are not edited here.</p>
      </header>
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Order date" type="date" value={formValues.orderDate} error={errors.orderDate} onChange={(event) => patch({ orderDate: event.target.value })} />
          <TextField label="Trial date" type="date" value={formValues.trialDate ?? ''} onChange={(event) => patch({ trialDate: event.target.value })} />
          <TextField label="Delivery date" type="date" value={formValues.deliveryDate ?? ''} onChange={(event) => patch({ deliveryDate: event.target.value })} />
          <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Priority</span><select value={formValues.priority} onChange={(event) => patch({ priority: event.target.value as OrderEditValues['priority'] })} className="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">{orderPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select></label>
        </div>
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Notes</span><textarea value={formValues.notes ?? ''} onChange={(event) => patch({ notes: event.target.value })} className="min-h-28 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        {updateOrder.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{updateOrder.error.message}</p> : null}
        <button type="button" disabled={updateOrder.isPending} onClick={() => void submit()} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Save order details</button>
      </section>
    </div>
  );
}
