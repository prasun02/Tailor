import { Archive, RotateCcw, Ruler, ShieldAlert } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { MeasurementFieldForm } from '../features/measurements/components/ConfigurationForms';
import { measurementFieldToFormValues } from '../features/measurements/configurationFormMappers';
import {
  useArchiveMeasurementField,
  useCreateMeasurementField,
  useGarmentTypes,
  useMeasurementFields,
  useRestoreMeasurementField,
  useUpdateMeasurementField,
} from '../features/measurements/configurationHooks';
import type { MeasurementFieldFormValues } from '../features/measurements/configurationSchemas';
import type { MeasurementField } from '../features/measurements/types';
import { useShop } from '../features/shop/shopContext';
import { canManageConfiguration } from '../utils/authorization';
import { cn } from '../utils/cn';

export function MeasurementFieldsSettingsPage() {
  const { currentRole, currentShopId } = useShop();
  const canManage = canManageConfiguration(currentRole);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [garmentTypeId, setGarmentTypeId] = useState<string | undefined>();
  const [editing, setEditing] = useState<MeasurementField | null>(null);
  const garmentsQuery = useGarmentTypes(currentShopId, false);
  const fieldsQuery = useMeasurementFields(currentShopId, garmentTypeId, includeArchived);
  const createField = useCreateMeasurementField(currentShopId ?? '');
  const updateField = useUpdateMeasurementField(currentShopId ?? '', editing?.id ?? '');
  const archiveField = useArchiveMeasurementField(currentShopId ?? '');
  const restoreField = useRestoreMeasurementField(currentShopId ?? '');
  const garments = garmentsQuery.data ?? [];

  if (!canManage) {
    return <EmptyState icon={ShieldAlert} title="Settings are restricted" message="Only owners and managers can manage measurement fields." />;
  }

  async function submitField(values: MeasurementFieldFormValues) {
    if (editing) {
      await updateField.mutateAsync(values);
      setEditing(null);
      return;
    }

    await createField.mutateAsync(values);
  }

  return (
    <FieldSettingsLayout icon={Ruler} title="Measurement fields" description="Configure body measurement fields. Field keys are locked after creation to protect historical measurement versions.">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
        <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <select value={garmentTypeId ?? ''} onChange={(event) => setGarmentTypeId(event.target.value || undefined)} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
              <option value="">All garments</option>
              {garments.map((garment) => <option key={garment.id} value={garment.id}>{garment.name}</option>)}
            </select>
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
              Show archived
            </label>
          </div>
          {fieldsQuery.isLoading ? <Loading label="Loading measurement fields" /> : null}
          {fieldsQuery.isError ? <EmptyState icon={ShieldAlert} title="Could not load fields" message={fieldsQuery.error.message} /> : null}
          {fieldsQuery.data?.map((field) => (
            <FieldRow
              key={field.id}
              label={field.label}
              fieldKey={field.field_key}
              meta={`${field.field_type}${field.unit ? ` - ${field.unit}` : ''} - sort ${field.sort_order}`}
              archived={Boolean(field.deleted_at || !field.is_active)}
              onEdit={() => setEditing(field)}
              onArchive={() => void archiveField.mutateAsync(field.id)}
              onRestore={() => void restoreField.mutateAsync(field.id)}
            />
          ))}
          {fieldsQuery.data?.length === 0 ? <EmptyState icon={Ruler} title="No fields configured" message="Add measurement fields for this shop's garments." /> : null}
        </section>
        <MeasurementFieldForm
          key={editing?.id ?? 'new'}
          garments={garments}
          initialValues={editing ? measurementFieldToFormValues(editing) : undefined}
          submitLabel={editing ? 'Save field' : 'Add measurement field'}
          isEditing={Boolean(editing)}
          isSubmitting={createField.isPending || updateField.isPending}
          error={createField.error?.message ?? updateField.error?.message}
          onSubmit={(values) => void submitField(values)}
        />
      </div>
    </FieldSettingsLayout>
  );
}

function FieldSettingsLayout({ icon: Icon, title, description, children }: { icon: typeof Ruler; title: string; description: string; children: ReactNode }) {
  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Icon aria-hidden="true" className="h-6 w-6" /></div>
        <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
      </header>
      {children}
    </div>
  );
}

function FieldRow({ label, fieldKey, meta, archived, onEdit, onArchive, onRestore }: { label: string; fieldKey: string; meta: string; archived: boolean; onEdit: () => void; onArchive: () => void; onRestore: () => void }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-950">{label}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{fieldKey}</span>
            <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', archived ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-700')}>{archived ? 'Archived' : 'Active'}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">{meta}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onEdit} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Edit</button>
          {archived ? (
            <button type="button" onClick={onRestore} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"><RotateCcw aria-hidden="true" className="h-4 w-4" />Restore</button>
          ) : (
            <button type="button" onClick={onArchive} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"><Archive aria-hidden="true" className="h-4 w-4" />Archive</button>
          )}
        </div>
      </div>
    </div>
  );
}

