import { ShieldAlert, UsersRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { CustomerForm, type CustomerFormIntent } from '../features/customers/components/CustomerForm';
import type { CustomerFormValues } from '../features/customers/customerSchema';
import { useCreateCustomer } from '../features/customers/customerHooks';
import { useAuth } from '../features/auth/authContext';
import { useShop } from '../features/shop/shopContext';
import { canManageCustomers } from '../utils/authorization';

export function NewCustomerPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentRole, currentShopId } = useShop();
  const canCreate = canManageCustomers(currentRole);
  const createCustomer = useCreateCustomer(currentShopId ?? '', user?.id);

  if (!currentShopId || !canCreate) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Customer creation is unavailable"
        message="Only owners, managers, and staff can create customers in this shop."
      />
    );
  }

  async function handleSubmit(values: CustomerFormValues, intent: CustomerFormIntent) {
    const customer = await createCustomer.mutateAsync(values);
    navigate(intent === 'measurement' ? `/customers/${customer.id}?tab=measurements&new=1` : `/customers/${customer.id}`);
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <UsersRound aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">New customer</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
          Add a customer with optional phone, address, and tailoring notes. Bangla and English text are supported.
        </p>
      </header>
      <CustomerForm
        shopId={currentShopId}
        isSubmitting={createCustomer.isPending}
        submitError={createCustomer.error?.message}
        submitLabel="Save and open customer"
        onSubmit={(values, intent) => void handleSubmit(values, intent)}
      />
    </div>
  );
}
