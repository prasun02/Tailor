import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Link as LinkIcon,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShieldAlert,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useId, useState, type ChangeEvent, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { appBrand } from '../app/brand';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { TextAreaField, TextField } from '../components/ui/FormField';
import { useCreateCustomer, useDuplicateCustomerPhone, useUpdateCustomer } from '../features/customers/customerHooks';
import type { Customer, CustomerListItem } from '../features/customers/customerService';
import { DesignSelectionModal } from '../features/design-selection/DesignSelectionModal';
import { SelectedDesignSummary as SelectedDesignDetailsSummary } from '../features/design-selection/SelectedDesignSummary';
import {
  designSelectionEntriesFromSnapshot,
  designSummaryFromSnapshot,
  garmentDesignFamilyFromName,
  hasDesignSelections,
  styleValuesFromDesignSnapshot,
} from '../features/design-selection/designSelectionUtils';
import type { SelectedDesignDetailsSnapshot } from '../features/design-selection/designSelectionTypes';
import type { GarmentDesign } from '../features/designs/types';
import { DynamicField } from '../features/measurements/components/DynamicField';
import { jsonObject, optionObjects } from '../features/measurements/components/display';
import { useMeasurementFields, useStyleFields } from '../features/measurements/configurationHooks';
import { validateFabricReferenceDetails, validateMeasurementDetails } from '../features/orders/orderFlowValidation';
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
import { displayEntries } from '../features/orders/orderDisplayUtils';
import { GarmentPreviewCard } from '../features/preview/GarmentPreviewCard';
import { buildPreviewSummary, measurementValuesForItem, recordFromUnknown } from '../features/preview/previewUtils';
import { GarmentDesignPreview } from '../features/preview/GarmentDesignPreview';
import { uploadImageToStorage, validateImageFile } from '../features/uploads/imageUpload';
import { useShop } from '../features/shop/shopContext';
import { useSendOrderSms } from '../features/sms/smsHooks';
import type { MeasurementUnit } from '../types/database';
import { canAssignWorkers, canCreateOrders } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency, formatDate } from '../utils/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const steps = [
  'Customer Info',
  'Garment + Design',
  'Measurement + Fabric',
  'Payment + Delivery',
  'Final Preview + Confirm',
];

type CustomerDraft = {
  name: string;
  phone: string;
  alternativePhone: string;
  email: string;
  address: string;
  notes: string;
};

const emptyCustomerDraft: CustomerDraft = {
  name: '',
  phone: '',
  alternativePhone: '',
  email: '',
  address: '',
  notes: '',
};

function draftKey(shopId: string | null) {
  return `tailor-store-manager:new-order-draft:${shopId ?? 'unknown-shop'}`;
}

function newOrderItem(unit: MeasurementUnit): OrderItemFormValues {
  return { ...emptyOrderItem(), measurementMode: 'new', measurementUnit: unit };
}

