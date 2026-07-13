import { Ruler } from 'lucide-react';
import type { PreviewMetadata } from './previewUtils';

export function FitSummary({ metadata }: { metadata: PreviewMetadata }) {
  return (
    <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-brand-700 ring-1 ring-brand-200">
          <Ruler aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-brand-900">Estimated fit</p>
          <p className="mt-1 text-lg font-semibold text-slate-950">{metadata.estimatedFit}</p>
          <p className="mt-1 text-sm leading-6 text-slate-700">
            Based on {metadata.measurementCount} measurement{metadata.measurementCount === 1 ? '' : 's'} and {metadata.styleCount} style choice{metadata.styleCount === 1 ? '' : 's'}.
          </p>
        </div>
      </div>
    </section>
  );
}