import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
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
import { useId, useState, type ChangeEvent, type Dispatch, type SetStateAction } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { TextAreaField, TextField } from '../components/ui/FormField';
import { useCreateCustomer, useDuplicateCustomerPhone, useUpdateCustomer } from '../features/customers/customerHooks';
import type { Customer, CustomerListItem } from '../features/customers/customerService';
import { useGarmentDesigns } from '../features/designs/designHooks';
import type { GarmentDesign } from '../features/designs/types';
import { DynamicField } from '../features/measurements/components/DynamicField';
import { displayDynamicValue, jsonObject, optionObjects } from '../features/measurements/components/display';
import { useMeasurementFields, useStyleFields } from '../features/measurements/configurationHooks';
import { validateGarmentItemDetails } from '../features/orders/orderFlowValidation';
import { createMeasurementVersion } from '../features/measurements/measurementService';
import type { GarmentType, MeasurementField, MeasurementSet, StyleField } from '../features/measurements/types';
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
import { GarmentPreviewCard } from '../features/preview/GarmentPreviewCard';
import { buildPreviewSummary, designSnapshot, measurementValuesForItem, recordFromUnknown } from '../features/preview/previewUtils';
import { uploadImageToStorage, validateImageFile } from '../features/uploads/imageUpload';
import { useShop } from '../features/shop/shopContext';
import type { MeasurementUnit } from '../types/database';
import { canAssignWorkers, canCreateOrders, canManageConfiguration } from '../utils/authorization';
import { cn } from '../utils/cn';
import { formatCurrency } from '../utils/format';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const steps = [
  'Customer Details',
  'Garment Items',
  'Choose Design',
  'Style & Measurements',
  'Preview Garment',
  'Payment & Delivery',
  'Final Preview',
];

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

function newOrderItem(unit: MeasurementUnit): OrderItemFormValues {
  return { ...emptyOrderItem(), measurementMode: 'new', measurementUnit: unit };
}