function actionLabelForStep(stepIndex: number): string {
  if (stepIndex === 1) return 'Continue to Measurement';
  if (stepIndex === 3) return 'Review Preview';
  return 'Continue';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
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
  const [uploadingFabricItemIds, setUploadingFabricItemIds] = useState<Set<string>>(() => new Set());
  const debouncedSearch = useDebouncedValue(search, 300);
  const contextQuery = useOrderWizardContext(currentShopId);
  const customerSearchQuery = useOrderCustomerSearch(currentShopId, debouncedSearch);
  const measurementsQuery = useCustomerMeasurementsForOrder(currentShopId, values.customerId || undefined);
  const allMeasurementFieldsQuery = useMeasurementFields(currentShopId, undefined, false);
  const duplicateQuery = useDuplicateCustomerPhone(currentShopId, customerDraft.phone, selectedCustomer?.id);
  const createCustomer = useCreateCustomer(currentShopId ?? '');
  const updateCustomer = useUpdateCustomer(currentShopId ?? '', selectedCustomer?.id ?? '');
  const createOrder = useCreateOrder(currentShopId ?? '');
  const sendOrderSms = useSendOrderSms(currentShopId ?? '');
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

  const orderContext = contextQuery.data;

  function selectCustomer(customer: Customer | CustomerListItem) {
    setSelectedCustomer(customer);
    setCustomerDraft({
      name: customer.name,
      phone: customer.phone ?? '',
      alternativePhone: customer.alternative_phone ?? '',
      email: customer.email ?? '',
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

  function setFabricUploadState(itemId: string, isUploading: boolean) {
    setUploadingFabricItemIds((current) => {
      const next = new Set(current);

      if (isUploading) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }

      return next;
    });
  }

  function validateCustomerDraft() {
    const nextErrors: Record<string, string> = {};

    if (!customerDraft.name.trim()) nextErrors.customerName = 'Customer name is required.';
    if (!customerDraft.phone.trim()) nextErrors.customerPhone = 'Mobile number is required.';
    if (customerDraft.email.trim() && !isValidEmail(customerDraft.email)) nextErrors.customerEmail = 'Enter a valid email address.';
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
        if (!item.garmentTypeId) nextErrors[`items.${index}.garmentTypeId`] = 'Select a garment item.';
        if (!hasDesignSelections(item.designSnapshot)) nextErrors[`items.${index}.designSnapshot`] = 'Choose design details before measurement.';
      });
    }

    if (targetStep === 2) {
      Object.assign(nextErrors, validateMeasurementDetails({
        items: values.items,
        measurementFields: allMeasurementFieldsQuery.data ?? [],
        configurationLoading: allMeasurementFieldsQuery.isLoading,
      }));
      Object.assign(nextErrors, validateFabricReferenceDetails({
        items: values.items,
        uploadingFabricItemIds,
      }));
    }

    if (targetStep === 3) {
      values.items.forEach((item, index) => {
        if (Number(item.quantity) <= 0) nextErrors[`items.${index}.quantity`] = 'Quantity must be greater than zero.';
        if (Number(item.unitPrice) < 0) nextErrors[`items.${index}.unitPrice`] = 'Unit price cannot be negative.';
      });
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

    const validationErrorsByStep = [0, 1, 2, 3].map((index) => ({ index, errors: collectStepErrors(index) }));
    const firstInvalidStep = validationErrorsByStep.find((entry) => Object.keys(entry.errors).length > 0);
    const mergedErrors = validationErrorsByStep.reduce<Record<string, string>>((acc, entry) => ({ ...acc, ...entry.errors }), {});

    if (firstInvalidStep) {
      setErrors(mergedErrors);
      setStep(firstInvalidStep.index);
      setShouldPrintAfterCreate(false);
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
        setStep(parsed.error.issues.some((issue) => issue.path[0] === 'items') ? 2 : 3);
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

      const finalizedItems = itemsWithMeasurements.map((item) => {
        const garment = orderContext.garments.find((entry) => entry.id === item.garmentTypeId);
        const measurementValues = measurementValuesForItem(item, measurements);
        const fabricReferenceUrl = item.fabricReferenceUrl || '';
        const selectedDesignSnapshot = hasDesignSelections(item.designSnapshot) ? item.designSnapshot : {};
        const previewSummary = buildPreviewSummary({
          garmentName: garment?.name ?? 'Garment',
          design: null,
          item: { ...item, designSnapshot: selectedDesignSnapshot, fabricReferenceUrl },
          measurementValues,
        });

        return {
          ...item,
          designSnapshot: selectedDesignSnapshot,
          previewSummary,
          designReferenceUrl: item.designReferenceUrl ?? '',
          fabricReferenceUrl,
          previewVideoUrl: item.previewVideoUrl ?? '',
        };
      });

      const payload = buildCreateOrderPayload({ ...parsed.data, items: finalizedItems }, {});
      const result = await createOrder.mutateAsync({ customerId, payload });
      const smsStatus = await sendOrderSms
        .mutateAsync({ orderId: result.order.id, templateKey: 'order_confirmed' })
        .then((smsResult) => smsResult.status)
        .catch(() => 'failed' as const);
      const successParams = new URLSearchParams();

      if (printAfterCreate) successParams.set('print', 'customer-token');
      successParams.set('sms', smsStatus);
      window.localStorage.removeItem(draftKey(currentShopId));
      navigate(`/orders/${result.order.id}/success?${successParams.toString()}`);
    } catch (error) {
      setFlowError(error instanceof Error ? error.message : 'Order could not be confirmed.');
    } finally {
      setShouldPrintAfterCreate(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-center sm:text-left">
            <h1 className="text-xl font-semibold text-slate-950">New Order</h1>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
              Bespoke tailoring order and production desk for customer, garment, design, measurement, payment, and print token workflow.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCustomer(null);
              setValues((current) => ({ ...current, customerId: '' }));
            }}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-brand-700 bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
          >
            New customer entry
          </button>
        </div>
        {selectedCustomer ? <p className="mt-2 text-center text-xs font-semibold text-slate-600 sm:text-left">Selected: {selectedCustomerText}</p> : null}
      </header>
      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm" aria-live="polite">
        <p className="text-xs font-semibold uppercase text-slate-500">Section {step + 1} of {steps.length}</p>
        <h2 className="mt-0.5 text-lg font-semibold text-slate-950">{steps[step]}</h2>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
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
          <GarmentDesignStep
            items={values.items}
            garments={contextQuery.data.garments}
            defaultUnit={defaultUnit}
            onAddItem={() => setValues((current) => ({ ...current, items: [...current.items, newOrderItem(defaultUnit)] }))}
            onRemoveItem={(itemId) => setValues((current) => ({ ...current, items: current.items.filter((item) => item.id !== itemId) }))}
            onUpdateItem={updateItem}
            errors={errors}
            onContinueToMeasurement={() => setStep(2)}
          />
        ) : null}

        {step === 2 ? (
          <MeasurementFabricStep
            customerId={values.customerId}
            items={values.items}
            garments={contextQuery.data.garments}
            measurements={measurements}
            defaultUnit={defaultUnit}
            onUpdateItem={updateItem}
            onFabricUploadStateChange={setFabricUploadState}
            errors={errors}
          />
        ) : null}

        {step === 3 ? (
          <PaymentDeliveryStep
            values={values}
            garments={contextQuery.data.garments}
            members={contextQuery.data.members}
            canAssign={canAssign}
            setValues={setValues}
            onUpdateItem={updateItem}
            errors={errors}
          />
        ) : null}

        {step === 4 ? (
          <FinalPreviewStep
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

      <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-white p-3 shadow-panel sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          disabled={step === 0}
          onClick={() => setStep((current) => Math.max(current - 1, 0))}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back
        </button>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={saveBrowserDraft}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50"
          >
            <Save aria-hidden="true" className="h-4 w-4" />
            Save Draft
          </button>
          <button
            type="button"
            onClick={loadBrowserDraft}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50"
          >
            Load Draft
          </button>
          {step < steps.length - 1 ? (
            <button
              type="button"
              onClick={continueToNextStep}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"
            >
              {actionLabelForStep(step)}
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
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-600 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 disabled:opacity-50"
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
      <StepHeader description="Search an existing customer first, or enter a new customer with required mobile number." />

      <label className="relative block max-w-xl">
        <span className="sr-only">Search customers</span>
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search existing customer by mobile, name, or customer code"
          className="min-h-12 w-full rounded-lg border border-brand-200 bg-white pl-10 pr-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
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
        <div className="flex flex-col gap-3 rounded-lg border border-accent-100 bg-accent-50 p-4 text-sm text-brand-900 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Selected existing customer: <strong>{selectedCustomer.name}</strong> ({selectedCustomer.customer_code})
          </span>
          <button type="button" onClick={onClearSelected} className="rounded-lg border border-accent-500 bg-white px-3 py-2 font-semibold text-brand-900">
            Enter as new
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Customer Name *" placeholder="Enter customer full name" value={customerDraft.name} error={errors.customerName} onChange={(event) => setCustomerDraft((current) => ({ ...current, name: event.target.value }))} />
        <TextField label="Mobile Number *" inputMode="tel" placeholder="01XXXXXXXXX" value={customerDraft.phone} error={errors.customerPhone} onChange={(event) => setCustomerDraft((current) => ({ ...current, phone: event.target.value }))} />
        <TextField label="Alternative Mobile Number" inputMode="tel" placeholder="01XXXXXXXXX" value={customerDraft.alternativePhone} onChange={(event) => setCustomerDraft((current) => ({ ...current, alternativePhone: event.target.value }))} />
        <TextField label="Email Address" type="email" inputMode="email" placeholder="customer@example.com" value={customerDraft.email} error={errors.customerEmail} onChange={(event) => setCustomerDraft((current) => ({ ...current, email: event.target.value }))} />
        <TextField label="Address" placeholder="House, road, area" value={customerDraft.address} onChange={(event) => setCustomerDraft((current) => ({ ...current, address: event.target.value }))} className="md:col-span-2" />
      </div>

      {duplicateCustomer && !selectedCustomer ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Possible duplicate: {duplicateCustomer.name}. Select the existing customer before continuing.
        </p>
      ) : null}
    </div>
  );
}

export function GarmentDesignStep({
  items,
  garments,
  defaultUnit,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  errors,
  onContinueToMeasurement,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  defaultUnit: MeasurementUnit;
  onAddItem: () => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
  onContinueToMeasurement?: () => void;
}) {
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const modalItem = items.find((item) => item.id === modalItemId) ?? null;
  const modalItemIndex = modalItem ? items.findIndex((item) => item.id === modalItem.id) : -1;
  const modalGarment = modalItem ? garments.find((entry) => entry.id === modalItem.garmentTypeId) : undefined;

  function resetForGarment(itemId: string, garmentTypeId: string) {
    onUpdateItem(itemId, {
      garmentTypeId,
      measurementSetId: '',
      measurementValues: {},
      styleValues: {},
      measurementUnit: defaultUnit,
      designId: '',
      designSnapshot: {},
      previewSummary: {},
      designReferenceUrl: '',
      previewVideoUrl: '',
      fabricReferenceMode: 'skip',
      fabricReferenceUrl: '',
    });
  }

  function saveBuiltInDesignDetails(item: OrderItemFormValues, snapshot: SelectedDesignDetailsSnapshot) {
    onUpdateItem(item.id, {
      designId: '',
      designSnapshot: snapshot,
      previewSummary: {},
      designReferenceUrl: '',
      previewVideoUrl: '',
      styleValues: styleValuesFromDesignSnapshot(snapshot),
    });
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const garment = garments.find((entry) => entry.id === item.garmentTypeId);
        const itemError = errors[`items.${index}.designSnapshot`];

        return (
          <section key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm" data-testid="garment-design-item">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500">Garment Item {index + 1}</p>
                <div className="mt-3 max-w-md">
                  <SelectBox
                    label="Select Garment Item *"
                    value={item.garmentTypeId}
                    error={errors[`items.${index}.garmentTypeId`]}
                    onChange={(value) => resetForGarment(item.id, value)}
                    options={garments.map((entry) => ({ value: entry.id, label: entry.name }))}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <button
                  type="button"
                  disabled={!item.garmentTypeId}
                  onClick={() => setModalItemId(item.id)}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles aria-hidden="true" className="h-4 w-4" />
                  Choose Design Sheet
                </button>
                {items.length > 1 ? (
                  <button type="button" onClick={() => onRemoveItem(item.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 hover:bg-red-50">
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                    Remove
                  </button>
                ) : null}
              </div>
            </div>

            {itemError ? <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{itemError}</p> : null}

            <div className="mt-4">
              <SelectedDesignDetailsSummary designSnapshot={recordFromUnknown(item.designSnapshot)} title={garment ? `${garment.name} Design Summary` : 'Selected Design Summary'} />
            </div>
          </section>
        );
      })}

      <button type="button" onClick={onAddItem} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Garment
      </button>

      {modalItem && modalGarment ? (
        <DesignSelectionModal
          key={modalItem.id}
          garmentName={modalGarment.name}
          itemNumber={modalItemIndex + 1}
          initialSnapshot={recordFromUnknown(modalItem.designSnapshot)}
          onClose={() => setModalItemId(null)}
          onSave={(snapshot) => saveBuiltInDesignDetails(modalItem, snapshot)}
          onContinueToMeasurement={onContinueToMeasurement}
        />
      ) : null}
    </div>
  );
}

