import { CheckCircle2, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';
import { designSelectionEntriesFromSnapshot, designSummaryFromSnapshot } from './designSelectionUtils';

type SelectedDesignSummaryProps = {
  designSnapshot?: Record<string, unknown>;
  title?: string;
  compact?: boolean;
};

export function SelectedDesignSummary({
  designSnapshot,
  title,
  compact = false,
}: SelectedDesignSummaryProps) {
  const entries = designSelectionEntriesFromSnapshot(designSnapshot);
  const summary = designSummaryFromSnapshot(designSnapshot);
  const heading = title ?? selectedDesignTitle(designSnapshot);

  if (entries.length === 0) {
    return (
      <section className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden="true" className="h-4 w-4 text-amber-700" />
          <h3 className="text-sm font-semibold text-amber-950">{heading}</h3>
        </div>
        <p className="mt-1 text-sm text-amber-900">No visual design details selected yet.</p>
      </section>
    );
  }

  return (
    <section className={cn('rounded-lg border border-brand-200 bg-brand-50 p-4 shadow-sm', compact ? 'p-3' : null)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-brand-700" />
            <h3 className="text-sm font-semibold text-brand-950">{heading}</h3>
          </div>
          <p className="mt-1 text-sm leading-6 text-brand-900">{summary}</p>
        </div>
        <span className="inline-flex min-h-8 items-center rounded-full bg-white px-3 text-xs font-semibold text-brand-700">
          {entries.length} categor{entries.length === 1 ? 'y' : 'ies'} selected
        </span>
      </div>

      {compact ? null : (
        <dl className="mt-3 flex flex-wrap gap-2">
          {entries.map((entry) => (
            <div key={entry.key} className="min-w-0 rounded-full border border-brand-200 bg-white px-3 py-1.5 shadow-sm">
              <dt className="inline text-xs font-semibold uppercase text-slate-500">{entry.label}: </dt>
              <dd className="inline break-words text-sm font-semibold text-slate-950">{entry.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function selectedDesignTitle(snapshot: Record<string, unknown> | undefined): string {
  const garmentType = typeof snapshot?.garmentType === 'string' ? snapshot.garmentType.trim() : '';
  return garmentType ? `Selected ${garmentType} Design` : 'Selected Design Details';
}
