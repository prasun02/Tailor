import { Banknote, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { TextField } from '../components/ui/FormField';
import { useOrderDetail, useRecordOrderPayment } from '../features/orders/orderHooks';
import { paymentFormSchema, paymentMethods, type PaymentFormValues } from '../features/orders/orderSchemas';
import { useShop } from '../features/shop/shopContext';
import { canRecordPayments } from '../utils/authorization';
import { formatCurrency } from '../utils/format';

export function OrderPaymentPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const { currentRole, currentShopId } = useShop();
  const orderQuery = useOrderDetail(currentShopId, orderId);
  const recordPayment = useRecordOrderPayment(currentShopId ?? '', orderId ?? '');
  const [values, setValues] = useState<PaymentFormValues>({ amount: 0, paymentMethod: 'cash', reference: '', notes: '', allowOverpayment: false });
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!canRecordPayments(currentRole)) return <EmptyState icon={ShieldAlert} title="Payments are restricted" message="Only owners and managers can record payments." />;
  if (orderQuery.isLoading) return <Loading label="Loading order payment" />;
  if (orderQuery.isError || !orderQuery.data) return <EmptyState icon={ShieldAlert} title="Order not found" message={orderQuery.error?.message ?? 'Order could not be loaded.'} />;

  async function submitPayment() {
    const parsed = paymentFormSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => { next[String(issue.path[0])] = issue.message; });
      setErrors(next);
      return;
    }
    await recordPayment.mutateAsync(parsed.data);
    navigate(`/orders/${orderId}`);
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Banknote aria-hidden="true" className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold text-slate-950">Add payment</h1>
        <p className="mt-1 text-sm text-slate-600">Due amount: <strong>{formatCurrency(orderQuery.data.financial.dueAmount)}</strong></p>
      </header>
      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <TextField label="Amount" type="number" inputMode="decimal" value={values.amount} error={errors.amount} onChange={(event) => setValues({ ...values, amount: Number(event.target.value) })} />
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Payment method</span><select value={values.paymentMethod} onChange={(event) => setValues({ ...values, paymentMethod: event.target.value as PaymentFormValues['paymentMethod'] })} className="min-h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">{paymentMethods.map((method) => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}</select></label>
        <TextField label="Reference" value={values.reference ?? ''} onChange={(event) => setValues({ ...values, reference: event.target.value })} />
        <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">Notes</span><textarea value={values.notes ?? ''} onChange={(event) => setValues({ ...values, notes: event.target.value })} className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" /></label>
        <label className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700"><input type="checkbox" checked={values.allowOverpayment} onChange={(event) => setValues({ ...values, allowOverpayment: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />Allow owner-approved overpayment</label>
        {recordPayment.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{recordPayment.error.message}</p> : null}
        <button type="button" disabled={recordPayment.isPending} onClick={() => void submitPayment()} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">Record payment</button>
      </section>
    </div>
  );
}