export function DesignSelectionStep({
  items,
  garments,
  errors,
  onUpdateItem,
  onContinueToMeasurement,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  errors: Record<string, string>;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  onContinueToMeasurement?: () => void;
}) {
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const modalItem = items.find((item) => item.id === modalItemId) ?? null;
  const modalItemIndex = modalItem ? items.findIndex((item) => item.id === modalItem.id) : -1;
  const modalGarment = modalItem ? garments.find((entry) => entry.id === modalItem.garmentTypeId) : undefined;

  function saveBuiltInDesignDetails(item: OrderItemFormValues, snapshot: SelectedDesignDetailsSnapshot) {
    onUpdateItem(item.id, {
      designId: '',
      designSnapshot: snapshot,
      previewSummary: {},
      designReferenceUrl: '',
      previewVideoUrl: '',
      styleValues: styleValuesFromDesignSnapshot(snapshot),
    });
  }

  return (
    <div className="space-y-5">
      <StepHeader description="Choose built-in visual style details for each selected garment." />

      {items.map((item, index) => {
        const garment = garments.find((entry) => entry.id === item.garmentTypeId);
        const designEntries = designSelectionEntriesFromSnapshot(item.designSnapshot);
        const designSummary = designSummaryFromSnapshot(item.designSnapshot);
        const itemError = errors[`items.${index}.designSnapshot`];

        return (
          <section key={item.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Item {index + 1}</p>
                <h2 className="mt-1 text-lg font-semibold text-slate-950">{garment?.name ?? 'Select a garment first'}</h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  {designEntries.length > 0 ? designSummary : 'Open the design sheet to choose category-wise tailoring details.'}
                </p>
              </div>
              <button
                type="button"
                disabled={!item.garmentTypeId}
                onClick={() => setModalItemId(item.id)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4" />
                Choose Design Sheet
              </button>
            </div>

            {itemError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{itemError}</p> : null}

            <div className="mt-4">
              <SelectedDesignDetailsSummary designSnapshot={recordFromUnknown(item.designSnapshot)} />
            </div>
          </section>
        );
      })}

      {modalItem && modalGarment ? (
        <DesignSelectionModal
          key={modalItem.id}
          garmentName={modalGarment.name}
          itemNumber={modalItemIndex + 1}
          initialSnapshot={recordFromUnknown(modalItem.designSnapshot)}
          onClose={() => setModalItemId(null)}
          onSave={(snapshot) => saveBuiltInDesignDetails(modalItem, snapshot)}
          onContinueToMeasurement={onContinueToMeasurement}
        />
      ) : null}
    </div>
  );
}

function ThumbnailImage({ src, className, emptyText = 'Image unavailable' }: { src?: string | null; className: string; emptyText?: string }) {
  const [isBroken, setIsBroken] = useState(false);

  if (src && !isBroken) {
    return <img src={src} alt="" className={cn(className, 'object-cover')} loading="lazy" onError={() => setIsBroken(true)} />;
  }

  return (
    <div aria-label={isBroken ? 'Image unavailable' : emptyText} className={cn(className, 'flex items-center justify-center bg-slate-100 p-4')}>
      <div className="flex flex-col items-center gap-2 text-center text-sm font-semibold text-slate-500">
        <span>{isBroken ? 'Image unavailable' : emptyText}</span>
        <div className="relative h-20 w-16">
          <div className="absolute left-1/2 top-2 h-16 w-11 -translate-x-1/2 rounded-t-2xl rounded-b-lg border border-brand-700/20 bg-white shadow-panel" />
          <div className="absolute left-0 top-6 h-10 w-4 -rotate-12 rounded-lg border border-brand-700/20 bg-white" />
          <div className="absolute right-0 top-6 h-10 w-4 rotate-12 rounded-lg border border-brand-700/20 bg-white" />
          <div className="absolute left-1/2 top-4 h-3 w-7 -translate-x-1/2 rounded-b-full border border-brand-700/20 bg-brand-50" />
        </div>
      </div>
    </div>
  );
}
export function StyleOptionsStep({
  items,
  garments,
  onUpdateItem,
  errors,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const safeIndex = Math.min(activeItemIndex, Math.max(items.length - 1, 0));
  const item = items[safeIndex];

  if (!item) {
    return <EmptyState icon={ShieldAlert} title="No garment item" message="Add a garment item before choosing style options." />;
  }

  return (
    <div className="space-y-5">
      <StepHeader description="Select the garment style choices after design selection and before measurement entry." />
      <StepItemPager currentIndex={safeIndex} itemCount={items.length} onIndexChange={setActiveItemIndex} />
      <StyleOptionsItemEditor
        item={item}
        index={safeIndex}
        garment={garments.find((entry) => entry.id === item.garmentTypeId)}
        onUpdate={(patch) => onUpdateItem(item.id, patch)}
        errors={errors}
      />
    </div>
  );
}

function StyleOptionsItemEditor({
  item,
  index,
  garment,
  onUpdate,
  errors,
}: {
  item: OrderItemFormValues;
  index: number;
  garment: GarmentType | undefined;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  const { currentShopId } = useShop();
  const styleFieldsQuery = useStyleFields(currentShopId, item.garmentTypeId || undefined, false);
  const itemErrorPrefix = `items.${index}`;
  const styleFields = styleFieldsQuery.data ?? [];

  return (
    <section className="space-y-4 rounded-lg border border-brand-200 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Item {index + 1}</p>
          <h2 className="text-lg font-semibold text-slate-950">{garment?.name ?? 'Garment'} style options</h2>
        </div>
        <span className="inline-flex min-h-8 items-center rounded-full bg-brand-50 px-3 text-xs font-semibold text-brand-700">
          Style before measurement
        </span>
      </div>

      <SelectedDesignDetailsSummary designSnapshot={recordFromUnknown(item.designSnapshot)} />

      <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
        <h3 className="text-sm font-semibold text-slate-950">Style Options</h3>
        <p className="mt-1 text-sm text-slate-600">Choose the visible garment details such as sleeve, collar, cuff, pocket, fit, and finishing style.</p>
        {styleFieldsQuery.isLoading ? <p className="mt-3 text-sm text-slate-500">Loading style options...</p> : null}
        {!styleFieldsQuery.isLoading && styleFields.length === 0 ? <p className="mt-3 text-sm text-slate-500">No style options configured for this garment.</p> : null}
        {errors[`${itemErrorPrefix}.configuration`] ? <p className="mt-3 text-sm font-medium text-red-600">{errors[`${itemErrorPrefix}.configuration`]}</p> : null}
        {styleFields.length > 0 ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {styleFields.map((field) => (
              <DynamicField
                key={field.id}
                id={`${item.id}-${field.field_key}`}
                label={field.label}
                labelBn={field.label_bn}
                type={field.field_type}
                value={item.styleValues[field.field_key] as string | number | boolean | string[] | null | undefined}
                required={field.is_required}
                options={optionObjects(field.options)}
                placeholder={stylePlaceholder(field.label)}
                error={errors[`${itemErrorPrefix}.styleValues.${field.field_key}`]}
                onChange={(value) => onUpdate({ styleValues: { ...item.styleValues, [field.field_key]: value } })}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-brand-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Selected Style Summary</h3>
        {filledEntryCount(item.styleValues) > 0 ? <Snapshot title="Style choices" values={item.styleValues} /> : <p className="mt-2 text-sm text-slate-500">No style options selected yet.</p>}
      </section>
    </section>
  );
}

export function MeasurementStep({
  customerId,
  items,
  garments,
  measurements,
  defaultUnit,
  onUpdateItem,
  errors,
}: {
  customerId: string;
  items: OrderItemFormValues[];
  garments: GarmentType[];
  measurements: MeasurementSet[];
  defaultUnit: MeasurementUnit;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const safeIndex = Math.min(activeItemIndex, Math.max(items.length - 1, 0));
  const item = items[safeIndex];

  if (!item) {
    return <EmptyState icon={ShieldAlert} title="No garment item" message="Add a garment item before entering measurements." />;
  }

  return (
    <div className="space-y-5">
      <StepHeader description="Enter garment-specific measurements with the selected design summary visible." />
      <StepItemPager currentIndex={safeIndex} itemCount={items.length} onIndexChange={setActiveItemIndex} />
      <MeasurementItemEditor
        item={item}
        index={safeIndex}
        customerId={customerId}
        garment={garments.find((entry) => entry.id === item.garmentTypeId)}
        measurements={measurements}
        defaultUnit={defaultUnit}
        onUpdate={(patch) => onUpdateItem(item.id, patch)}
        errors={errors}
      />
    </div>
  );
}

function MeasurementItemEditor({
  item,
  index,
  customerId,
  garment,
  measurements,
  defaultUnit,
  onUpdate,
  errors,
}: {
  item: OrderItemFormValues;
  index: number;
  customerId: string;
  garment: GarmentType | undefined;
  measurements: MeasurementSet[];
  defaultUnit: MeasurementUnit;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  const { currentShopId } = useShop();
  const measurementFieldsQuery = useMeasurementFields(currentShopId, item.garmentTypeId || undefined, false);
  const garmentMeasurements = measurements.filter((measurement) => measurement.garment_type_id === item.garmentTypeId);
  const selectedMeasurement = garmentMeasurements.find((measurement) => measurement.id === item.measurementSetId);
  const itemErrorPrefix = `items.${index}`;
  const measurementFields = measurementFieldsQuery.data ?? [];

  return (
    <section className="space-y-4 rounded-lg border border-brand-200 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Item {index + 1}</p>
          <h2 className="text-lg font-semibold text-slate-950">{garment?.name ?? 'Garment'} measurements</h2>
        </div>
        <span className="inline-flex min-h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
          {item.measurementMode === 'new' ? 'New measurement' : 'Previous measurement'}
        </span>
      </div>

      <SelectedDesignDetailsSummary designSnapshot={recordFromUnknown(item.designSnapshot)} />


      <section className="rounded-lg border border-brand-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-950">Measurement Source</h3>
        <p className="mt-1 text-sm text-slate-600">
          {garmentMeasurements.length > 0 ? `${garmentMeasurements.length} saved measurement version(s) found for this customer and garment.` : 'No previous measurements found for this garment.'}
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onUpdate({ measurementMode: 'new', measurementSetId: '', measurementUnit: item.measurementUnit || defaultUnit })}
            className={cn('rounded-lg border px-3 py-3 text-sm font-semibold', item.measurementMode === 'new' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            Enter new measurement
          </button>
          <button
            type="button"
            disabled={garmentMeasurements.length === 0}
            onClick={() => onUpdate({ measurementMode: 'previous', measurementSetId: garmentMeasurements[0]?.id ?? '' })}
            className={cn('rounded-lg border px-3 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50', item.measurementMode === 'previous' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
          >
            Use previous measurement
          </button>
        </div>

        {errors[`${itemErrorPrefix}.configuration`] ? <p className="mt-3 text-sm font-medium text-red-600">{errors[`${itemErrorPrefix}.configuration`]}</p> : null}

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
            garmentName={garment?.name ?? 'Garment'}
            designSnapshot={recordFromUnknown(item.designSnapshot)}
            fields={measurementFields}
            isLoading={measurementFieldsQuery.isLoading}
            error={errors[`${itemErrorPrefix}.measurementValues`]}
            fieldErrors={Object.fromEntries(measurementFields.map((field) => [field.field_key, errors[`${itemErrorPrefix}.measurementValues.${field.field_key}`] ?? '']))}
            onUpdate={onUpdate}
          />
        )}
      </section>

    </section>
  );
}

function MeasurementFabricStep({
  customerId,
  items,
  garments,
  measurements,
  defaultUnit,
  onUpdateItem,
  onFabricUploadStateChange,
  errors,
}: {
  customerId: string;
  items: OrderItemFormValues[];
  garments: GarmentType[];
  measurements: MeasurementSet[];
  defaultUnit: MeasurementUnit;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  onFabricUploadStateChange: (itemId: string, isUploading: boolean) => void;
  errors: Record<string, string>;
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const safeIndex = Math.min(activeItemIndex, Math.max(items.length - 1, 0));
  const item = items[safeIndex];

  if (!item) {
    return <EmptyState icon={ShieldAlert} title="No garment item" message="Add a garment item before entering measurements." />;
  }

  const garment = garments.find((entry) => entry.id === item.garmentTypeId);

  return (
    <div className="space-y-4">
      <StepItemPager currentIndex={safeIndex} itemCount={items.length} onIndexChange={setActiveItemIndex} />
      <MeasurementItemEditor
        item={item}
        index={safeIndex}
        customerId={customerId}
        garment={garment}
        measurements={measurements}
        defaultUnit={defaultUnit}
        onUpdate={(patch) => onUpdateItem(item.id, patch)}
        errors={errors}
      />
      <FabricReferenceItemEditor
        item={item}
        index={safeIndex}
        garment={garment}
        measurements={measurements}
        onUpdate={(patch) => onUpdateItem(item.id, patch)}
        onFabricUploadStateChange={(isUploading) => onFabricUploadStateChange(item.id, isUploading)}
        errors={errors}
      />
    </div>
  );
}

export function FabricReferenceStep({
  items,
  garments,
  measurements,
  onUpdateItem,
  onFabricUploadStateChange,
  errors,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  measurements: MeasurementSet[];
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  onFabricUploadStateChange: (itemId: string, isUploading: boolean) => void;
  errors: Record<string, string>;
}) {
  const [activeItemIndex, setActiveItemIndex] = useState(0);
  const safeIndex = Math.min(activeItemIndex, Math.max(items.length - 1, 0));
  const item = items[safeIndex];

  if (!item) {
    return <EmptyState icon={ShieldAlert} title="No garment item" message="Add a garment item before adding fabric references." />;
  }

  return (
    <div className="space-y-5">
      <StepHeader description="Add the actual customer-selected cloth reference after measurements. Design samples and fabric references stay separate." />
      <StepItemPager currentIndex={safeIndex} itemCount={items.length} onIndexChange={setActiveItemIndex} />
      <FabricReferenceItemEditor
        item={item}
        index={safeIndex}
        garment={garments.find((entry) => entry.id === item.garmentTypeId)}
        measurements={measurements}
        onUpdate={(patch) => onUpdateItem(item.id, patch)}
        onFabricUploadStateChange={(isUploading) => onFabricUploadStateChange(item.id, isUploading)}
        errors={errors}
      />
    </div>
  );
}

function FabricReferenceItemEditor({
  item,
  index,
  garment,
  measurements,
  onUpdate,
  onFabricUploadStateChange,
  errors,
}: {
  item: OrderItemFormValues;
  index: number;
  garment: GarmentType | undefined;
  measurements: MeasurementSet[];
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
  onFabricUploadStateChange: (isUploading: boolean) => void;
  errors: Record<string, string>;
}) {
  const itemErrorPrefix = `items.${index}`;

  return (
    <section className="space-y-4 rounded-lg border border-brand-200 bg-white p-4 shadow-panel">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Item {index + 1}</p>
          <h2 className="text-lg font-semibold text-slate-950">{garment?.name ?? 'Garment'} fabric reference</h2>
        </div>
        <span className="inline-flex min-h-8 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">
          {item.fabricReferenceUrl ? 'Fabric added' : 'Fabric skipped'}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
          <h3 className="text-sm font-semibold text-slate-950">Style and Measurement Status</h3>
          <div className="mt-3 grid gap-3 text-sm">
            <SummaryLine label="Style options" value={`${filledEntryCount(item.styleValues)} selected`} />
            <SummaryLine label="Measurements" value={`${filledEntryCount(measurementValuesForItem(item, measurements))} entered`} />
            <SummaryLine label="Measurement source" value={item.measurementMode === 'new' ? 'New measurement' : 'Previous measurement'} />
          </div>
        </section>
        <ItemPreviewSummary item={item} garment={garment} measurements={measurements} />
      </div>

      <FabricReferenceSection
        item={item}
        error={errors[`${itemErrorPrefix}.fabricReferenceUrl`]}
        onUpdate={onUpdate}
        onUploadStateChange={onFabricUploadStateChange}
      />
    </section>
  );
}

function StepItemPager({
  currentIndex,
  itemCount,
  onIndexChange,
}: {
  currentIndex: number;
  itemCount: number;
  onIndexChange: (index: number) => void;
}) {
  if (itemCount <= 1) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-brand-200 bg-brand-50 p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-brand-900">Garment item {currentIndex + 1} of {itemCount}</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: itemCount }, (_, index) => (
          <button
            key={index}
            type="button"
            onClick={() => onIndexChange(index)}
            className={cn(
              'min-h-9 rounded-lg border px-3 text-sm font-semibold',
              currentIndex === index ? 'border-brand-700 bg-brand-900 text-white' : 'border-brand-200 bg-white text-slate-700 hover:bg-brand-50',
            )}
          >
            Item {index + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

function filledEntryCount(values: Record<string, unknown>): number {
  return Object.values(values).filter((value) => value !== '' && value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0)).length;
}

function stylePlaceholder(label: string): string {
  return `Select ${label.toLowerCase()}`;
}

function measurementPlaceholder(label: string): string {
  return `Enter ${label.toLowerCase()} size`;
}
function FabricReferenceSection({
  item,
  error,
  onUpdate,
  onUploadStateChange,
}: {
  item: OrderItemFormValues;
  error?: string;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
  onUploadStateChange: (isUploading: boolean) => void;
}) {
  const { currentShopId } = useShop();
  const inputId = useId();
  const [uploadError, setUploadError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const mode = item.fabricReferenceMode ?? (item.fabricReferenceUrl ? 'url' : 'skip');
  const visibleError = uploadError || error;

  function setUploading(value: boolean) {
    setIsUploading(value);
    onUploadStateChange(value);
  }

  function chooseMode(nextMode: OrderItemFormValues['fabricReferenceMode']) {
    setUploadError('');

    if (nextMode === 'skip') {
      onUpdate({ fabricReferenceMode: 'skip', fabricReferenceUrl: '' });
      return;
    }

    onUpdate({ fabricReferenceMode: nextMode });
  }

  async function uploadFabricImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const validationError = validateImageFile(file);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    if (!currentShopId) {
      setUploadError('Select an active shop before uploading a fabric image.');
      return;
    }

    setUploadError('');
    setUploading(true);

    try {
      const result = await uploadImageToStorage({
        bucket: 'order-fabric-images',
        shopId: currentShopId,
        folder: `orders/${item.id}`,
        file,
      });
      onUpdate({ fabricReferenceMode: 'upload', fabricReferenceUrl: result.publicUrl });
    } catch (uploadErrorValue) {
      setUploadError(uploadErrorValue instanceof Error ? uploadErrorValue.message : 'Fabric image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-lg border border-brand-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-950">Fabric / Cloth Reference</h3>
      <p className="mt-1 text-sm text-slate-600">Add the customer's selected fabric image, use URL, or skip.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => chooseMode('upload')}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold', mode === 'upload' ? 'border-brand-700 bg-brand-900 text-white' : 'border-brand-200 bg-white text-slate-700 hover:bg-brand-50')}
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => chooseMode('url')}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold', mode === 'url' ? 'border-brand-700 bg-brand-900 text-white' : 'border-brand-200 bg-white text-slate-700 hover:bg-brand-50')}
        >
          <LinkIcon aria-hidden="true" className="h-4 w-4" />
          Use URL
        </button>
        <button
          type="button"
          onClick={() => chooseMode('skip')}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold', mode === 'skip' ? 'border-brand-700 bg-brand-900 text-white' : 'border-brand-200 bg-white text-slate-700 hover:bg-brand-50')}
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Skip
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_12rem]">
          <label htmlFor={inputId} className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-brand-300 bg-brand-50 p-4 text-center text-sm text-slate-600 hover:bg-brand-100">
            <Upload aria-hidden="true" className="mb-2 h-5 w-5 text-brand-700" />
            {isUploading ? 'Uploading fabric image...' : item.fabricReferenceUrl ? 'Change image' : 'Upload fabric image'}
            <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => void uploadFabricImage(event)} />
          </label>
          {item.fabricReferenceUrl ? (
            <div className="space-y-2">
              <ThumbnailImage src={item.fabricReferenceUrl} className="h-32 w-full rounded-lg border border-slate-200" emptyText="Skipped" />
              <button type="button" onClick={() => onUpdate({ fabricReferenceUrl: '' })} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-brand-50">
                <X aria-hidden="true" className="h-4 w-4" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-brand-200 bg-brand-50 text-sm text-slate-500">No fabric image</div>
          )}
        </div>
      ) : null}

      {mode === 'url' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_12rem]">
          <TextField label="Fabric image URL" placeholder="Paste fabric/reference image URL" value={item.fabricReferenceUrl ?? ''} error={error} onChange={(event) => onUpdate({ fabricReferenceMode: 'url', fabricReferenceUrl: event.target.value })} />
          {item.fabricReferenceUrl ? (
            <ThumbnailImage src={item.fabricReferenceUrl} className="h-32 w-full rounded-lg border border-slate-200" emptyText="Skipped" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-brand-300 bg-brand-50 text-sm text-slate-500">No URL</div>
          )}
        </div>
      ) : null}

      {mode === 'skip' ? (
        <div className="mt-4 inline-flex min-h-9 items-center rounded-full bg-slate-100 px-3 text-xs font-semibold text-slate-600">Skipped</div>
      ) : null}

      {visibleError ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{visibleError}</p> : null}
    </section>
  );
}

function ItemPreviewSummary({
  item,
  garment,
  measurements,
}: {
  item: OrderItemFormValues;
  garment: GarmentType | undefined;
  measurements: MeasurementSet[];
}) {
  const measurementValues = measurementValuesForItem(item, measurements);
  const styleCount = Object.values(item.styleValues).filter((value) => value !== '' && value !== null && value !== undefined).length;
  const measurementCount = Object.values(measurementValues).filter((value) => value !== '' && value !== null && value !== undefined).length;
  const fabricStatus = item.fabricReferenceUrl ? 'Added' : 'Skipped';

  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">Order item status</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Fabric / Cloth Reference</p>
          <ThumbnailImage src={item.fabricReferenceUrl} className="h-32 w-full rounded-lg border border-slate-200" emptyText="Skipped" />
        </div>
        <div className="grid content-center gap-2 text-sm">
          <SummaryLine label="Garment item" value={garment?.name ?? 'Not selected'} />
          <SummaryLine label="Design summary" value={designSummaryFromSnapshot(item.designSnapshot)} />
          <SummaryLine label="Style choices" value={String(styleCount) + ' selected'} />
          <SummaryLine label="Measurements" value={String(measurementCount) + ' entered'} />
          <SummaryLine label="Fabric reference" value={fabricStatus} />
        </div>
      </div>
    </section>
  );
}

type MeasurementDesignGuidance = {
  title: string;
  notes: string[];
  fieldHints: string[];
};

function NewMeasurementEditor({
  item,
  garmentName,
  designSnapshot,
  fields,
  isLoading,
  error,
  fieldErrors,
  onUpdate,
}: {
  item: OrderItemFormValues;
  garmentName: string;
  designSnapshot: Record<string, unknown>;
  fields: MeasurementField[];
  isLoading: boolean;
  error?: string;
  fieldErrors: Record<string, string>;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
}) {
  const guidance = measurementGuidanceForDesignSelection(garmentName, designSnapshot, item.styleValues);
  const orderedFields = orderMeasurementFieldsByDesign(fields, guidance.fieldHints);

  return (
    <div className="mt-4">
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
        <TextField label="Measurement notes" placeholder="Example: Shoulder slightly relaxed, keep sleeve comfortable" value={item.measurementNotes ?? ''} onChange={(event) => onUpdate({ measurementNotes: event.target.value })} />
      </div>

      <section className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3">
        <h3 className="text-sm font-semibold text-slate-950">Measurement focus from selected design</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {guidance.notes.map((note) => (
            <span key={note} className="rounded-full border border-brand-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {note}
            </span>
          ))}
        </div>
      </section>

      {isLoading ? <p className="mt-3 text-sm text-slate-500">Loading measurement fields...</p> : null}
      {!isLoading && fields.length === 0 ? <p className="mt-3 text-sm text-slate-500">No configured fields for this garment. Enter notes or configure fields in Settings.</p> : null}
      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {orderedFields.length > 0 ? (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {orderedFields.map((field) => (
            <DynamicField
              key={field.id}
              id={`${item.id}-measurement-${field.field_key}`}
              label={field.label}
              labelBn={field.label_bn}
              type={field.field_type}
              value={item.measurementValues[field.field_key] as string | number | boolean | string[] | null | undefined}
              required={field.is_required}
              unitLabel={field.unit}
              placeholder={field.placeholder ?? measurementPlaceholder(field.label)}
              helpText={field.help_text}
              minimum={field.minimum_value}
              maximum={field.maximum_value}
              step={field.step_value}
              options={[]}
              error={fieldErrors[field.field_key]}
              onChange={(value) => onUpdate({ measurementValues: { ...item.measurementValues, [field.field_key]: value } })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function measurementGuidanceForDesignSelection(garmentName: string, snapshot: Record<string, unknown>, itemStyleValues: Record<string, unknown>): MeasurementDesignGuidance {
  const family = garmentDesignFamilyFromName(garmentName);
  const styleValues = { ...styleValuesFromDesignSnapshot(snapshot), ...itemStyleValues };
  const selectedText = Object.values(styleValues).map(displayMeasurementGuideValue).join(' ').toLowerCase();
  const notes = new Set<string>();
  const fieldHints = new Set<string>();

  function add(note: string, hints: string[]) {
    notes.add(note);
    hints.forEach((hint) => fieldHints.add(hint));
  }

  if (family === 'shirt') {
    add('Confirm length, chest, shoulder, and waist.', ['shirt_length', 'length', 'chest', 'shoulder', 'waist']);
    if (selectedText.includes('full sleeve')) add('Full Sleeve selected: include sleeve length, cuff, and wrist.', ['sleeve_length', 'sleeve', 'cuff', 'wrist']);
    if (selectedText.includes('short sleeve') || selectedText.includes('half sleeve')) add('Short sleeve selected: cuff and wrist can stay optional.', ['sleeve_length', 'sleeve_opening']);
    if (selectedText.includes('sleeveless')) add('Sleeveless selected: armhole matters more than cuff or wrist.', ['armhole', 'shoulder']);
    if (selectedText.includes('french cuff')) add('French Cuff selected: check cuff depth and wrist comfort.', ['cuff', 'wrist']);
  } else if (family === 'suit') {
    add('Confirm jacket chest, shoulder, length, waist, and sleeve.', ['jacket_chest', 'chest', 'shoulder', 'jacket_length', 'length', 'waist', 'sleeve_length']);
    add('Suit includes trouser measurements too.', ['trouser_waist', 'pant_length', 'inseam', 'hip', 'thigh', 'bottom']);
    if (selectedText.includes('turn up') || selectedText.includes('french cuff')) add('Trouser cuff selected: include bottom and cuff depth.', ['bottom', 'cuff', 'hem']);
  } else if (family === 'pant') {
    add('Confirm waist, hip, length, thigh, knee, and bottom.', ['waist', 'hip', 'pant_length', 'length', 'thigh', 'knee', 'bottom']);
    if (selectedText.includes('turn up') || selectedText.includes('french cuff')) add('Turn-up selected: include bottom and cuff measurement.', ['bottom', 'cuff', 'hem']);
    if (selectedText.includes('high waist') || selectedText.includes('low rise') || selectedText.includes('mid rise')) add('Rise selected: confirm rise depth.', ['rise']);
  } else if (family === 'panjabi') {
    add('Confirm length, chest, shoulder, sleeve, and waist.', ['panjabi_length', 'length', 'chest', 'shoulder', 'sleeve_length', 'waist']);
    if (selectedText.includes('slit')) add('Side Slit selected: include slit length and hem sweep.', ['side_slit', 'slit', 'hem', 'bottom']);
    if (selectedText.includes('sleeveless')) add('Sleeveless selected: confirm armhole and shoulder.', ['armhole', 'shoulder']);
  } else {
    add('Confirm key body measurements for this garment.', ['length', 'chest', 'waist', 'shoulder', 'sleeve_length', 'hip']);
  }

  return {
    title: `${garmentName} measurement focus`,
    notes: Array.from(notes).slice(0, 4),
    fieldHints: Array.from(fieldHints),
  };
}

function orderMeasurementFieldsByDesign(fields: MeasurementField[], fieldHints: string[]): MeasurementField[] {
  return [...fields].sort((left, right) => {
    const leftRank = measurementFieldRank(left, fieldHints);
    const rightRank = measurementFieldRank(right, fieldHints);

    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.sort_order - right.sort_order;
  });
}

function measurementFieldRank(field: MeasurementField, fieldHints: string[]): number {
  const haystack = `${field.field_key} ${field.label}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  const matchIndex = fieldHints.findIndex((hint) => haystack.includes(hint.toLowerCase().replace(/[^a-z0-9]+/g, '_')));

  return matchIndex >= 0 ? matchIndex : fieldHints.length + field.sort_order;
}

function displayMeasurementGuideValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(displayMeasurementGuideValue).filter(Boolean).join(' ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}
export function PreviewGarmentStep({
  items,
  garments,
  designs,
  measurements,
  onBackToStyle,
  onBackToMeasurement,
  onContinue,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  designs: GarmentDesign[];
  measurements: MeasurementSet[];
  onBackToStyle?: () => void;
  onBackToMeasurement?: () => void;
  onContinue?: () => void;
}) {
  return (
    <div className="space-y-5">
      <StepHeader description="Review visual design selections, measurements, cloth references, and practical notes with the customer." />
      {items.map((item, index) => {
        const garment = garments.find((entry) => entry.id === item.garmentTypeId);
        const design = designs.find((entry) => entry.id === item.designId) ?? null;
        const measurementValues = measurementValuesForItem(item, measurements);
        const fabricReferenceUrl = item.fabricReferenceUrl || null;
        const previewSummary = buildPreviewSummary({
          garmentName: garment?.name ?? 'Garment',
          design,
          item: { ...item, fabricReferenceUrl: fabricReferenceUrl ?? '' },
          measurementValues,
        });

        const designDetailStyleValues = styleValuesFromDesignSnapshot(item.designSnapshot);

        return (
          <div key={item.id} className="space-y-4">
            <GarmentDesignPreview
              garmentName={garment?.name ?? 'Garment'}
              designSnapshot={recordFromUnknown(item.designSnapshot)}
              measurementValues={measurementValues}
              fabricReferenceUrl={fabricReferenceUrl}
            />
            <GarmentPreviewCard
              title={`Item ${index + 1} estimated garment preview`}
              garmentName={garment?.name ?? 'Garment'}
              designName={design?.design_name}
              styleCategory={design?.style_category}
              previewImageUrl={design?.preview_image_url}
              fabricReferenceUrl={fabricReferenceUrl}
              previewVideoUrl={design?.preview_video_url ?? item.previewVideoUrl}
              measurementValues={measurementValues}
              styleValues={{ ...designDetailStyleValues, ...item.styleValues }}
              previewSummary={previewSummary}
            />
          </div>
        );
      })}
      <div className="no-print flex flex-col gap-2 rounded-lg border border-brand-200 bg-brand-50 p-3 sm:flex-row sm:items-center sm:justify-end">
        {onBackToStyle ? (
          <button type="button" onClick={onBackToStyle} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to Design Details
          </button>
        ) : null}
        {onBackToMeasurement ? (
          <button type="button" onClick={onBackToMeasurement} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Back to Measurement
          </button>
        ) : null}
        {onContinue ? (
          <button type="button" onClick={onContinue} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
            Continue
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function PaymentDeliveryStep({
  values,
  garments,
  members,
  canAssign,
  setValues,
  onUpdateItem,
  errors,
}: {
  values: OrderWizardValues;
  garments: GarmentType[];
  members: Array<{ user_id: string; role: string }>;
  canAssign: boolean;
  setValues: Dispatch<SetStateAction<OrderWizardValues>>;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  errors: Record<string, string>;
}) {
  const subtotalValue = subtotal(values.items);
  const totalValue = totalAfterDiscount(values.items, values.discountAmount);
  const dueValue = dueAfterAdvance(values);

  return (
    <div className="space-y-5">
      <StepHeader description="Set pricing, assignment, dates, payment, and production priority after design, measurements, and fabric reference." />

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="font-semibold text-slate-950">Garment Pricing & Assignment</h2>
        {values.items.map((item, index) => {
          const garment = garments.find((entry) => entry.id === item.garmentTypeId);

          return (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'Garment'}</h3>
                <span className="text-sm font-semibold text-slate-600">Total {formatCurrency(lineTotal(item))}</span>
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <TextField label="Quantity *" type="number" inputMode="numeric" placeholder="1" value={item.quantity} error={errors['items.' + index + '.quantity']} onChange={(event) => onUpdateItem(item.id, { quantity: Number(event.target.value) })} />
                <TextField label="Unit price" type="number" inputMode="decimal" placeholder="2500" value={item.unitPrice} error={errors['items.' + index + '.unitPrice']} onChange={(event) => onUpdateItem(item.id, { unitPrice: Number(event.target.value) })} />
                <TextField label="Total price" value={formatCurrency(lineTotal(item))} readOnly />
                <TextField label="Item delivery date" type="date" value={item.itemDeliveryDate ?? ''} onChange={(event) => onUpdateItem(item.id, { itemDeliveryDate: event.target.value })} />
                {canAssign ? (
                  <SelectBox
                    label="Assigned worker"
                    value={item.assignedTo ?? ''}
                    onChange={(value) => onUpdateItem(item.id, { assignedTo: value })}
                    options={[{ value: '', label: 'Unassigned' }, ...members.map((member, memberIndex) => ({ value: member.user_id, label: memberOptionLabel(member.role, memberIndex) }))]}
                  />
                ) : null}
                <TextAreaField label="General instruction" placeholder="Example: Keep loose fit, add inner pocket, urgent delivery" value={item.specialInstructions ?? ''} onChange={(event) => onUpdateItem(item.id, { specialInstructions: event.target.value })} className="xl:col-span-3" />
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2">
        <TextField label="Order date *" type="date" value={values.orderDate} error={errors.orderDate} onChange={(event) => setValues((current) => ({ ...current, orderDate: event.target.value }))} />
        <TextField label="Trial date" type="date" value={values.trialDate ?? ''} onChange={(event) => setValues((current) => ({ ...current, trialDate: event.target.value }))} />
        <TextField label="Delivery date *" type="date" value={values.deliveryDate ?? ''} error={errors.deliveryDate} onChange={(event) => setValues((current) => ({ ...current, deliveryDate: event.target.value }))} />
        <SelectBox label="Production priority" value={values.priority} onChange={(value) => setValues((current) => ({ ...current, priority: value as OrderWizardValues['priority'] }))} options={orderPriorities.map((priority) => ({ value: priority, label: priority }))} />
        <TextField label="Discount" type="number" inputMode="decimal" placeholder="0" value={values.discountAmount} error={errors.discountAmount} onChange={(event) => setValues((current) => ({ ...current, discountAmount: Number(event.target.value) }))} />
        <TextField label="Advance payment" type="number" inputMode="decimal" placeholder="1000" value={values.advanceAmount} error={errors.advanceAmount} onChange={(event) => setValues((current) => ({ ...current, advanceAmount: Number(event.target.value) }))} />
        <SelectBox label="Payment method" value={values.paymentMethod} onChange={(value) => setValues((current) => ({ ...current, paymentMethod: value as OrderWizardValues['paymentMethod'] }))} options={paymentMethods.map((method) => ({ value: method, label: paymentMethodText(method) }))} />
        <TextField label="Payment reference" placeholder="Cash memo or transaction reference" value={values.paymentReference ?? ''} onChange={(event) => setValues((current) => ({ ...current, paymentReference: event.target.value }))} />
        <TextAreaField label="General order notes" placeholder="Delivery or customer-level instruction" value={values.notes ?? ''} onChange={(event) => setValues((current) => ({ ...current, notes: event.target.value }))} className="md:col-span-2" />
      </section>

      <div className="grid gap-3 rounded-lg border border-brand-200 bg-brand-50 p-4 sm:grid-cols-5">
        <Summary label="Subtotal" value={formatCurrency(subtotalValue)} />
        <Summary label="Discount" value={formatCurrency(values.discountAmount)} />
        <Summary label="Total" value={formatCurrency(totalValue)} />
        <Summary label="Advance" value={formatCurrency(values.advanceAmount)} />
        <Summary label="Due" value={formatCurrency(dueValue)} />
      </div>
    </div>
  );
}

function memberOptionLabel(role: string, index: number): string {
  return role.replace(/_/g, ' ') + ' ' + String(index + 1);
}

function paymentMethodText(method: string): string {
  return method.replace(/_/g, ' ');
}

export function FinalPreviewStep({
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
      <StepHeader description="Review the professional Faabrico tailoring sheet before confirming the order." />

      <article className="mx-auto max-w-5xl rounded-lg border border-slate-300 bg-white p-5 text-slate-950 shadow-sm" data-testid="final-one-page-preview">
        <header className="flex flex-col gap-4 border-b-2 border-brand-900 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-12 w-32 items-center justify-center rounded-md border border-brand-900 bg-brand-900 p-1 text-white">
              <img src={appBrand.logoUrl} alt={appBrand.name} className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">{appBrand.name}</h2>
              <p className="text-sm font-semibold text-brand-900">{appBrand.subtitle}</p>
              <p className="mt-1 text-xs leading-5 text-slate-600">Phone: {appBrand.phone}</p>
              <p className="text-xs leading-5 text-slate-600">Address: {appBrand.address}</p>
            </div>
          </div>
          <div className="grid gap-2 text-sm sm:min-w-56">
            <PreviewLine label="Order No / Token No" value="Will be generated" />
            <PreviewLine label="Date" value={formatDate(values.orderDate)} />
          </div>
        </header>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <PreviewSection title="Customer Information">
            <PreviewGrid>
              <PreviewLine label="Name" value={customerDraft.name || selectedCustomer?.name || 'Not set'} />
              <PreviewLine label="Mobile" value={customerDraft.phone || selectedCustomer?.phone || 'Not set'} />
              <PreviewLine label="Alternative Mobile" value={customerDraft.alternativePhone || selectedCustomer?.alternative_phone || 'Not set'} />
              <PreviewLine label="Email" value={customerDraft.email || selectedCustomer?.email || 'Not set'} />
              <PreviewLine label="Address" value={customerDraft.address || selectedCustomer?.address || 'Not set'} wide />
            </PreviewGrid>
          </PreviewSection>

          <PreviewSection title="Payment Summary">
            <PreviewGrid>
              <PreviewLine label="Subtotal" value={formatCurrency(subtotalValue)} />
              <PreviewLine label="Discount" value={formatCurrency(values.discountAmount)} />
              <PreviewLine label="Total" value={formatCurrency(totalValue)} />
              <PreviewLine label="Advance" value={formatCurrency(values.advanceAmount)} />
              <PreviewLine label="Due" value={formatCurrency(dueValue)} />
              <PreviewLine label="Payment method" value={paymentMethodText(values.paymentMethod)} />
            </PreviewGrid>
          </PreviewSection>
        </div>

        {values.items.map((item, index) => {
          const garment = garments.find((entry) => entry.id === item.garmentTypeId);
          const measurementValues = measurementValuesForItem(item, measurements);
          const designEntries = designSelectionEntriesFromSnapshot(item.designSnapshot);
          const fabricReferenceUrl = item.fabricReferenceUrl || null;

          return (
            <section key={item.id} className="mt-4 rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Garment Information</p>
                  <h3 className="text-lg font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'Garment'}</h3>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">Quantity {item.quantity}</span>
              </div>

              <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
                <PreviewLine label="Garment item" value={garment?.name ?? 'Not selected'} />
                <PreviewLine label="Quantity" value={String(item.quantity)} />
                <PreviewLine label="Delivery date" value={formatDate(item.itemDeliveryDate || values.deliveryDate)} />
                <PreviewLine label="Trial date" value={formatDate(values.trialDate)} />
                <PreviewLine label="Assigned worker" value={item.assignedTo ? 'Assigned' : 'Unassigned'} />
                <PreviewLine label="Priority" value={values.priority} />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <PreviewSection title="Design Selection Summary">
                  {designEntries.length === 0 ? (
                    <p className="text-sm text-slate-500">No design details selected.</p>
                  ) : (
                    <dl className="grid gap-2 sm:grid-cols-2">
                      {designEntries.map((entry) => (
                        <div key={entry.key} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                          <dt className="text-[0.68rem] font-semibold uppercase text-slate-500">{entry.label}</dt>
                          <dd className="mt-1 text-sm font-semibold text-slate-950">{entry.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </PreviewSection>

                <PreviewSection title="Measurement Summary">
                  <PreviewMeasurementTable values={measurementValues} />
                </PreviewSection>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]">
                <PreviewSection title="Fabric Reference">
                  <ThumbnailImage src={fabricReferenceUrl} className="h-24 w-full rounded-lg border border-slate-200" emptyText="Skipped" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">{fabricReferenceUrl ? 'Fabric reference added' : 'Fabric reference skipped'}</p>
                </PreviewSection>

                <PreviewSection title="Estimated Visual Preview">
                  <GarmentDesignPreview
                    garmentName={garment?.name ?? 'Garment'}
                    designSnapshot={recordFromUnknown(item.designSnapshot)}
                    measurementValues={measurementValues}
                    fabricReferenceUrl={fabricReferenceUrl}
                    compact
                  />
                </PreviewSection>
              </div>

              {item.specialInstructions ? (
                <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{item.specialInstructions}</p>
              ) : null}
            </section>
          );
        })}

        <footer className="mt-6 border-t border-slate-300 pt-6">
          <div className="grid gap-6 sm:grid-cols-3">
            <SignatureLine label="Customer signature" />
            <SignatureLine label="Stylist/Staff signature" />
            <SignatureLine label="Owner/Manager signature" />
          </div>
          <p className="mt-6 text-center text-sm font-semibold text-brand-900">Thank you for choosing {appBrand.name}</p>
        </footer>
      </article>
    </div>
  );
}

function PreviewSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-3">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h4>
      {children}
    </section>
  );
}

function PreviewGrid({ children }: { children: ReactNode }) {
  return <div className="grid gap-2 sm:grid-cols-2">{children}</div>;
}

function PreviewLine({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={cn('rounded-md border border-slate-200 bg-slate-50 px-3 py-2', wide ? 'sm:col-span-2' : null)}>
      <dt className="text-[0.68rem] font-semibold uppercase text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function PreviewMeasurementTable({ values }: { values: Record<string, unknown> }) {
  const entries = displayEntries(values);

  if (entries.length === 0) {
    return <p className="text-sm text-slate-500">No measurement entered.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm">
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.key}>
            <th className="border border-slate-200 bg-slate-50 px-2 py-1 text-left text-xs font-semibold uppercase text-slate-500">{entry.label}</th>
            <td className="border border-slate-200 px-2 py-1 font-semibold text-slate-950">{entry.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function SignatureLine({ label }: { label: string }) {
  return <div className="border-t border-slate-900 pt-2 text-center text-xs font-semibold uppercase text-slate-700">{label}</div>;
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
          'min-h-12 w-full rounded-lg border border-brand-200 bg-white px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
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

function StepHeader({ description }: { description: string }) {
  return (
    <p className="border-l-2 border-brand-600 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-600">{description}</p>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-brand-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function Snapshot({ title, values }: { title: string; values: Record<string, unknown> }) {
  const entries = displayEntries(values);
  if (entries.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg border border-brand-200 bg-white p-3 text-sm shadow-sm">
      <p className="font-semibold text-slate-900">{title}</p>
      <dl className="mt-2 grid gap-2 sm:grid-cols-2">
        {entries.map((entry) => (
          <div key={entry.key} className="min-w-0 rounded-lg bg-brand-50 px-3 py-2">
            <dt className="text-xs font-semibold uppercase text-slate-500">{entry.label}</dt>
            <dd className="mt-1 break-words font-medium text-slate-900">{entry.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3 rounded-lg bg-white px-3 py-2 shadow-sm">
      <span className="text-slate-500">{label}</span>
      <span className="break-words text-right font-semibold text-slate-950">{value}</span>
    </div>
  );
}







