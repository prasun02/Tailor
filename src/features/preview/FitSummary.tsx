import { Ruler } from 'lucide-react';
import type { PreviewMetadata } from './previewUtils';

export function FitSummary({ metadata }: { metadata: PreviewMetadata }) {
  return (
    <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
          <Ruler aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-emerald-950">Estimated fit</p>
          <p className="mt-1 text-lg font-semibold text-emerald-900">{metadata.estimatedFit}</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            Based on {metadata.measurementCount} measurement{metadata.measurementCount === 1 ? '' : 's'} and {metadata.styleCount} style choice{metadata.styleCount === 1 ? '' : 's'}.
          </p>
        </div>
      </div>
    </section>
  );
}
