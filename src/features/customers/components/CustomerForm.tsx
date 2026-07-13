import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, ArrowRight, Ruler, Save } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { TextAreaField, TextField } from '../../../components/ui/FormField';
import { cn } from '../../../utils/cn';
import { customerFormSchema, emptyCustomerFormValues, type CustomerFormValues } from '../customerSchema';
import { useDuplicateCustomerPhone } from '../customerHooks';

export type CustomerFormIntent = 'open' | 'measurement';

type CustomerFormProps = {
  shopId: string;
  customerId?: string;
  initialValues?: CustomerFormValues;
  submitLabel?: string;
  isSubmitting?: boolean;
  submitError?: string | null;
  onSubmit: (values: CustomerFormValues, intent: CustomerFormIntent) => void;
};

export function CustomerForm({
  shopId,
  customerId,
  initialValues = emptyCustomerFormValues,
  submitLabel = 'Save customer',
  isSubmitting = false,
  submitError,
  onSubmit,
}: CustomerFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });
  const phone = useWatch({ control, name: 'phone' });
  const duplicateQuery = useDuplicateCustomerPhone(shopId, phone, customerId);
  const duplicateCustomer = duplicateQuery.data;

  return (
    <form
      className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-panel sm:p-6"
      onSubmit={handleSubmit((values, event) => {
        const submitter = (event?.nativeEvent as SubmitEvent | undefined)?.submitter as HTMLButtonElement | null;
        onSubmit(values, submitter?.value === 'measurement' ? 'measurement' : 'open');
      })}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Customer name"
          autoComplete="name"
          placeholder="Enter customer full name"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label="Phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          error={errors.phone?.message}
          description="Optional. Used for duplicate checks and phone search."
          {...register('phone')}
        />
        <TextField
          label="Alternative phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01XXXXXXXXX"
          error={errors.alternativePhone?.message}
          {...register('alternativePhone')}
        />
        <TextField
          label="Address"
          autoComplete="street-address"
          placeholder="House, road, area"
          error={errors.address?.message}
          {...register('address')}
        />
      </div>

      {duplicateCustomer ? (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-none" />
          <div className="min-w-0">
            <p className="font-semibold">Another active customer uses this phone.</p>
            <p className="mt-1">
              Review{' '}
              <Link className="font-semibold underline" to={`/customers/${duplicateCustomer.id}`}>
                {duplicateCustomer.name} ({duplicateCustomer.customer_code})
              </Link>{' '}
              before saving a duplicate record.
            </p>
          </div>
        </div>
      ) : null}

      <TextAreaField
        label="Notes"
        placeholder="Preferences, landmarks, special instructions"
        error={errors.notes?.message}
        {...register('notes')}
      />

      {submitError ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{submitError}</p> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          name="intent"
          value="open"
          disabled={isSubmitting}
          className={cn(
            'inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          {submitLabel}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          type="submit"
          name="intent"
          value="measurement"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Ruler aria-hidden="true" className="h-4 w-4" />
          Save and create measurement
        </button>
      </div>
    </form>
  );
}

