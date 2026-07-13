import type { PreviewMeasurement } from './previewUtils';

export function MeasurementBadges({ measurements, compact = false }: { measurements: PreviewMeasurement[]; compact?: boolean }) {
  if (measurements.length === 0) {
    return <p className="text-sm text-slate-500">No measurements selected yet.</p>;
  }

  return (
    <dl className={compact ? 'grid gap-2' : 'grid gap-2 sm:grid-cols-2'}>
      {measurements.map((measurement) => (
        <div key={`${measurement.key}-${measurement.label}`} className="min-w-0 rounded-lg border border-brand-200 bg-white px-3 py-2 shadow-sm">
          <dt className="truncate text-xs font-semibold uppercase text-slate-500">{measurement.label}</dt>
          <dd className="mt-1 break-words text-sm font-semibold text-slate-950">{measurement.value}</dd>
        </div>
      ))}
    </dl>
  );
}