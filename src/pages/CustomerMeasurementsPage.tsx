import { ArrowLeftRight, Plus, Printer, Ruler, ShieldAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../components/ui/EmptyState';
import { Loading } from '../components/ui/Loading';
import { displayDynamicValue, jsonObject } from '../features/measurements/components/display';
import { formatMeasurementVersion } from '../features/measurements/dynamicValidation';
import { formatMeasuredBy, sortedValueKeys } from '../features/measurements/measurementDisplay';
import { useCustomerMeasurementContext } from '../features/measurements/measurementHooks';
import type { MeasurementSetWithGarment } from '../features/measurements/types';
import { useShop } from '../features/shop/shopContext';
import { formatDateTime } from '../utils/format';

const EMPTY_MEASUREMENTS: MeasurementSetWithGarment[] = [];

export function CustomerMeasurementsPage() {
  const { customerId } = useParams();
  const { currentShopId } = useShop();
  const measurementsQuery = useCustomerMeasurementContext(currentShopId, customerId);
  const measurements = measurementsQuery.data?.measurements ?? EMPTY_MEASUREMENTS;
  const [leftId, setLeftId] = useState('');
  const [rightId, setRightId] = useState('');
  const groupedMeasurements = useMemo(() => groupMeasurements(measurements), [measurements]);
  const left = measurements.find((measurement) => measurement.id === leftId) ?? null;
  const right = measurements.find((measurement) => measurement.id === rightId) ?? null;

  if (measurementsQuery.isLoading) {
    return <Loading label="Loading measurement history" />;
  }

  if (measurementsQuery.isError || !measurementsQuery.data) {
    return <EmptyState icon={ShieldAlert} title="Could not load measurements" message={measurementsQuery.error?.message ?? 'Measurement history could not be loaded.'} />;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700"><Ruler aria-hidden="true" className="h-6 w-6" /></div>
          <h1 className="text-2xl font-semibold text-slate-950">Measurements for {measurementsQuery.data.customer.name}</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">View current measurements, version history, and compare previous versions.</p>
        </div>
        <Link to={`/customers/${customerId}/measurements/new`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus aria-hidden="true" className="h-4 w-4" />
          New measurement
        </Link>
      </header>

      {measurements.length === 0 ? (
        <EmptyState icon={Ruler} title="No measurement versions" message="Create the first measurement version for this customer." action={<Link className="font-semibold text-brand-700 underline" to={`/customers/${customerId}/measurements/new`}>Create measurement</Link>} />
      ) : null}

      <div className="space-y-4">
        {groupedMeasurements.map(([garmentName, group]) => (
          <section key={garmentName} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
            <h2 className="text-base font-semibold text-slate-950">{garmentName}</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {group.map((measurement) => (
                <div key={measurement.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/customers/${customerId}/measurements/${measurement.id}`} className="font-semibold text-slate-950 hover:text-brand-700">
                        {formatMeasurementVersion(measurement.version_number)}
                      </Link>
                      {measurement.is_current ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Current</span> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{measurement.unit} - {formatDateTime(measurement.measured_at)} - {formatMeasuredBy(measurement.measured_by)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/customers/${customerId}/measurements/new?copyFrom=${measurement.id}`} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Copy</Link>
                    <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"><Printer aria-hidden="true" className="h-4 w-4" />Print</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {measurements.length >= 2 ? (
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950"><ArrowLeftRight aria-hidden="true" className="h-5 w-5" /> Compare two versions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <VersionSelect label="Left version" value={leftId} measurements={measurements} onChange={setLeftId} />
            <VersionSelect label="Right version" value={rightId} measurements={measurements} onChange={setRightId} />
          </div>
          {left && right ? <ComparisonTable left={left} right={right} /> : <p className="mt-4 text-sm text-slate-500">Select two versions to compare values.</p>}
        </section>
      ) : null}
    </div>
  );
}

function groupMeasurements(measurements: MeasurementSetWithGarment[]): [string, MeasurementSetWithGarment[]][] {
  const groups = new Map<string, MeasurementSetWithGarment[]>();

  for (const measurement of measurements) {
    const key = `${measurement.garmentName} (${measurement.garmentCode})`;
    groups.set(key, [...(groups.get(key) ?? []), measurement]);
  }

  return Array.from(groups.entries());
}

function VersionSelect({ label, value, measurements, onChange }: { label: string; value: string; measurements: MeasurementSetWithGarment[]; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100">
        <option value="">Select version</option>
        {measurements.map((measurement) => (
          <option key={measurement.id} value={measurement.id}>{measurement.garmentName} - {formatMeasurementVersion(measurement.version_number)}</option>
        ))}
      </select>
    </label>
  );
}

function ComparisonTable({ left, right }: { left: MeasurementSetWithGarment; right: MeasurementSetWithGarment }) {
  const leftValues = jsonObject(left.values);
  const rightValues = jsonObject(right.values);
  const keys = sortedValueKeys(leftValues, rightValues);

  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
          <tr><th className="px-3 py-2">Field</th><th className="px-3 py-2">{formatMeasurementVersion(left.version_number)}</th><th className="px-3 py-2">{formatMeasurementVersion(right.version_number)}</th></tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {keys.map((key) => (
            <tr key={key}><td className="px-3 py-2 font-medium text-slate-700">{key}</td><td className="px-3 py-2 text-slate-600">{displayDynamicValue(leftValues[key])}</td><td className="px-3 py-2 text-slate-600">{displayDynamicValue(rightValues[key])}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

