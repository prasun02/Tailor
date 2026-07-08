import { CheckCircle2, Copy, Ruler, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { DynamicField } from '../features/measurements/components/DynamicField';
import { displayDynamicValue } from '../features/measurements/components/display';
import { normalizeDynamicValueMap, validateMeasurementValues, type DynamicValueMap } from '../features/measurements/dynamicValidation';
import {
  useActiveMeasurementFields,
  useCreateMeasurementVersion,
  useLatestMeasurementForGarment,
  useMeasurementValuesForCopy,
  useNewMeasurementContext,
} from '../features/measurements/measurementHooks';
import { useShop } from '../features/shop/shopContext';
import { canCreateMeasurements } from '../utils/authorization';
import type { MeasurementUnit } from '../types/database';

export function NewCustomerMeasurementPage() {
  const navigate = useNavigate();
  const { customerId } = useParams();
  const [searchParams] = useSearchParams();
  const { currentRole, currentShopId } = useShop();
  const initialGarmentTypeId = searchParams.get('garmentTypeId') ?? '';
  const copyFromId = searchParams.get('copyFrom');
  const [garmentTypeId, setGarmentTypeId] = useState(initialGarmentTypeId);
  const [unit, setUnit] = useState<MeasurementUnit>('inch');
  const [values, setValues] = useState<DynamicValueMap>({});
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contextQuery = useNewMeasurementContext(currentShopId, customerId);
  const fieldsQuery = useActiveMeasurementFields(currentShopId, garmentTypeId || undefined);
  const latestQuery = useLatestMeasurementForGarment(currentShopId, customerId, garmentTypeId || undefined);
  const copyQuery = useMeasurementValuesForCopy(currentShopId, customerId, copyFromId);
  const createMeasurement = useCreateMeasurementVersion(currentShopId ?? '', customerId ?? '');
  const canCreate = canCreateMeasurements(currentRole);
  const fields = fieldsQuery.data ?? [];
  const latestValues = useMemo(() => normalizeDynamicValueMap(latestQuery.data?.values), [latestQuery.data]);

  if (!canCreate) {
    return <EmptyState icon={ShieldAlert} title="Measurements are restricted" message="Only owners, managers, staff, cutters, and tailors can create measurement versions." />;
  }

  if (contextQuery.isLoading) {
    return <Loading label="Loading measurement form" />;
  }

  if (contextQuery.isError || !contextQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Could not load customer" message={contextQuery.error?.message ?? 'Customer context could not be loaded.'} />;
  }

  async function submitMeasurement() {
    const result = validateMeasurementValues(fields, values);
    setErrors(result.errors);

    if (Object.keys(result.errors).length > 0 || !garmentTypeId) {
      return;
    }

    const measurement = await createMeasurement.mutateAsync({ garmentTypeId, unit, values: result.values, notes });
    navigate(`/customers/${customerId}/measurements/${measurement.id}?created=1`);
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Ruler aria-hidden="true" className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold text-slate-950">New measurement for {contextQuery.data.customer.name}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Select a garment, optionally copy previous values, then save a new immutable version.</p>
      </header>

      <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Garment type</span>
            <select value={garmentTypeId} onChange={(event) => { setGarmentTypeId(event.target.value); setValues({}); setErrors({}); }} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
              <option value="">Select garment</option>
              {contextQuery.data.garments.map((garment) => <option key={garment.id} value={garment.id}>{garment.name} ({garment.code})</option>)}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Unit</span>
            <select value={unit} onChange={(event) => setUnit(event.target.value as MeasurementUnit)} className="min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
              <option value="inch">inch</option>
              <option value="cm">cm</option>
            </select>
          </label>
        </div>

        {copyQuery.data && copyFromId ? (
          <CopyPanel
            title="Copy selected previous version"
            values={copyQuery.data}
            onCopy={() => setValues(normalizeDynamicValueMap(copyQuery.data))}
          />
        ) : null}

        {Object.keys(latestValues).length > 0 ? (
          <CopyPanel
            title="Copy current measurement"
            values={latestValues}
            onCopy={() => setValues(latestValues)}
          />
        ) : null}

        {fieldsQuery.isLoading ? <Loading label="Loading fields" /> : null}
        {garmentTypeId && fields.length === 0 && !fieldsQuery.isLoading ? <EmptyState icon={Ruler} title="No active measurement fields" message="Configure measurement fields for this garment before creating detailed measurements." /> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => (
            <DynamicField
              key={field.id}
              id={field.field_key}
              label={field.label}
              labelBn={field.label_bn}
              type={field.field_type}
              value={values[field.field_key]}
              required={field.is_required}
              unitLabel={field.unit ?? unit}
              placeholder={field.placeholder}
              helpText={field.help_text}
              minimum={field.minimum_value}
              maximum={field.maximum_value}
              step={field.step_value}
              error={errors[field.field_key]}
              onChange={(value) => setValues((currentValues) => ({ ...currentValues, [field.field_key]: value }))}
            />
          ))}
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100" />
        </label>

        {createMeasurement.error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{createMeasurement.error.message}</p> : null}
        <button type="button" disabled={!garmentTypeId || createMeasurement.isPending} onClick={() => void submitMeasurement()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60">
          <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          Save measurement version
        </button>
      </section>
    </div>
  );
}

function CopyPanel({ title, values, onCopy }: { title: string; values: DynamicValueMap; onCopy: () => void }) {
  const previewEntries = Object.entries(values).slice(0, 4);

  return (
    <div className="rounded-lg border border-brand-200 bg-brand-50 p-3 text-sm text-brand-950">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-brand-800">
            {previewEntries.length > 0
              ? previewEntries.map(([key, value]) => (
                  <span key={key}>
                    {key}: {displayDynamicValue(value)}
                  </span>
                ))
              : 'No stored values'}
          </p>
        </div>
        <button type="button" onClick={onCopy} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-white px-3 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-100">
          <Copy aria-hidden="true" className="h-4 w-4" />
          Copy values
        </button>
      </div>
    </div>
  );
}
