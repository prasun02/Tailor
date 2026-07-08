import { Archive, RotateCcw, ShieldAlert, Shirt } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { GarmentForm } from '../features/measurements/components/ConfigurationForms';
import { garmentToFormValues } from '../features/measurements/configurationFormMappers';
import {
  useArchiveGarmentType,
  useCreateGarmentType,
  useGarmentTypes,
  useRestoreGarmentType,
  useUpdateGarmentType,
} from '../features/measurements/configurationHooks';
import type { GarmentFormValues } from '../features/measurements/configurationSchemas';
import type { GarmentType } from '../features/measurements/types';
import { useShop } from '../features/shop/shopContext';
import { canManageConfiguration } from '../utils/authorization';
import { cn } from '../utils/cn';

export function GarmentSettingsPage() {
  const { currentRole, currentShopId } = useShop();
  const [includeArchived, setIncludeArchived] = useState(false);
  const [editing, setEditing] = useState<GarmentType | null>(null);
  const canManage = canManageConfiguration(currentRole);
  const garmentsQuery = useGarmentTypes(currentShopId, includeArchived);
  const createGarment = useCreateGarmentType(currentShopId ?? '');
  const updateGarment = useUpdateGarmentType(currentShopId ?? '', editing?.id ?? '');
  const archiveGarment = useArchiveGarmentType(currentShopId ?? '');
  const restoreGarment = useRestoreGarmentType(currentShopId ?? '');

  if (!canManage) {
    return <EmptyState icon={ShieldAlert} title="Settings are restricted" message="Only owners and managers can manage garment configuration." />;
  }

  async function submitGarment(values: GarmentFormValues) {
    if (editing) {
      await updateGarment.mutateAsync(values);
      setEditing(null);
      return;
    }

    await createGarment.mutateAsync(values);
  }

  return (
    <div className="space-y-5">
      <header>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
          <Shirt aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Garment types</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Create garments and control the order they appear in measurement and order workflows.</p>
      </header>

      <GarmentForm
        key={editing?.id ?? 'new'}
        initialValues={editing ? garmentToFormValues(editing) : undefined}
        submitLabel={editing ? 'Save garment' : 'Create garment'}
        isSubmitting={createGarment.isPending || updateGarment.isPending}
        error={createGarment.error?.message ?? updateGarment.error?.message}
        onSubmit={(values) => void submitGarment(values)}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-slate-950">Configured garments</h2>
          <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            Show archived
          </label>
        </div>

        {garmentsQuery.isLoading ? <Loading label="Loading garments" /> : null}
        {garmentsQuery.isError ? <EmptyState icon={ShieldAlert} title="Could not load garments" message={garmentsQuery.error.message} /> : null}
        {garmentsQuery.data?.length === 0 ? <EmptyState icon={Shirt} title="No garments configured" message="Create the first garment type to start configuring measurements." /> : null}

        <div className="grid gap-3">
          {garmentsQuery.data?.map((garment) => (
            <div key={garment.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link to={`/settings/garments/${garment.id}`} className="font-semibold text-slate-950 hover:text-brand-700">
                      {garment.name}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{garment.code}</span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', garment.deleted_at || !garment.is_active ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-700')}>
                      {garment.deleted_at || !garment.is_active ? 'Archived' : 'Active'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">Sort order {garment.sort_order}</p>
                  {garment.description ? <p className="mt-2 text-sm text-slate-600">{garment.description}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditing(garment)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                    Edit
                  </button>
                  {garment.deleted_at || !garment.is_active ? (
                    <button type="button" onClick={() => void restoreGarment.mutateAsync(garment.id)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      Restore
                    </button>
                  ) : (
                    <button type="button" onClick={() => void archiveGarment.mutateAsync(garment.id)} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">
                      <Archive aria-hidden="true" className="h-4 w-4" />
                      Archive
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
