import { ShieldAlert, UsersRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { CustomerForm, type CustomerFormIntent } from '../features/customers/components/CustomerForm';
import { customerToFormValues } from '../features/customers/customerMappers';
import type { CustomerFormValues } from '../features/customers/customerSchema';
import { useCustomer, useUpdateCustomer } from '../features/customers/customerHooks';
import { useShop } from '../features/shop/shopContext';
import { canManageCustomers } from '../utils/authorization';

export function EditCustomerPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const { currentRole, currentShopId } = useShop();
  const canEdit = canManageCustomers(currentRole);
  const customerQuery = useCustomer(currentShopId, customerId);
  const updateCustomer = useUpdateCustomer(currentShopId ?? '', customerId ?? '');

  if (!currentShopId || !canEdit) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Customer editing is unavailable"
        message="Only owners, managers, and staff can edit customers in this shop."
      />
    );
  }

  if (customerQuery.isLoading) {
    return <Loading label="Loading customer" />;
  }

  if (customerQuery.isError || !customerQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Customer not found" message={customerQuery.error?.message ?? 'This customer could not be loaded.'} />;
  }

  async function handleSubmit(values: CustomerFormValues, intent: CustomerFormIntent) {
    const customer = await updateCustomer.mutateAsync(values);
    navigate(intent === 'measurement' ? `/customers/${customer.id}?tab=measurements&new=1` : `/customers/${customer.id}`);
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <UsersRound aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Edit customer</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Update contact details, address, and notes.</p>
      </header>
      <CustomerForm
        shopId={currentShopId}
        customerId={customerId}
        initialValues={customerToFormValues(customerQuery.data.customer)}
        isSubmitting={updateCustomer.isPending}
        submitError={updateCustomer.error?.message}
        submitLabel="Save changes"
        onSubmit={(values, intent) => void handleSubmit(values, intent)}
      />
    </div>
  );
}

