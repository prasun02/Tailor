import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Image,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useState, type Dispatch, type SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { TextAreaField, TextField } from '../components/ui/FormField';
import { useCreateCustomer, useDuplicateCustomerPhone, useUpdateCustomer } from '../features/customers/customerHooks';
import type { Customer, CustomerListItem } from '../features/customers/customerService';
import { DynamicField } from '../features/measurements/components/DynamicField';
import { displayDynamicValue, jsonObject, optionObjects } from '../features/measurements/components/display';
import { useMeasurementFields, useStyleFields } from '../features/measurements/configurationHooks';
import { createMeasurementVersion } from '../features/measurements/measurementService';
import type { GarmentType, MeasurementField, MeasurementSet } from '../features/measurements/types';
import { dueAfterAdvance, lineTotal, subtotal, totalAfterDiscount } from '../features/orders/orderCalculations';
import { useCreateOrder, useCustomerMeasurementsForOrder, useOrderCustomerSearch, useOrderWizardContext } from '../features/orders/orderHooks';
import { buildCreateOrderPayload } from '../features/orders/orderPayload';
import {
  emptyOrderItem,
  emptyOrderWizardValues,
  orderPriorities,
  orderWizardSchema,
  paymentMethods,
  type OrderItemFormValues,
  type OrderWizardValues,
} from '../features/orders/orderSchemas';
import { useShop } from '../features/shop/shopContext';
import type { MeasurementUnit } from '../types/database';
import { canAssignWorkers, canCreateOrders } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const steps = ['Customer Details', 'Garment & Measurement', 'Cloth / Reference', 'Payment & Delivery', 'Preview'];

type CustomerDraft = {
  name: string;
  phone: string;
  alternativePhone: string;
  address: string;
  notes: string;
};

const emptyCustomerDraft: CustomerDraft = {
  name: '',
  phone: '',
  alternativePhone: '',
  address: '',
  notes: '',
};

function draftKey(shopId: string | null) {
  return `tailor-store-manager:new-order-draft:${shopId ?? 'unknown-shop'}`;
}

function itemHasMeasurementValues(item: OrderItemFormValues) {
  return Object.values(item.measurementValues ?? {}).some((value) => value !== '' && value !== null && value !== undefined);
}

