import { Copy, Printer, Ruler, ShieldAlert } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { displayDynamicValue, jsonObject, measurementFieldLabel } from '../features/measurements/components/display';
import { formatMeasurementVersion } from '../features/measurements/dynamicValidation';
import { formatMeasuredBy } from '../features/measurements/measurementDisplay';
import { useMeasurementDetail } from '../features/measurements/measurementHooks';
import { useShop } from '../features/shop/shopContext';
import { formatDateTime } from '../utils/format';

export function CustomerMeasurementDetailPage() {
  const { customerId, measurementId } = useParams();
  const { currentShopId } = useShop();
  const measurementQuery = useMeasurementDetail(currentShopId, customerId, measurementId);

  if (measurementQuery.isLoading) return <Loading label="Loading measurement" />;
  if (measurementQuery.isError || !measurementQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Measurement not found" message={measurementQuery.error?.message ?? 'This measurement could not be loaded.'} />;
  }

  const { customer, garment, fields, measurement, versionHistory } = measurementQuery.data;
  const values = jsonObject(measurement.values);

  return (
    <div className="space-y-5 print:bg-white">
      <header className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700 print:hidden"><Ruler aria-hidden="true" className="h-6 w-6" /></div>
            <h1 className="text-2xl font-semibold text-slate-950">{customer.name} - {garment.name}</h1>
            <p className="mt-1 text-sm text-slate-600">{formatMeasurementVersion(measurement.version_number)} {measurement.is_current ? '- Current' : '- Historical'}</p>
            <p className="mt-1 text-sm text-slate-600">Measured {formatDateTime(measurement.measured_at)} by {formatMeasuredBy(measurement.measured_by)}</p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Printer aria-hidden="true" className="h-4 w-4" />Print</button>
            <Link to={`/customers/${customerId}/measurements/new?garmentTypeId=${garment.id}&copyFrom=${measurement.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white hover:bg-brand-700"><Copy aria-hidden="true" className="h-4 w-4" />Copy as new</Link>
          </div>
        </div>
      </header>
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-panel print:border-0 print:p-0 print:shadow-none">
        <h2 className="text-base font-semibold text-slate-950">Measurement values</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.id} className="break-inside-avoid rounded-lg border border-slate-200 bg-slate-50 p-3">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{measurementFieldLabel(field)}</dt>
              <dd className="mt-1 text-base font-semibold text-slate-950">{displayDynamicValue(values[field.field_key])}{field.unit ? <span className="ml-1 text-sm font-normal text-slate-500">{field.unit}</span> : null}</dd>
            </div>
          ))}
        </dl>
        {measurement.notes ? <p className="mt-5 whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">{measurement.notes}</p> : null}
      </section>
      <section className="no-print rounded-lg border border-slate-200 bg-white p-5 shadow-panel">
        <h2 className="text-base font-semibold text-slate-950">Version history</h2>
        <div className="mt-3 divide-y divide-slate-100">
          {versionHistory.map((version) => <Link key={version.id} to={`/customers/${customerId}/measurements/${version.id}`} className="flex justify-between gap-3 py-3 text-sm hover:bg-slate-50"><span className="font-semibold text-slate-900">{formatMeasurementVersion(version.version_number)} {version.is_current ? '(current)' : ''}</span><span className="text-slate-500">{formatDateTime(version.measured_at)}</span></Link>)}
        </div>
      </section>
    </div>
  );
}
