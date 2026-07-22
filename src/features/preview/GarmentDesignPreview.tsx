import { ImageOff } from 'lucide-react';
import { DesignSvgIcon } from '../design-selection/designIconRegistry';
import { designSelectionEntriesFromSnapshot, designSummaryFromSnapshot, garmentDesignFamilyFromName } from '../design-selection/designSelectionUtils';

type GarmentDesignPreviewProps = {
  garmentName: string;
  designSnapshot?: Record<string, unknown>;
  measurementValues: Record<string, unknown>;
  fabricReferenceUrl?: string | null;
  compact?: boolean;
};

export function GarmentDesignPreview({
  garmentName,
  designSnapshot,
  measurementValues,
  fabricReferenceUrl,
  compact = false,
}: GarmentDesignPreviewProps) {
  const designEntries = designSelectionEntriesFromSnapshot(designSnapshot);
  const summary = designSummaryFromSnapshot(designSnapshot);
  const focusEntries = prioritizedPreviewEntries(garmentName, designEntries);
  const keyMeasurements = Object.entries(measurementValues)
    .filter(([, value]) => value !== null && value !== undefined && value !== '' && typeof value !== 'object')
    .slice(0, 8);
  const iconOptions = selectedIconOptions(designSnapshot).slice(0, compact ? 4 : 6);
  const estimatedFit = fitFromEntries(designEntries) ?? 'Regular fit';
  const visualNotes = buildVisualNotes({ garmentName, focusEntries, hasFabric: Boolean(fabricReferenceUrl?.trim()), estimatedFit });

  if (compact) {
    return (
      <article className="rounded-md border border-slate-200 bg-white p-3">
        <div className="grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <div className="grid grid-cols-2 gap-1.5">
            {iconOptions.length > 0 ? iconOptions.map((option) => (
              <div key={`${option.categoryKey}-${option.optionName}`} className="rounded border border-slate-200 bg-[#fffdf7] p-1 text-center">
                <div className="mx-auto h-10 max-w-14">
                  <DesignSvgIcon svgIconKey={option.svgIconKey} label={option.optionName} />
                </div>
                <p className="mt-1 truncate text-[0.65rem] font-semibold text-slate-700">{option.optionName}</p>
              </div>
            )) : (
              <div className="col-span-full flex h-24 items-center justify-center rounded border border-dashed border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500">
                No design details
              </div>
            )}
          </div>
          <div className="min-w-0 space-y-2 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">{garmentName}</p>
              <p className="mt-0.5 line-clamp-2 font-semibold text-slate-950">{summary}</p>
            </div>
            <dl className="grid gap-1.5 sm:grid-cols-2">
              {focusEntries.slice(0, 6).map((entry) => (
                <div key={entry.key} className="rounded bg-slate-50 px-2 py-1">
                  <dt className="text-[0.64rem] font-semibold uppercase text-slate-500">{entry.label}</dt>
                  <dd className="truncate text-xs font-semibold text-slate-950">{entry.value}</dd>
                </div>
              ))}
              {keyMeasurements.slice(0, 4).map(([key, value]) => (
                <div key={key} className="rounded bg-slate-50 px-2 py-1">
                  <dt className="text-[0.64rem] font-semibold uppercase text-slate-500">{labelFromKey(key)}</dt>
                  <dd className="truncate text-xs font-semibold text-slate-950">{displayValue(value)}</dd>
                </div>
              ))}
            </dl>
            <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
              {estimatedFit}. {fabricReferenceUrl ? 'Fabric reference added.' : 'Fabric reference skipped.'}
            </p>
          </div>
        </div>
      </article>
    );
  }
  return (
    <article className="rounded-lg border border-brand-200 bg-white shadow-panel">
      <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-lg border border-slate-200 bg-[#fffdf7] p-4">
          <p className="text-xs font-semibold uppercase text-slate-600">Estimated visual preview</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-950">{garmentName}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-700">{summary}</p>

          <div className="mt-4 grid min-h-36 grid-cols-2 gap-2 sm:grid-cols-3">
            {iconOptions.length > 0 ? iconOptions.map((option) => (
              <div key={`${option.categoryKey}-${option.optionName}`} className="rounded-md border border-slate-200 bg-white p-2 text-center">
                <div className="mx-auto h-16 max-w-20">
                  <DesignSvgIcon svgIconKey={option.svgIconKey} label={option.optionName} />
                </div>
                <p className="mt-1 truncate text-xs font-semibold text-slate-700">{option.optionName}</p>
              </div>
            )) : (
              <div className="col-span-full flex min-h-32 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-sm font-semibold text-slate-500">
                <ImageOff aria-hidden="true" className="mb-2 h-6 w-6 text-slate-400" />
                No selected design details
              </div>
            )}
          </div>

          <section className="mt-4 rounded-md border border-slate-200 bg-white p-3">
            <h4 className="text-sm font-semibold text-slate-950">Fabric reference</h4>
            {fabricReferenceUrl ? (
              <img src={fabricReferenceUrl} alt="Fabric reference" className="mt-3 h-28 w-full rounded-md border border-slate-200 object-cover" loading="lazy" />
            ) : (
              <div className="mt-3 flex h-20 items-center justify-center rounded-md border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">Skipped</div>
            )}
          </section>
        </div>

        <div className="space-y-3">
          <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
            <h4 className="text-sm font-semibold text-slate-950">Selected style/design summary</h4>
            {focusEntries.length > 0 ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {focusEntries.map((entry) => (
                  <div key={entry.key} className="rounded-md bg-white px-3 py-2 shadow-sm">
                    <dt className="text-xs font-semibold uppercase text-slate-500">{entry.label}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">No visual categories selected.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-950">Key measurements</h4>
            {keyMeasurements.length > 0 ? (
              <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                {keyMeasurements.map(([key, value]) => (
                  <div key={key} className="rounded-md bg-slate-50 px-3 py-2">
                    <dt className="text-xs font-semibold uppercase text-slate-500">{labelFromKey(key)}</dt>
                    <dd className="mt-1 text-sm font-semibold text-slate-950">{displayValue(value)}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Measurements are not entered yet.</p>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-slate-950">Visual notes</h4>
            <ul className="mt-3 grid gap-2 text-sm text-slate-700">
              {visualNotes.map((note) => <li key={note} className="rounded-md bg-slate-50 px-3 py-2 font-medium">{note}</li>)}
            </ul>
          </section>

          <div className="rounded-md border border-accent-100 bg-accent-50 p-3 text-sm font-semibold text-brand-900">
            Estimated fit: {estimatedFit}. Estimated visual preview. Final fitting depends on tailoring and fabric behavior.
          </div>
        </div>
      </div>
    </article>
  );
}

function prioritizedPreviewEntries(garmentName: string, entries: Array<{ key: string; label: string; value: string }>) {
  const family = garmentDesignFamilyFromName(garmentName);
  const priority: Record<string, string[]> = {
    shirt: ['collar_type', 'cuff_type', 'sleeve_type', 'pocket_type', 'placket_style', 'back_pleat', 'fit_type'],
    suit: ['lapel_design', 'jacket_pocket', 'chest_pocket', 'buttoning_style', 'vent_style', 'trouser_front', 'trouser_waist', 'trouser_bottom', 'fit_type'],
    pant: ['front_style', 'waistband_style', 'front_pocket', 'back_pocket', 'fly_type', 'bottom_opening_cuff', 'crease_style', 'fit_type'],
    panjabi: ['collar_type', 'placket_style', 'button_style', 'sleeve_cuff_style', 'side_pocket', 'chest_pocket', 'embroidery_detailing', 'hem_bottom', 'fit_type'],
    generic: ['fit_type', 'pocket_style', 'special_detailing'],
  };
  const order = priority[family] ?? priority.generic;

  return [...entries].sort((left, right) => {
    const leftIndex = order.indexOf(left.key);
    const rightIndex = order.indexOf(right.key);
    const leftRank = leftIndex >= 0 ? leftIndex : order.length;
    const rightRank = rightIndex >= 0 ? rightIndex : order.length;
    return leftRank - rightRank;
  }).slice(0, 10);
}

function buildVisualNotes({ garmentName, focusEntries, hasFabric, estimatedFit }: { garmentName: string; focusEntries: Array<{ label: string; value: string }>; hasFabric: boolean; estimatedFit: string }): string[] {
  const notes = new Set<string>([estimatedFit]);
  focusEntries.slice(0, 4).forEach((entry) => notes.add(`${entry.label}: ${entry.value}`));
  notes.add(hasFabric ? 'Customer fabric reference added' : 'Fabric reference skipped');
  notes.add(`${garmentName} design choices saved as an order snapshot`);
  return Array.from(notes).slice(0, 6);
}

function fitFromEntries(entries: Array<{ key: string; label: string; value: string }>): string | null {
  const fit = entries.find((entry) => /fit/i.test(entry.key) || /fit/i.test(entry.label));
  if (!fit?.value) return null;
  return /fit/i.test(fit.value) ? fit.value : `${fit.value} fit`;
}

function selectedIconOptions(snapshot: unknown): Array<{ categoryKey: string; optionName: string; svgIconKey: string }> {
  const record = recordFromUnknown(snapshot);
  const categories = Array.isArray(record.categories) ? record.categories : [];

  return categories.flatMap((category) => {
    const categoryRecord = recordFromUnknown(category);
    const categoryKey = stringValue(categoryRecord.categoryKey) || stringValue(categoryRecord.category_key);
    const selectedOptions = Array.isArray(categoryRecord.selectedOptions) ? categoryRecord.selectedOptions : [];

    return selectedOptions.flatMap((option) => {
      const optionRecord = recordFromUnknown(option);
      const optionName = stringValue(optionRecord.optionName) || stringValue(optionRecord.option_name);
      const svgIconKey = stringValue(optionRecord.svgIconKey) || stringValue(optionRecord.svg_icon_key);

      if (!categoryKey || !optionName || !svgIconKey) {
        return [];
      }

      return [{ categoryKey, optionName, svgIconKey }];
    });
  });
}

function displayValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'object') return '';
  return String(value);
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}