function newOrderItem(unit: MeasurementUnit): OrderItemFormValues {
  return { ...emptyOrderItem(), measurementMode: 'new', measurementUnit: unit };
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const { currentRole, currentShop, currentShopId } = useShop();
  const canCreate = canCreateOrders(currentRole);
  const canAssign = canAssignWorkers(currentRole);
  const defaultUnit = currentShop?.default_measurement_unit ?? 'inch';
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OrderWizardValues>(() => ({
    ...emptyOrderWizardValues(),
    items: [newOrderItem(defaultUnit)],
  }));
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomerDraft);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | CustomerListItem | null>(null);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flowError, setFlowError] = useState('');
  const [shouldPrintAfterCreate, setShouldPrintAfterCreate] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const contextQuery = useOrderWizardContext(currentShopId);
  const customerSearchQuery = useOrderCustomerSearch(currentShopId, debouncedSearch);
  const measurementsQuery = useCustomerMeasurementsForOrder(currentShopId, values.customerId || undefined);
  const duplicateQuery = useDuplicateCustomerPhone(currentShopId, customerDraft.phone, selectedCustomer?.id);
  const createCustomer = useCreateCustomer(currentShopId ?? '');
  const updateCustomer = useUpdateCustomer(currentShopId ?? '', selectedCustomer?.id ?? '');
  const createOrder = useCreateOrder(currentShopId ?? '');
  const measurements = measurementsQuery.data ?? [];
  const subtotalValue = subtotal(values.items);
  const totalValue = totalAfterDiscount(values.items, values.discountAmount);
  const dueValue = dueAfterAdvance(values);

  const selectedCustomerText = selectedCustomer
    ? `${selectedCustomer.name} (${selectedCustomer.customer_code})${selectedCustomer.phone ? ` - ${selectedCustomer.phone}` : ''}`
    : '';

  if (!canCreate) {
    return <EmptyState icon={ShieldAlert} title="Order creation is restricted" message="Only owners, managers, and staff can create orders." />;
  }

  if (contextQuery.isLoading) {
    return <Loading label="Loading order setup" />;
  }

  if (contextQuery.isError || !contextQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Could not load order setup" message={contextQuery.error?.message ?? 'Order setup could not be loaded.'} />;
  }

  function selectCustomer(customer: Customer | CustomerListItem) {
    setSelectedCustomer(customer);
    setCustomerDraft({
      name: customer.name,
      phone: customer.phone ?? '',
      alternativePhone: customer.alternative_phone ?? '',
      address: customer.address ?? '',
      notes: customer.notes ?? '',
    });
    setValues((current) => ({ ...current, customerId: customer.id }));
    setErrors((current) => ({ ...current, customerId: '', customer: '' }));
  }

  function updateItem(itemId: string, patch: Partial<OrderItemFormValues>) {
    setValues((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    }));
  }

  function validateCustomerDraft() {
    const nextErrors: Record<string, string> = {};

    if (!customerDraft.name.trim()) nextErrors.customerName = 'Customer name is required.';
    if (!customerDraft.phone.trim()) nextErrors.customerPhone = 'Mobile number is required.';
    if (!selectedCustomer && duplicateQuery.data) {
      nextErrors.customerPhone = 'A customer with this mobile already exists. Select that customer first.';
    }

    return nextErrors;
  }

  function collectStepErrors(targetStep: number) {
    const nextErrors: Record<string, string> = {};

    if (targetStep === 0) {
      Object.assign(nextErrors, validateCustomerDraft());
    }

    if (targetStep === 1) {
      values.items.forEach((item, index) => {
        if (!item.garmentTypeId) nextErrors[`items.${index}.garmentTypeId`] = 'Select a garment type.';
        if (Number(item.quantity) <= 0) nextErrors[`items.${index}.quantity`] = 'Quantity must be greater than zero.';
        if (item.measurementMode === 'previous' && !item.measurementSetId) {
          nextErrors[`items.${index}.measurementSetId`] = 'Select a previous measurement.';
        }
        if (item.measurementMode === 'new' && !itemHasMeasurementValues(item)) {
          nextErrors[`items.${index}.measurementValues`] = 'Enter at least one measurement value.';
        }
      });
    }

    if (targetStep === 3) {
      if (!values.orderDate) nextErrors.orderDate = 'Order date is required.';
      if (!values.deliveryDate) nextErrors.deliveryDate = 'Delivery date is required.';
      if (Number(values.discountAmount) > subtotalValue) nextErrors.discountAmount = 'Discount cannot exceed subtotal.';
      if (Number(values.advanceAmount) > totalValue) nextErrors.advanceAmount = 'Advance cannot exceed total.';
    }

    return nextErrors;
  }

  function validateStep(targetStep = step) {
    const nextErrors = collectStepErrors(targetStep);
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function continueToNextStep() {
    if (!validateStep()) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function saveBrowserDraft() {
    if (!currentShopId) return;
    window.localStorage.setItem(draftKey(currentShopId), JSON.stringify({ values, customerDraft }));
    setFlowError('');
  }

  function loadBrowserDraft() {
    if (!currentShopId) return;
    const rawDraft = window.localStorage.getItem(draftKey(currentShopId));

    if (!rawDraft) {
      setFlowError('No browser draft found for this shop.');
      return;
    }

    try {
      const parsed = JSON.parse(rawDraft) as { values?: OrderWizardValues; customerDraft?: CustomerDraft };
      if (parsed.values) setValues(parsed.values);
      if (parsed.customerDraft) setCustomerDraft(parsed.customerDraft);
      setFlowError('');
    } catch {
      window.localStorage.removeItem(draftKey(currentShopId));
      setFlowError('Saved draft could not be restored.');
    }
  }

  async function resolveCustomerId() {
    if (!currentShopId) throw new Error('No active shop selected.');

    const customerErrors = validateCustomerDraft();
    if (Object.keys(customerErrors).length > 0) {
      setErrors(customerErrors);
      throw new Error('Customer details need attention.');
    }

    if (selectedCustomer) {
      const updatedCustomer = await updateCustomer.mutateAsync(customerDraft);
      selectCustomer(updatedCustomer);
      return updatedCustomer.id;
    }

    if (duplicateQuery.data) {
      setErrors({ customerPhone: 'A customer with this mobile already exists. Select that customer first.' });
      throw new Error('Duplicate customer mobile number.');
    }

    const createdCustomer = await createCustomer.mutateAsync(customerDraft);
    selectCustomer(createdCustomer);
    return createdCustomer.id;
  }

  async function confirmOrder(printAfterCreate: boolean) {
    if (!currentShopId) return;

    setFlowError('');
    setShouldPrintAfterCreate(printAfterCreate);

    const validationErrorsByStep = [0, 1, 3].map((index) => ({ index, errors: collectStepErrors(index) }));
    const firstInvalidStep = validationErrorsByStep.find((entry) => Object.keys(entry.errors).length > 0);
    const mergedErrors = validationErrorsByStep.reduce<Record<string, string>>((acc, entry) => ({ ...acc, ...entry.errors }), {});

    if (firstInvalidStep) {
      setErrors(mergedErrors);
      setStep(firstInvalidStep.index);
      return;
    }

    try {
      const customerId = await resolveCustomerId();
      const validationValues: OrderWizardValues = { ...values, customerId };
      const parsed = orderWizardSchema.safeParse(validationValues);

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {};
        for (const issue of parsed.error.issues) {
          nextErrors[issue.path.join('.')] = issue.message;
        }
        setErrors(nextErrors);
        setStep(3);
        return;
      }

      const itemsWithMeasurements: OrderItemFormValues[] = [];

      for (const item of parsed.data.items) {
        if (item.measurementMode === 'new') {
          const measurement = await createMeasurementVersion({
            shopId: currentShopId,
            customerId,
            garmentTypeId: item.garmentTypeId,
            unit: item.measurementUnit,
            values: item.measurementValues,
            notes: item.measurementNotes || null,
          });

          itemsWithMeasurements.push({ ...item, measurementSetId: measurement.id });
        } else {
          itemsWithMeasurements.push(item);
        }
      }

      const payload = buildCreateOrderPayload({ ...parsed.data, items: itemsWithMeasurements }, {});
      const result = await createOrder.mutateAsync({ customerId, payload });
      window.localStorage.removeItem(draftKey(currentShopId));
      navigate(`/orders/${result.order.id}?created=1${printAfterCreate ? '&print=token' : ''}`);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Order could not be confirmed.');
    } finally {
      setShouldPrintAfterCreate(false);
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <ClipboardCheck aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">New Customer Order</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Fast tailor shop entry with customer details, garment measurements, style choices, payment, preview, and receipt token.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-panel">
          {selectedCustomer ? <span className="font-medium text-slate-950">{selectedCustomerText}</span> : 'New customer entry'}
        </div>
      </header>

      <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-panel sm:grid-cols-5" aria-label="Order steps">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={cn(
              'min-h-11 rounded-lg px-2 text-xs font-semibold transition sm:text-sm',
              step === index ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <span className="block text-[10px] uppercase tracking-wide opacity-80">Step {index + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel sm:p-5">
        {step === 0 ? (
          <CustomerStep
            search={search}
            setSearch={setSearch}
            selectedCustomer={selectedCustomer}
            searchResults={customerSearchQuery.data?.customers ?? []}
            isSearching={customerSearchQuery.isFetching}
            customerDraft={customerDraft}
            setCustomerDraft={setCustomerDraft}
            duplicateCustomer={duplicateQuery.data}
            errors={errors}
            onSelectCustomer={selectCustomer}
            onClearSelected={() => {
              setSelectedCustomer(null);
              setValues((current) => ({ ...current, customerId: '' }));
            }}
          />
        ) : null}

        {step === 1 ? (
          <ItemsStep
            customerId={values.customerId}
            items={values.items}
            garments={contextQuery.data.garments}
            measurements={measurements}
            members={contextQuery.data.members}
            canAssign={canAssign}
            defaultUnit={defaultUnit}
            onAddItem={() => setValues((current) => ({ ...current, items: [...current.items, newOrderItem(defaultUnit)] }))}
            onRemoveItem={(itemId) => setValues((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }))}
            onUpdateItem={updateItem}
            errors={errors}
          />
        ) : null}

        {step === 2 ? (
          <ReferenceStep
            items={values.items}
            garments={contextQuery.data.garments}
            onUpdateItem={updateItem}
          />
        ) : null}

        {step === 3 ? <PaymentDeliveryStep values={values} setValues={setValues} errors={errors} /> : null}

        {step === 4 ? (
          <PreviewStep
            values={values}
            customerDraft={customerDraft}
            selectedCustomer={selectedCustomer}
            garments={contextQuery.data.garments}
            measurements={measurements}
            subtotalValue={subtotalValue}
            totalValue={totalValue}
            dueValue={dueValue}
          />
        ) : null}
      </section>

      {flowError || createOrder.error || createCustomer.error || updateCustomer.error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {flowError || createOrder.error?.message || createCustomer.error?.message || updateCustomer.error?.message}
        </p>
      ) : null}

      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={saveBrowserDraft}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={loadBrowserDraft}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Load Draft
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={continueToNextStep}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Continue
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={createOrder.isPending || createCustomer.isPending || updateCustomer.isPending}
                onClick={() => void confirmOrder(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
              >
                <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
                Confirm Order
              </button>
              <button
                type="button"
                disabled={createOrder.isPending || createCustomer.isPending || updateCustomer.isPending}
                onClick={() => void confirmOrder(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
              >
                <ReceiptText aria-hidden="true" className="h-4 w-4" />
                {shouldPrintAfterCreate ? 'Preparing Token' : 'Confirm and Print Token'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerStep({
  search,
  setSearch,
  selectedCustomer,
  searchResults,
  isSearching,
  customerDraft,
  setCustomerDraft,
  duplicateCustomer,
  errors,
  onSelectCustomer,
  onClearSelected,
}: {
  search: string;
  setSearch: (value: string) => void;
  selectedCustomer: Customer | CustomerListItem | null;
  searchResults: CustomerListItem[];
  isSearching: boolean;
  customerDraft: CustomerDraft;
  setCustomerDraft: Dispatch<SetStateAction<CustomerDraft>>;
  duplicateCustomer: Customer | null | undefined;
  errors: Record<string, string>;
  onSelectCustomer: (customer: Customer | CustomerListItem) => void;
  onClearSelected: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader title="Customer Details" description="Search an existing customer first, or enter a new customer with required mobile number." />

      <label className="relative block">
        <span className="sr-only">Search customers</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search token customer by mobile, name, or customer code"
          className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      {isSearching ? <p className="text-sm text-slate-500">Searching customers...</p> : null}

      {searchResults.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {searchResults.map((customer) => (
            <button key={customer.id} type="button" onClick={() => onSelectCustomer(customer)} className="rounded-lg border border-slate-200 p-3 text-left hover:bg-slate-50">
              <p className="font-semibold text-slate-950">{customer.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                {customer.customer_code} {customer.phone ? `- ${customer.phone}` : ''}
              </p>
              <p className="mt-1 text-xs text-slate-500">Due {formatCurrency(customer.outstandingAmount)}</p>
            </button>
          ))}
        </div>
      ) : null}

      {selectedCustomer ? (
        <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Selected existing customer: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.customer_code})
          </span>
          <button type="button" onClick={onClearSelected} className="rounded-lg border border-emerald-300 bg-white px-3 py-2 font-semibold text-emerald-900">
            Enter as new
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Customer name *" value={customerDraft.name} error={errors.customerName} onChange={(event) => setCustomerDraft((current) => ({ ...current, name: event.target.value }))} />
        <TextField label="Mobile *" inputMode="tel" value={customerDraft.phone} error={errors.customerPhone} onChange={(event) => setCustomerDraft((current) => ({ ...current, phone: event.target.value }))} />
        <TextField label="Alternative mobile" inputMode="tel" value={customerDraft.alternativePhone} onChange={(event) => setCustomerDraft((current) => ({ ...current, alternativePhone: event.target.value }))} />
        <TextField label="Address" value={customerDraft.address} onChange={(event) => setCustomerDraft((current) => ({ ...current, address: event.target.value }))} />
        <TextAreaField label="Customer notes" value={customerDraft.notes} onChange={(event) => setCustomerDraft((current) => ({ ...current, notes: event.target.value }))} className="md:col-span-2" />
      </div>

      {duplicateCustomer && !selectedCustomer ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Possible duplicate: {duplicateCustomer.name}. Select the existing customer before continuing.
        </p>
      ) : null}
    </div>
  );
}

function ItemsStep({
  customerId,
  items,
  garments,
  measurements,
  members,
  canAssign,
  defaultUnit,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  errors,
}: {
  customerId: string;
  items: OrderItemFormValues[];
  garments: GarmentType[];
  measurements: MeasurementSet[];
  members: Array<{ user_id: string; role: string }>;
  canAssign: boolean;
  defaultUnit: MeasurementUnit;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <StepHeader title="Garment and Measurement" description="Add one or more garments. Use previous measurements when available, or create a new measurement version." />
      {items.map((item, index) => (
        <OrderItemEditor
          key={item.id}
          item={item}
          index={index}
          customerId={customerId}
          garments={garments}
          measurements={measurements}
          members={members}
          canAssign={canAssign}
          defaultUnit={defaultUnit}
          onRemove={() => onRemoveItem(item.id)}
          onUpdate={(patch) => onUpdateItem(item.id, patch)}
          errors={errors}
        />
      ))}
      <button type="button" onClick={onAddItem} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Garment
      </button>
    </div>
  );
}

function OrderItemEditor({
  item,
  index,
  customerId,
  garments,
  measurements,
  members,
  canAssign,
  defaultUnit,
  onRemove,
  onUpdate,
  errors,
}: {
  item: OrderItemFormValues;
  index: number;
  customerId: string;
  garments: GarmentType[];
  measurements: MeasurementSet[];
  members: Array<{ user_id: string; role: string }>;
  canAssign: boolean;
  defaultUnit: MeasurementUnit;
  onRemove: () => void;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  const { currentShopId } = useShop();
  const styleFieldsQuery = useStyleFields(currentShopId, item.garmentTypeId || undefined, false);
  const measurementFieldsQuery = useMeasurementFields(currentShopId, item.garmentTypeId || undefined, false);
  const garmentMeasurements = measurements.filter((measurement) => measurement.garment_type_id === item.garmentTypeId);
  const selectedMeasurement = garmentMeasurements.find((measurement) => measurement.id === item.measurementSetId);
  const itemErrorPrefix = `items.${index}`;

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-950">Garment {index + 1}</h2>
          <p className="mt-1 text-xs text-slate-500">Measurement and style snapshot will be saved with this order item.</p>
        </div>
        <button type="button" title="Remove item" onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <SelectBox
          label="Garment *"
          value={item.garmentTypeId}
          error={errors[`${itemErrorPrefix}.garmentTypeId`]}
          onChange={(value) => onUpdate({ garmentTypeId: value, measurementSetId: '', measurementValues: {}, styleValues: {}, measurementUnit: defaultUnit })}
          options={garments.map((garment) => ({ value: garment.id, label: garment.name }))}
        />
        <TextField label="Quantity *" type="number" inputMode="numeric" value={item.quantity} error={errors[`${itemErrorPrefix}.quantity`]} onChange={(event) => onUpdate({ quantity: Number(event.target.value) })} />
        <TextField label="Unit price" type="number" inputMode="decimal" value={item.unitPrice} onChange={(event) => onUpdate({ unitPrice: Number(event.target.value) })} />
        <TextField label="Item delivery date" type="date" value={item.itemDeliveryDate ?? ''} onChange={(event) => onUpdate({ itemDeliveryDate: event.target.value })} />
        {canAssign ? (
          <SelectBox
            label="Assigned worker"
            value={item.assignedTo ?? ''}
            onChange={(value) => onUpdate({ assignedTo: value })}
            options={[{ value: '', label: 'Unassigned' }, ...members.map((member) => ({ value: member.user_id, label: `${member.role} - ${member.user_id.slice(0, 8)}` }))]}
          />
        ) : null}
      </div>

      <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        Line total preview: <strong>{formatCurrency(lineTotal(item))}</strong>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onUpdate({ measurementMode: 'new', measurementSetId: '' })}
          className={cn('rounded-lg border px-3 py-2 text-sm font-semibold', item.measurementMode === 'new' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600')}
        >
          Enter new measurement
        </button>
        <button
          type="button"
          disabled={garmentMeasurements.length === 0}
          onClick={() => onUpdate({ measurementMode: 'previous', measurementSetId: garmentMeasurements[0]?.id ?? '' })}
          className={cn('rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-50', item.measurementMode === 'previous' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600')}
        >
          Use previous measurement
        </button>
      </div>

      {item.measurementMode === 'previous' ? (
        <div className="mt-4">
          <SelectBox
            label="Measurement version *"
            value={item.measurementSetId ?? ''}
            error={errors[`${itemErrorPrefix}.measurementSetId`]}
            onChange={(value) => onUpdate({ measurementSetId: value })}
            options={garmentMeasurements.map((measurement) => ({ value: measurement.id, label: `Version ${measurement.version_number}${measurement.is_current ? ' (current)' : ''}` }))}
          />
          {selectedMeasurement ? <Snapshot title="Selected measurements" values={jsonObject(selectedMeasurement.values)} /> : null}
          {item.garmentTypeId && customerId ? (
            <Link to={`/customers/${customerId}/measurements/new?garmentTypeId=${item.garmentTypeId}`} className="mt-3 inline-block text-sm font-semibold text-brand-700 underline">
              Create a new measurement separately
            </Link>
          ) : null}
        </div>
      ) : (
        <NewMeasurementEditor
          item={item}
          fields={measurementFieldsQuery.data ?? []}
          isLoading={measurementFieldsQuery.isLoading}
          error={errors[`${itemErrorPrefix}.measurementValues`]}
          onUpdate={onUpdate}
        />
      )}

      {styleFieldsQuery.data && styleFieldsQuery.data.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-slate-950">Style options</h3>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {styleFieldsQuery.data.map((field) => (
              <DynamicField
                key={field.id}
                id={`${item.id}-${field.field_key}`}
                label={field.label}
                labelBn={field.label_bn}
                type={field.field_type}
                value={item.styleValues[field.field_key] as string | number | boolean | string[] | null | undefined}
                required={field.is_required}
                options={optionObjects(field.options)}
                onChange={(value) => onUpdate({ styleValues: { ...item.styleValues, [field.field_key]: value } })}
              />
            ))}
          </div>
        </div>
      ) : null}

      <TextAreaField label="Item special instruction" value={item.specialInstructions ?? ''} onChange={(event) => onUpdate({ specialInstructions: event.target.value })} className="mt-4" />
    </section>
  );
}

function NewMeasurementEditor({
  item,
  fields,
  isLoading,
  error,
  onUpdate,
}: {
  item: OrderItemFormValues;
  fields: MeasurementField[];
  isLoading: boolean;
  error?: string;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
}) {
  return (
    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectBox
          label="Measurement unit"
          value={item.measurementUnit}
          onChange={(value) => onUpdate({ measurementUnit: value as MeasurementUnit })}
          options={[
            { value: 'inch', label: 'Inches' },
            { value: 'cm', label: 'Centimeters' },
          ]}
        />
        <TextField label="Measurement notes" value={item.measurementNotes ?? ''} onChange={(event) => onUpdate({ measurementNotes: event.target.value })} />
      </div>
      {isLoading ? <p className="mt-3 text-sm text-slate-500">Loading measurement fields...</p> : null}
      {!isLoading && fields.length === 0 ? <p className="mt-3 text-sm text-slate-500">No configured fields for this garment. Enter notes or configure fields in Settings.</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {fields.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <DynamicField
              key={field.id}
              id={`${item.id}-measurement-${field.field_key}`}
              label={field.label}
              labelBn={field.label_bn}
              type={field.field_type}
              value={item.measurementValues[field.field_key] as string | number | boolean | string[] | null | undefined}
              required={field.is_required}
              options={[]}
              onChange={(value) => onUpdate({ measurementValues: { ...item.measurementValues, [field.field_key]: value } })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ReferenceStep({
  items,
  garments,
  onUpdateItem,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
}) {
  return (
    <div className="space-y-4">
      <StepHeader title="Cloth / Design Reference" description="Attach a reference URL if storage is configured elsewhere, or skip this step." />
      {items.map((item, index) => {
        const garment = garments.find((entry) => entry.id === item.garmentTypeId);
        return (
          <section key={item.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                <Image aria-hidden="true" className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'Garment'}</h2>
                <p className="text-sm text-slate-500">Optional cloth, design, or reference photo URL.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_12rem]">
              <TextField label="Reference image URL" value={item.designReferenceUrl ?? ''} onChange={(event) => onUpdateItem(item.id, { designReferenceUrl: event.target.value })} />
              {item.designReferenceUrl ? (
                <img src={item.designReferenceUrl} alt="" className="h-32 w-full rounded-lg border border-slate-200 object-cover" />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">Skipped</div>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PaymentDeliveryStep({
  values,
  setValues,
  errors,
}: {
  values: OrderWizardValues;
  setValues: Dispatch<SetStateAction<OrderWizardValues>>;
  errors: Record<string, string>;
}) {
  const subtotalValue = subtotal(values.items);
  const totalValue = totalAfterDiscount(values.items, values.discountAmount);
  const dueValue = dueAfterAdvance(values);

  return (
    <div className="space-y-5">
      <StepHeader title="Payment and Delivery" description="Browser totals are previews. The database RPC recalculates the final totals." />
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Order date *" type="date" value={values.orderDate} error={errors.orderDate} onChange={(event) => setValues((current) => ({ ...current, orderDate: event.target.value }))} />
        <TextField label="Trial date" type="date" value={values.trialDate ?? ''} onChange={(event) => setValues((current) => ({ ...current, trialDate: event.target.value }))} />
        <TextField label="Delivery date *" type="date" value={values.deliveryDate ?? ''} error={errors.deliveryDate} onChange={(event) => setValues((current) => ({ ...current, deliveryDate: event.target.value }))} />
        <SelectBox label="Priority" value={values.priority} onChange={(value) => setValues((current) => ({ ...current, priority: value as OrderWizardValues['priority'] }))} options={orderPriorities.map((priority) => ({ value: priority, label: priority }))} />
        <TextField label="Discount" type="number" inputMode="decimal" value={values.discountAmount} error={errors.discountAmount} onChange={(event) => setValues((current) => ({ ...current, discountAmount: Number(event.target.value) }))} />
        <TextField label="Advance" type="number" inputMode="decimal" value={values.advanceAmount} error={errors.advanceAmount} onChange={(event) => setValues((current) => ({ ...current, advanceAmount: Number(event.target.value) }))} />
        <SelectBox label="Payment method" value={values.paymentMethod} onChange={(value) => setValues((current) => ({ ...current, paymentMethod: value as OrderWizardValues['paymentMethod'] }))} options={paymentMethods.map((method) => ({ value: method, label: method.replace('_', ' ') }))} />
        <TextField label="Payment reference" value={values.paymentReference ?? ''} onChange={(event) => setValues((current) => ({ ...current, paymentReference: event.target.value }))} />
        <TextAreaField label="General order notes" value={values.notes ?? ''} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} className="md:col-span-2" />
      </div>
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-4">
        <Summary label="Subtotal" value={formatCurrency(subtotalValue)} />
        <Summary label="Discount" value={formatCurrency(values.discountAmount)} />
        <Summary label="Total" value={formatCurrency(totalValue)} />
        <Summary label="Due" value={formatCurrency(dueValue)} />
      </div>
    </div>
  );
}

function PreviewStep({
  values,
  customerDraft,
  selectedCustomer,
  garments,
  measurements,
  subtotalValue,
  totalValue,
  dueValue,
}: {
  values: OrderWizardValues;
  customerDraft: CustomerDraft;
  selectedCustomer: Customer | CustomerListItem | null;
  garments: GarmentType[];
  measurements: MeasurementSet[];
  subtotalValue: number;
  totalValue: number;
  dueValue: number;
}) {
  return (
    <div className="space-y-5">
      <StepHeader title="Preview and Confirm" description="Check this summary with the customer before confirming the order." />
      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-950">Customer</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <SummaryLine label="Name" value={customerDraft.name || selectedCustomer?.name || 'Not set'} />
          <SummaryLine label="Mobile" value={customerDraft.phone || 'Not set'} />
          <SummaryLine label="Address" value={customerDraft.address || 'Not set'} />
          <SummaryLine label="Customer code" value={selectedCustomer?.customer_code ?? 'New customer'} />
        </div>
      </section>

      <section className="space-y-3">
        {values.items.map((item, index) => {
          const garment = garments.find((entry) => entry.id === item.garmentTypeId);
          const measurement = measurements.find((entry) => entry.id === item.measurementSetId);
          return (
            <article key={item.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'No garment selected'}</h3>
                  <p className="mt-1 text-sm text-slate-600">Quantity {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(lineTotal(item))}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.measurementMode === 'new' ? 'New measurement' : 'Previous measurement'}</span>
              </div>
              {item.measurementMode === 'new' ? <Snapshot title="Measurement values" values={item.measurementValues} /> : null}
              {item.measurementMode === 'previous' ? <Snapshot title={`Measurement ${measurement ? `Version ${measurement.version_number}` : ''}`} values={measurement ? jsonObject(measurement.values) : {}} /> : null}
              <Snapshot title="Style choices" values={item.styleValues} />
              {item.designReferenceUrl ? <p className="mt-3 text-sm text-slate-600">Reference: {item.designReferenceUrl}</p> : null}
              {item.specialInstructions ? <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{item.specialInstructions}</p> : null}
            </article>
          );
        })}
      </section>

      <section className="grid gap-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
        <SummaryLine label="Order date" value={values.orderDate || 'Not set'} />
        <SummaryLine label="Delivery date" value={values.deliveryDate || 'Not set'} />
        <SummaryLine label="Subtotal" value={formatCurrency(subtotalValue)} />
        <SummaryLine label="Discount" value={formatCurrency(values.discountAmount)} />
        <SummaryLine label="Total" value={formatCurrency(totalValue)} />
        <SummaryLine label="Advance" value={formatCurrency(values.advanceAmount)} />
        <SummaryLine label="Due" value={formatCurrency(dueValue)} />
      </section>
    </div>
  );
}

function SelectBox({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : null,
        )}
      >
        {options.some((option) => option.value === '') ? null : <option value="">Select</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <span className="block text-sm font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function StepHeader({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-xs uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Snapshot({ title, values }: { title: string; values: Record<string, unknown> }) {
  const entries = Object.entries(values).filter(([, value]) => value !== '' && value !== null && value !== undefined);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
      <p className="font-semibold text-slate-800">{title}</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key}>
            <dt className="text-xs uppercase text-slate-500">{key}</dt>
            <dd className="font-medium text-slate-800">{displayDynamicValue(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}