export function NewOrderPage() {
  const navigate = useNavigate();
  const { currentRole, currentShop, currentShopId } = useShop();
  const canCreate = canCreateOrders(currentRole);
  const canAssign = canAssignWorkers(currentRole);
  const canManageDesigns = canManageConfiguration(currentRole);
  const defaultUnit = currentShop?.default_measurement_unit ?? 'inch';
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OrderWizardValues>(() => ({
    ...emptyOrderWizardValues(),
    items: [newOrderItem(defaultUnit)],
  }));
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomerDraft);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | CustomerListItem | null>(null);
  const [search, setSearch] = useState('');
  const [designSearch, setDesignSearch] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [flowError, setFlowError] = useState('');
  const [shouldPrintAfterCreate, setShouldPrintAfterCreate] = useState(false);
  const [uploadingFabricItemIds, setUploadingFabricItemIds] = useState<Set<string>>(() => new Set());
  const debouncedSearch = useDebouncedValue(search, 300);
  const selectedGarmentTypeIds = Array.from(new Set(values.items.map((item) => item.garmentTypeId).filter(Boolean)));
  const contextQuery = useOrderWizardContext(currentShopId);
  const designsQuery = useGarmentDesigns(currentShopId, { garmentTypeIds: selectedGarmentTypeIds, activeOnly: true, limit: 200 });
  const customerSearchQuery = useOrderCustomerSearch(currentShopId, debouncedSearch);
  const measurementsQuery = useCustomerMeasurementsForOrder(currentShopId, values.customerId || undefined);
  const allStyleFieldsQuery = useStyleFields(currentShopId, undefined, false);
  const allMeasurementFieldsQuery = useMeasurementFields(currentShopId, undefined, false);
  const duplicateQuery = useDuplicateCustomerPhone(currentShopId, customerDraft.phone, selectedCustomer?.id);
  const createCustomer = useCreateCustomer(currentShopId ?? '');
  const updateCustomer = useUpdateCustomer(currentShopId ?? '', selectedCustomer?.id ?? '');
  const createOrder = useCreateOrder(currentShopId ?? '');
  const measurements = measurementsQuery.data ?? [];
  const designs = designsQuery.data ?? [];
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
      });
    }

    if (targetStep === 3) {
      Object.assign(nextErrors, validateGarmentItemDetails({
        items: values.items,
        styleFields: allStyleFieldsQuery.data ?? [],
        measurementFields: allMeasurementFieldsQuery.data ?? [],
        uploadingFabricItemIds,
        configurationLoading: allStyleFieldsQuery.isLoading || allMeasurementFieldsQuery.isLoading,
      }));
    }

    if (targetStep === 5) {
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

    const validationErrorsByStep = [0, 1, 3, 5].map((index) => ({ index, errors: collectStepErrors(index) }));
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
        setStep(parsed.error.issues.some((issue) => issue.path[0] === 'items') ? 3 : 5);
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
        const design = designs.find((entry) => entry.id === item.designId) ?? null;
        const measurementValues = measurementValuesForItem(item, measurements);
        const fabricReferenceUrl = item.fabricReferenceUrl || '';
        const previewSummary = buildPreviewSummary({
          garmentName: garment?.name ?? 'Garment',
          design,
          item: { ...item, fabricReferenceUrl },
          measurementValues,
        });

        return {
          ...item,
          designSnapshot: designSnapshot(design),
          previewSummary,
          designReferenceUrl: design?.preview_image_url ?? item.designReferenceUrl ?? '',
          fabricReferenceUrl,
          previewVideoUrl: design?.preview_video_url ?? item.previewVideoUrl ?? '',
        };
      });

      const styleDefinitionsByItemId = finalizedItems.reduce<Record<string, StyleField[]>>((definitionsByItemId, item) => {
        definitionsByItemId[item.id] = (allStyleFieldsQuery.data ?? []).filter((field) => field.garment_type_id === item.garmentTypeId);
        return definitionsByItemId;
      }, {});
      const payload = buildCreateOrderPayload({ ...parsed.data, items: finalizedItems }, styleDefinitionsByItemId);
      const result = await createOrder.mutateAsync({ customerId, payload });
      window.localStorage.removeItem(draftKey(currentShopId));
      navigate(`/orders/${result.order.id}/success${printAfterCreate ? '?print=customer-token' : ''}`);
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
          <h1 className="text-2xl font-semibold text-slate-950">New Design Order</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Customer details, garment selection, design preview, measurement entry, payment, and final confirmation in one guided flow.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-panel">
          {selectedCustomer ? <span className="font-medium text-slate-950">{selectedCustomerText}</span> : 'New customer entry'}
        </div>
      </header>

      <nav className="grid gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-panel sm:grid-cols-2 lg:grid-cols-7" aria-label="Order steps">
        {steps.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setStep(index)}
            className={cn(
              'min-h-12 rounded-lg px-2 text-xs font-semibold transition',
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
          <GarmentItemsStep
            items={values.items}
            garments={contextQuery.data.garments}
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
          <DesignSelectionStep
            items={values.items}
            garments={contextQuery.data.garments}
            designs={designs}
            designSearch={designSearch}
            setDesignSearch={setDesignSearch}
            isLoading={designsQuery.isLoading}
            error={designsQuery.error?.message}
            canManageDesigns={canManageDesigns}
            onUpdateItem={updateItem}
          />
        ) : null}

        {step === 3 ? (
          <MeasurementStep
            customerId={values.customerId}
            items={values.items}
            garments={contextQuery.data.garments}
            designs={designs}
            measurements={measurements}
            defaultUnit={defaultUnit}
            onUpdateItem={updateItem}
            onFabricUploadStateChange={setFabricUploadState}
            errors={errors}
          />
        ) : null}

        {step === 4 ? (
          <PreviewGarmentStep
            items={values.items}
            garments={contextQuery.data.garments}
            designs={designs}
            measurements={measurements}
          />
        ) : null}

        {step === 5 ? <PaymentDeliveryStep values={values} setValues={setValues} errors={errors} /> : null}

        {step === 6 ? (
          <FinalPreviewStep
            values={values}
            customerDraft={customerDraft}
            selectedCustomer={selectedCustomer}
            garments={contextQuery.data.garments}
            designs={designs}
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
                {shouldPrintAfterCreate ? 'Preparing Token' : 'Confirm and Prepare Token'}
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

function GarmentItemsStep({
  items,
  garments,
  members,
  canAssign,
  defaultUnit,
  onAddItem,
  onRemoveItem,
  onUpdateItem,
  errors,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
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
      <StepHeader title="Garment Items" description="Choose item type, quantity, worker assignment, and pricing before opening the design gallery." />
      {items.map((item, index) => (
        <section key={item.id} className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">Garment {index + 1}</h2>
              <p className="mt-1 text-xs text-slate-500">Design, measurements, and snapshots are attached in the next steps.</p>
            </div>
            <button type="button" title="Remove item" onClick={() => onRemoveItem(item.id)} className="flex h-9 w-9 items-center justify-center rounded-lg text-red-600 hover:bg-red-50">
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <SelectBox
              label="Garment *"
              value={item.garmentTypeId}
              error={errors[`items.${index}.garmentTypeId`]}
              onChange={(value) => onUpdateItem(item.id, {
                garmentTypeId: value,
                measurementSetId: '',
                measurementValues: {},
                styleValues: {},
                measurementUnit: defaultUnit,
                designId: '',
                designSnapshot: {},
                previewSummary: {},
                designReferenceUrl: '',
                previewVideoUrl: '',
              })}
              options={garments.map((garment) => ({ value: garment.id, label: garment.name }))}
            />
            <TextField label="Quantity *" type="number" inputMode="numeric" value={item.quantity} error={errors[`items.${index}.quantity`]} onChange={(event) => onUpdateItem(item.id, { quantity: Number(event.target.value) })} />
            <TextField label="Unit price" type="number" inputMode="decimal" value={item.unitPrice} onChange={(event) => onUpdateItem(item.id, { unitPrice: Number(event.target.value) })} />
            <TextField label="Item delivery date" type="date" value={item.itemDeliveryDate ?? ''} onChange={(event) => onUpdateItem(item.id, { itemDeliveryDate: event.target.value })} />
            {canAssign ? (
              <SelectBox
                label="Assigned worker"
                value={item.assignedTo ?? ''}
                onChange={(value) => onUpdateItem(item.id, { assignedTo: value })}
                options={[{ value: '', label: 'Unassigned' }, ...members.map((member) => ({ value: member.user_id, label: `${member.role} - ${member.user_id.slice(0, 8)}` }))]}
              />
            ) : null}
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
            Line total preview: <strong>{formatCurrency(lineTotal(item))}</strong>
          </div>
        </section>
      ))}
      <button type="button" onClick={onAddItem} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
        <Plus aria-hidden="true" className="h-4 w-4" />
        Add Garment
      </button>
    </div>
  );
}

export function DesignSelectionStep({
  items,
  garments,
  designs,
  designSearch,
  setDesignSearch,
  isLoading,
  error,
  canManageDesigns,
  onUpdateItem,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  designs: GarmentDesign[];
  designSearch: string;
  setDesignSearch: (value: string) => void;
  isLoading: boolean;
  error?: string;
  canManageDesigns: boolean;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
}) {
  const [styleCategory, setStyleCategory] = useState('');
  const [previewTarget, setPreviewTarget] = useState<{ itemId: string; garmentName: string; design: GarmentDesign } | null>(null);
  const [bigPreviewDesign, setBigPreviewDesign] = useState<GarmentDesign | null>(null);
  const relevantDesigns = designs.filter((design) => items.some((item) => item.garmentTypeId === design.garment_type_id));
  const styleCategories = Array.from(
    new Set(relevantDesigns.map((design) => design.style_category?.trim()).filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));

  function chooseDesign(itemId: string, design: GarmentDesign) {
    onUpdateItem(itemId, {
      designId: design.id,
      designSnapshot: designSnapshot(design),
      designReferenceUrl: design.preview_image_url ?? '',
      previewVideoUrl: design.preview_video_url ?? '',
    });
    setPreviewTarget(null);
  }

  return (
    <div className="space-y-5">
      <StepHeader title="Choose Design" description="Select a design thumbnail for each garment before style and measurement entry." />
      <div className="grid gap-3 rounded-lg bg-slate-50 p-3 lg:grid-cols-[1fr_14rem_auto] lg:items-end">
        <label className="relative block flex-1">
          <span className="mb-2 block text-sm font-medium text-slate-700">Search designs</span>
          <Search aria-hidden="true" className="pointer-events-none absolute bottom-4 left-3 h-4 w-4 text-slate-400" />
          <input
            value={designSearch}
            onChange={(event) => setDesignSearch(event.target.value)}
            placeholder="Search name, code, category, or tag"
            className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <SelectBox
          label="Style category"
          value={styleCategory}
          options={[{ value: '', label: 'All categories' }, ...styleCategories.map((category) => ({ value: category, label: category }))]}
          onChange={setStyleCategory}
        />
        {canManageDesigns ? (
          <Link to="/settings/designs" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            Add New Design
          </Link>
        ) : null}
      </div>

      {isLoading ? <Loading label="Loading design gallery" /> : null}
      {error ? <EmptyState icon={ShieldAlert} title="Could not load design gallery" message={error} /> : null}

      {items.map((item, index) => {
        const garment = garments.find((entry) => entry.id === item.garmentTypeId);
        const garmentName = garment?.name ?? 'Garment';
        const itemDesigns = designs
          .filter((design) => design.garment_type_id === item.garmentTypeId)
          .filter((design) => !styleCategory || design.style_category === styleCategory)
          .filter((design) => designMatchesSearch(design, designSearch));
        const selectedDesign = itemDesigns.find((design) => design.id === item.designId);
        const selectedDesignFromAll = designs.find((design) => design.id === item.designId) ?? selectedDesign;

        return (
          <section key={item.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'Select a garment first'}</h2>
                <p className="mt-1 text-sm text-slate-600">
                  {selectedDesignFromAll ? `Selected: ${selectedDesignFromAll.design_name}` : 'No design selected yet.'}
                </p>
              </div>
              <span className="inline-flex min-h-9 items-center rounded-full bg-brand-50 px-3 text-xs font-semibold text-brand-700">
                Choose Design
              </span>
            </div>

            {selectedDesignFromAll ? (
              <div className="mt-4 rounded-lg border border-brand-200 bg-brand-50 p-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-brand-950">{selectedDesignFromAll.design_name}</p>
                    <p className="mt-1 text-sm text-brand-800">
                      {selectedDesignFromAll.design_code}
                      {selectedDesignFromAll.style_category ? ` - ${selectedDesignFromAll.style_category}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onUpdateItem(item.id, { designId: '', designSnapshot: {}, previewSummary: {}, previewVideoUrl: '' })}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg border border-brand-300 bg-white px-3 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    Change Design
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">
                No design selected. You can continue, but this item will be saved without a selected style design.
              </p>
            )}

            {!item.garmentTypeId ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                Select a garment type to show matching designs.
              </div>
            ) : itemDesigns.length === 0 ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                No designs added for {garmentName} yet. Add designs from Design Library.
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {itemDesigns.map((design) => {
                  const isSelected = item.designId === design.id;

                  return (
                    <article key={design.id} className={cn('overflow-hidden rounded-lg border bg-white shadow-panel', isSelected ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200')}>
                      <button
                        type="button"
                        onClick={() => setPreviewTarget({ itemId: item.id, garmentName, design })}
                        className="block w-full text-left"
                      >
                        <ThumbnailImage src={design.preview_image_url} className="aspect-[4/3] w-full" />
                        <div className="space-y-2 p-3">
                          <div>
                            <p className="font-semibold text-slate-950">{design.design_name}</p>
                            <p className="mt-1 text-sm text-slate-600">{design.design_code}{design.style_category ? ` - ${design.style_category}` : ''}</p>
                          </div>
                          <TagList tags={design.tags} />
                        </div>
                      </button>
                      <div className="border-t border-slate-100 p-3">
                        <button
                          type="button"
                          onClick={() => setPreviewTarget({ itemId: item.id, garmentName, design })}
                          className={cn(
                            'inline-flex min-h-10 w-full items-center justify-center rounded-lg px-3 text-sm font-semibold',
                            isSelected ? 'bg-brand-600 text-white' : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100',
                          )}
                        >
                          {isSelected ? 'Selected' : 'Choose'}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {previewTarget ? (
        <DesignPreviewModal
          target={previewTarget}
          isSelected={items.some((item) => item.id === previewTarget.itemId && item.designId === previewTarget.design.id)}
          onClose={() => setPreviewTarget(null)}
          onOpenBig={() => setBigPreviewDesign(previewTarget.design)}
          onChoose={() => chooseDesign(previewTarget.itemId, previewTarget.design)}
        />
      ) : null}

      {bigPreviewDesign ? <BigPreviewModal design={bigPreviewDesign} onClose={() => setBigPreviewDesign(null)} /> : null}
    </div>
  );
}

function designMatchesSearch(design: GarmentDesign, search: string) {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [
    design.design_name,
    design.design_code,
    design.style_category,
    design.description,
    ...design.tags,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(normalized);
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {tags.slice(0, 4).map((tag) => (
        <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{tag}</span>
      ))}
    </div>
  );
}

function ThumbnailImage({ src, className }: { src?: string | null; className: string }) {
  const [isBroken, setIsBroken] = useState(false);

  if (src && !isBroken) {
    return <img src={src} alt="" className={cn(className, 'object-cover')} loading="lazy" onError={() => setIsBroken(true)} />;
  }

  return (
    <div aria-label="Image unavailable" className={cn(className, 'flex items-center justify-center bg-slate-100 p-4')}>
      <div className="relative h-20 w-16">
        <div className="absolute left-1/2 top-2 h-16 w-11 -translate-x-1/2 rounded-t-2xl rounded-b-lg border border-brand-700/20 bg-white shadow-panel" />
        <div className="absolute left-0 top-6 h-10 w-4 -rotate-12 rounded-lg border border-brand-700/20 bg-white" />
        <div className="absolute right-0 top-6 h-10 w-4 rotate-12 rounded-lg border border-brand-700/20 bg-white" />
        <div className="absolute left-1/2 top-4 h-3 w-7 -translate-x-1/2 rounded-b-full border border-brand-700/20 bg-brand-50" />
      </div>
    </div>
  );
}

function DesignPreviewModal({
  target,
  isSelected,
  onClose,
  onOpenBig,
  onChoose,
}: {
  target: { itemId: string; garmentName: string; design: GarmentDesign };
  isSelected: boolean;
  onClose: () => void;
  onOpenBig: () => void;
  onChoose: () => void;
}) {
  const metadata = recordFromUnknown(target.design.style_metadata);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">{target.garmentName}</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-950">{target.design.design_name}</h2>
          </div>
          <button type="button" onClick={onClose} title="Close" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <ThumbnailImage src={target.design.preview_image_url} className="min-h-80 w-full rounded-lg border border-slate-200" />
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <SummaryLine label="Design code" value={target.design.design_code} />
              <SummaryLine label="Style category" value={target.design.style_category ?? 'Not set'} />
              <SummaryLine label="Description" value={target.design.description ?? 'No description'} />
            </div>
            <TagList tags={target.design.tags} />
            <Snapshot title="Style metadata" values={metadata} />
            {target.design.cloth_reference_url ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-800">Library cloth/reference</p>
                <ThumbnailImage src={target.design.cloth_reference_url} className="h-36 w-full rounded-lg border border-slate-200" />
              </div>
            ) : null}
            {target.design.preview_video_url ? <video src={target.design.preview_video_url} controls preload="metadata" className="max-h-56 w-full rounded-lg border border-slate-200 bg-slate-950" /> : null}
          </div>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-200 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Close
          </button>
          <button type="button" onClick={onOpenBig} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-4 text-sm font-semibold text-brand-700 hover:bg-brand-100">
            <ExternalLink aria-hidden="true" className="h-4 w-4" />
            Open Big Preview
          </button>
          <button type="button" onClick={onChoose} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700">
            {isSelected ? 'Keep This Design' : 'Choose This Design'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BigPreviewModal({ design, onClose }: { design: GarmentDesign; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">{design.design_name}</h2>
            <p className="mt-1 text-sm text-slate-600">{design.design_code}{design.style_category ? ` - ${design.style_category}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} title="Close" className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>
        <ThumbnailImage src={design.preview_image_url} className="min-h-[28rem] w-full rounded-lg border border-slate-200" />
        {design.preview_video_url ? <video src={design.preview_video_url} controls preload="metadata" className="mt-4 max-h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-950" /> : null}
      </div>
    </div>
  );
}

export function MeasurementStep({
  customerId,
  items,
  garments,
  designs,
  measurements,
  defaultUnit,
  onUpdateItem,
  onFabricUploadStateChange,
  errors,
}: {
  customerId: string;
  items: OrderItemFormValues[];
  garments: GarmentType[];
  designs: GarmentDesign[];
  measurements: MeasurementSet[];
  defaultUnit: MeasurementUnit;
  onUpdateItem: (itemId: string, patch: Partial<OrderItemFormValues>) => void;
  onFabricUploadStateChange: (itemId: string, isUploading: boolean) => void;
  errors: Record<string, string>;
}) {
  return (
    <div className="space-y-4">
      <StepHeader title="Style and Measurements" description="Select style before taking measurement, then add the fabric reference at the end of each garment item." />
      {items.map((item, index) => (
        <MeasurementItemEditor
          key={item.id}
          item={item}
          index={index}
          customerId={customerId}
          garment={garments.find((entry) => entry.id === item.garmentTypeId)}
          design={designs.find((entry) => entry.id === item.designId) ?? null}
          measurements={measurements}
          defaultUnit={defaultUnit}
          onUpdate={(patch) => onUpdateItem(item.id, patch)}
          onFabricUploadStateChange={(isUploading) => onFabricUploadStateChange(item.id, isUploading)}
          errors={errors}
        />
      ))}
    </div>
  );
}

function MeasurementItemEditor({
  item,
  index,
  customerId,
  garment,
  design,
  measurements,
  defaultUnit,
  onUpdate,
  onFabricUploadStateChange,
  errors,
}: {
  item: OrderItemFormValues;
  index: number;
  customerId: string;
  garment: GarmentType | undefined;
  design: GarmentDesign | null;
  measurements: MeasurementSet[];
  defaultUnit: MeasurementUnit;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
  onFabricUploadStateChange: (isUploading: boolean) => void;
  errors: Record<string, string>;
}) {
  const { currentShopId } = useShop();
  const styleFieldsQuery = useStyleFields(currentShopId, item.garmentTypeId || undefined, false);
  const measurementFieldsQuery = useMeasurementFields(currentShopId, item.garmentTypeId || undefined, false);
  const garmentMeasurements = measurements.filter((measurement) => measurement.garment_type_id === item.garmentTypeId);
  const selectedMeasurement = garmentMeasurements.find((measurement) => measurement.id === item.measurementSetId);
  const itemErrorPrefix = `items.${index}`;

  const styleFields = styleFieldsQuery.data ?? [];
  const measurementFields = measurementFieldsQuery.data ?? [];

  return (
    <section className="space-y-4 border-b border-slate-200 pb-5 last:border-b-0 last:pb-0">
      <div>
        <h2 className="font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'Garment'}</h2>
        <p className="mt-1 text-xs text-slate-500">Design, style, measurement, fabric, and preview data become immutable order item snapshots.</p>
      </div>

      <SelectedDesignSummary design={design} />

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Style Options</h3>
        <p className="mt-1 text-sm text-slate-600">Select style before taking measurement.</p>
        {styleFieldsQuery.isLoading ? <p className="mt-3 text-sm text-slate-500">Loading style options...</p> : null}
        {!styleFieldsQuery.isLoading && styleFields.length === 0 ? <p className="mt-3 text-sm text-slate-500">No style options configured for this garment.</p> : null}
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
                error={errors[`${itemErrorPrefix}.styleValues.${field.field_key}`]}
                onChange={(value) => onUpdate({ styleValues: { ...item.styleValues, [field.field_key]: value } })}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-950">Measurements</h3>
        <p className="mt-1 text-sm text-slate-600">Enter measurement based on selected style.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onUpdate({ measurementMode: 'new', measurementSetId: '', measurementUnit: item.measurementUnit || defaultUnit })}
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
            fields={measurementFields}
            isLoading={measurementFieldsQuery.isLoading}
            error={errors[`${itemErrorPrefix}.measurementValues`]}
            fieldErrors={Object.fromEntries(measurementFields.map((field) => [field.field_key, errors[`${itemErrorPrefix}.measurementValues.${field.field_key}`] ?? '']))}
            onUpdate={onUpdate}
          />
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <TextAreaField label="Item special instruction" value={item.specialInstructions ?? ''} onChange={(event) => onUpdate({ specialInstructions: event.target.value })} />
      </section>

      <FabricReferenceSection
        item={item}
        error={errors[`${itemErrorPrefix}.fabricReferenceUrl`]}
        onUpdate={onUpdate}
        onUploadStateChange={onFabricUploadStateChange}
      />

      <ItemPreviewSummary item={item} garment={garment} design={design} measurements={measurements} />
    </section>
  );
}

function SelectedDesignSummary({ design }: { design: GarmentDesign | null }) {
  if (!design) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <h3 className="text-sm font-semibold text-amber-950">Selected design summary</h3>
        <p className="mt-1 text-sm text-amber-900">No design selected. You can continue, but this item will be saved without a selected style design.</p>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <h3 className="text-sm font-semibold text-brand-950">Selected design summary</h3>
      <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,18rem)_1fr]">
        <ThumbnailImage src={design.preview_image_url} className="h-32 w-full rounded-lg border border-brand-200" />
        <div className="grid content-center gap-2 text-sm">
          <SummaryLine label="Design" value={design.design_name} />
          <SummaryLine label="Code" value={design.design_code} />
          <SummaryLine label="Category" value={design.style_category ?? 'Not set'} />
        </div>
      </div>
    </section>
  );
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
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-slate-950">Fabric / Cloth Reference</h3>
      <p className="mt-1 text-sm text-slate-600">Add the customer's selected fabric image, use URL, or skip.</p>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => chooseMode('upload')}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold', mode === 'upload' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100')}
        >
          <Upload aria-hidden="true" className="h-4 w-4" />
          Upload Image
        </button>
        <button
          type="button"
          onClick={() => chooseMode('url')}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold', mode === 'url' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100')}
        >
          <LinkIcon aria-hidden="true" className="h-4 w-4" />
          Use URL
        </button>
        <button
          type="button"
          onClick={() => chooseMode('skip')}
          className={cn('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-semibold', mode === 'skip' ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-300 text-slate-700 hover:bg-slate-100')}
        >
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Skip
        </button>
      </div>

      {mode === 'upload' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_12rem]">
          <label htmlFor={inputId} className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600 hover:bg-slate-100">
            <Upload aria-hidden="true" className="mb-2 h-5 w-5 text-brand-700" />
            {isUploading ? 'Uploading fabric image...' : item.fabricReferenceUrl ? 'Change image' : 'Upload fabric image'}
            <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => void uploadFabricImage(event)} />
          </label>
          {item.fabricReferenceUrl ? (
            <div className="space-y-2">
              <ThumbnailImage src={item.fabricReferenceUrl} className="h-32 w-full rounded-lg border border-slate-200" />
              <button type="button" onClick={() => onUpdate({ fabricReferenceUrl: '' })} className="inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                <X aria-hidden="true" className="h-4 w-4" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-500">No fabric image</div>
          )}
        </div>
      ) : null}

      {mode === 'url' ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_12rem]">
          <TextField label="Fabric image URL" value={item.fabricReferenceUrl ?? ''} error={error} onChange={(event) => onUpdate({ fabricReferenceMode: 'url', fabricReferenceUrl: event.target.value })} />
          {item.fabricReferenceUrl ? (
            <ThumbnailImage src={item.fabricReferenceUrl} className="h-32 w-full rounded-lg border border-slate-200" />
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">No URL</div>
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
  design,
  measurements,
}: {
  item: OrderItemFormValues;
  garment: GarmentType | undefined;
  design: GarmentDesign | null;
  measurements: MeasurementSet[];
}) {
  const measurementValues = measurementValuesForItem(item, measurements);
  const styleCount = Object.values(item.styleValues).filter((value) => value !== '' && value !== null && value !== undefined).length;
  const measurementCount = Object.values(measurementValues).filter((value) => value !== '' && value !== null && value !== undefined).length;
  const fabricStatus = item.fabricReferenceUrl ? 'Added' : 'Skipped';

  return (
    <section className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-950">Estimated garment preview</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Selected Design</p>
            <ThumbnailImage src={design?.preview_image_url} className="h-32 w-full rounded-lg border border-slate-200" />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Fabric / Cloth Reference</p>
            <ThumbnailImage src={item.fabricReferenceUrl} className="h-32 w-full rounded-lg border border-slate-200" />
          </div>
        </div>
        <div className="grid content-center gap-2 text-sm">
          <SummaryLine label="Garment type" value={garment?.name ?? 'Not selected'} />
          <SummaryLine label="Selected design" value={design?.design_name ?? 'Skipped'} />
          <SummaryLine label="Style options" value={`${styleCount} selected`} />
          <SummaryLine label="Measurements" value={`${measurementCount} entered`} />
          <SummaryLine label="Fabric image" value={fabricStatus} />
        </div>
      </div>
    </section>
  );
}

function NewMeasurementEditor({
  item,
  fields,
  isLoading,
  error,
  fieldErrors,
  onUpdate,
}: {
  item: OrderItemFormValues;
  fields: MeasurementField[];
  isLoading: boolean;
  error?: string;
  fieldErrors: Record<string, string>;
  onUpdate: (patch: Partial<OrderItemFormValues>) => void;
}) {
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
              error={fieldErrors[field.field_key]}
              onChange={(value) => onUpdate({ measurementValues: { ...item.measurementValues, [field.field_key]: value } })}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PreviewGarmentStep({
  items,
  garments,
  designs,
  measurements,
}: {
  items: OrderItemFormValues[];
  garments: GarmentType[];
  designs: GarmentDesign[];
  measurements: MeasurementSet[];
}) {
  return (
    <div className="space-y-5">
      <StepHeader title="Preview Garment" description="Review visual mockups, cloth references, style choices, and measurement indicators with the customer." />
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

        return (
          <GarmentPreviewCard
            key={item.id}
            title={`Item ${index + 1} estimated garment preview`}
            garmentName={garment?.name ?? 'Garment'}
            designName={design?.design_name}
            styleCategory={design?.style_category}
            previewImageUrl={design?.preview_image_url}
            fabricReferenceUrl={fabricReferenceUrl}
            previewVideoUrl={design?.preview_video_url ?? item.previewVideoUrl}
            measurementValues={measurementValues}
            styleValues={item.styleValues}
            previewSummary={previewSummary}
          />
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

function FinalPreviewStep({
  values,
  customerDraft,
  selectedCustomer,
  garments,
  designs,
  measurements,
  subtotalValue,
  totalValue,
  dueValue,
}: {
  values: OrderWizardValues;
  customerDraft: CustomerDraft;
  selectedCustomer: Customer | CustomerListItem | null;
  garments: GarmentType[];
  designs: GarmentDesign[];
  measurements: MeasurementSet[];
  subtotalValue: number;
  totalValue: number;
  dueValue: number;
}) {
  return (
    <div className="space-y-5">
      <StepHeader title="Final Preview and Confirm" description="Check customer, design, measurement, delivery, and payment details before confirming." />
      <section className="rounded-lg border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-950">Customer</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <SummaryLine label="Name" value={customerDraft.name || selectedCustomer?.name || 'Not set'} />
          <SummaryLine label="Mobile" value={customerDraft.phone || 'Not set'} />
          <SummaryLine label="Address" value={customerDraft.address || 'Not set'} />
          <SummaryLine label="Customer code" value={selectedCustomer?.customer_code ?? 'New customer'} />
        </div>
      </section>

      <section className="space-y-4">
        {values.items.map((item, index) => {
          const garment = garments.find((entry) => entry.id === item.garmentTypeId);
          const design = designs.find((entry) => entry.id === item.designId) ?? null;
          const measurement = measurements.find((entry) => entry.id === item.measurementSetId);
          const measurementValues = measurementValuesForItem(item, measurements);
          const fabricReferenceUrl = item.fabricReferenceUrl || null;
          const previewSummary = buildPreviewSummary({
            garmentName: garment?.name ?? 'Garment',
            design,
            item: { ...item, fabricReferenceUrl: fabricReferenceUrl ?? '' },
            measurementValues,
          });

          return (
            <article key={item.id} className="space-y-3 rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-slate-950">Item {index + 1}: {garment?.name ?? 'No garment selected'}</h3>
                  <p className="mt-1 text-sm text-slate-600">Quantity {item.quantity} x {formatCurrency(item.unitPrice)} = {formatCurrency(lineTotal(item))}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">{item.measurementMode === 'new' ? 'New measurement' : 'Previous measurement'}</span>
              </div>
              <GarmentPreviewCard
                title="Estimated garment preview"
                garmentName={garment?.name ?? 'Garment'}
                designName={design?.design_name}
                styleCategory={design?.style_category}
                previewImageUrl={design?.preview_image_url}
                fabricReferenceUrl={fabricReferenceUrl}
                previewVideoUrl={design?.preview_video_url ?? item.previewVideoUrl}
                measurementValues={measurementValues}
                styleValues={item.styleValues}
                previewSummary={previewSummary}
                compact
              />
              {item.measurementMode === 'new' ? <Snapshot title="Measurement values" values={item.measurementValues} /> : null}
              {item.measurementMode === 'previous' ? <Snapshot title={`Measurement ${measurement ? `Version ${measurement.version_number}` : ''}`} values={measurement ? jsonObject(measurement.values) : {}} /> : null}
              <Snapshot title="Style choices" values={item.styleValues} />
              <Snapshot title="Preview summary" values={previewSummary} />
              {item.specialInstructions ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{item.specialInstructions}</p> : null}
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
