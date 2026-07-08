import { Ruler, ShieldAlert, Shirt, SlidersHorizontal } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { useGarmentType, useMeasurementFields, useStyleFields } from '../features/measurements/configurationHooks';
import { useShop } from '../features/shop/shopContext';
import { formatDateTime } from '../utils/format';

export function GarmentDetailPage() {
  const { garmentTypeId } = useParams();
  const { currentShopId } = useShop();
  const garmentQuery = useGarmentType(currentShopId, garmentTypeId);
  const measurementFieldsQuery = useMeasurementFields(currentShopId, garmentTypeId, true);
  const styleFieldsQuery = useStyleFields(currentShopId, garmentTypeId, true);

  if (garmentQuery.isLoading) {
    return <Loading label="Loading garment" />;
  }

  if (garmentQuery.isError || !garmentQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Garment not found" message={garmentQuery.error?.message ?? 'This garment could not be loaded.'} />;
  }

  const garment = garmentQuery.data;

  return (
    <div className="space-y-5">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Shirt aria-hidden="true" className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-950">{garment.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{garment.code} - sort order {garment.sort_order}</p>
            <p className="mt-2 text-sm text-slate-600">Updated {formatDateTime(garment.updated_at)}</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950"><Ruler aria-hidden="true" className="h-5 w-5" /> Measurement fields</h2>
            <Link to="/settings/measurement-fields" className="text-sm font-semibold text-brand-700 underline">Manage</Link>
          </div>
          <FieldSummary labels={measurementFieldsQuery.data?.map((field) => `${field.label} (${field.field_key})`) ?? []} />
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950"><SlidersHorizontal aria-hidden="true" className="h-5 w-5" /> Style fields</h2>
            <Link to="/settings/style-fields" className="text-sm font-semibold text-brand-700 underline">Manage</Link>
          </div>
          <FieldSummary labels={styleFieldsQuery.data?.map((field) => `${field.label} (${field.field_key})`) ?? []} />
        </section>
      </div>
    </div>
  );
}

function FieldSummary({ labels }: { labels: string[] }) {
  if (labels.length === 0) {
    return <p className="mt-4 text-sm text-slate-500">No fields configured yet.</p>;
  }

  return (
    <ul className="mt-4 space-y-2 text-sm text-slate-700">
      {labels.map((label) => (
        <li key={label} className="rounded-lg bg-slate-50 px-3 py-2">{label}</li>
      ))}
    </ul>
  );
}
