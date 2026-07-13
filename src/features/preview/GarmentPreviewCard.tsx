import { ImageOff, Maximize2, PlayCircle, X } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '../../utils/cn';
import { FitSummary } from './FitSummary';
import { GarmentMockup } from './GarmentMockup';
import { MeasurementBadges } from './MeasurementBadges';
import { StyleBadges } from './StyleBadges';
import { buildPreviewMetadata, type PreviewRecord } from './previewUtils';

type GarmentPreviewCardProps = {
  title: string;
  garmentName: string;
  designName?: string | null;
  styleCategory?: string | null;
  previewImageUrl?: string | null;
  fabricReferenceUrl?: string | null;
  fabricLabel?: string;
  fabricSkippedText?: string;
  previewVideoUrl?: string | null;
  measurementValues: Record<string, unknown>;
  styleValues?: Record<string, unknown>;
  previewSummary?: Record<string, unknown>;
  compact?: boolean;
};

export function GarmentPreviewCard({
  title,
  garmentName,
  designName,
  styleCategory,
  previewImageUrl,
  fabricReferenceUrl,
  fabricLabel = 'Fabric / Cloth Reference',
  fabricSkippedText = 'Skipped',
  previewVideoUrl,
  measurementValues,
  styleValues = {},
  previewSummary = {},
  compact = false,
}: GarmentPreviewCardProps) {
  const [isBigPreviewOpen, setIsBigPreviewOpen] = useState(false);
  const metadata = buildPreviewMetadata({
    garmentName,
    designName,
    styleCategory,
    designImageUrl: previewImageUrl,
    fabricReferenceUrl,
    previewVideoUrl,
    measurementValues,
    styleValues,
    previewSummary: previewSummary as PreviewRecord,
  });

  return (
    <>
      <article className="overflow-hidden rounded-lg border border-brand-200 bg-white shadow-premium print:shadow-none">
        <div className={cn('grid', compact ? 'lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]' : 'xl:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]')}>
          <div className="bg-brand-900 p-4 text-white sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-accent-100">{title}</p>
                <h3 className="mt-1 text-2xl font-semibold text-white">{garmentName}</h3>
                <p className="mt-1 text-sm text-brand-100">
                  {metadata.selectedDesign}
                  {metadata.styleCategory ? ` - ${metadata.styleCategory}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBigPreviewOpen(true)}
                className="no-print inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                <Maximize2 aria-hidden="true" className="h-4 w-4" />
                Open Big Preview
              </button>
            </div>

            <div className={cn('mt-5 grid gap-4', compact ? 'sm:grid-cols-2' : 'lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]')}>
              <MediaPanel
                label="Selected Design"
                imageUrl={metadata.designImageUrl}
                emptyText="No selected design image"
                detail={metadata.selectedDesign}
                dark
              />
              <div className="rounded-lg border border-white/15 bg-white p-3 text-slate-950 shadow-panel">
                <h4 className="mb-2 text-sm font-semibold text-slate-950">Garment Mockup</h4>
                <GarmentMockup metadata={metadata} compact={compact} />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1fr)]">
              <MediaPanel
                label={fabricLabel}
                imageUrl={metadata.fabricReferenceUrl}
                emptyText={fabricSkippedText}
                detail={metadata.fabricReferenceUrl ?? metadata.fabricReferenceStatus}
                dark
                compactImage
              />
              {metadata.previewVideoUrl ? (
                <div className="rounded-lg border border-white/15 bg-white/10 p-3">
                  <div className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-white">
                    <PlayCircle aria-hidden="true" className="h-4 w-4 text-accent-100" />
                    Preview video
                  </div>
                  <video src={metadata.previewVideoUrl} controls preload="metadata" className="max-h-48 w-full rounded-lg border border-white/20 bg-slate-950" />
                </div>
              ) : (
                <div className="rounded-lg border border-white/15 bg-white/10 p-3 text-sm leading-6 text-brand-100">
                  Visual presentation is based on the selected design image, garment mockup, and customer fabric reference.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <p className="text-xs font-semibold uppercase text-brand-700">Garment presentation</p>
              <h4 className="mt-1 text-xl font-semibold text-slate-950">{garmentName}</h4>
              <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <PreviewFact label="Design" value={metadata.selectedDesign} />
                <PreviewFact label="Category" value={metadata.styleCategory ?? 'Custom'} />
                <PreviewFact label="Fabric" value={metadata.fabricReferenceStatus} />
                <PreviewFact label="Fit" value={metadata.estimatedFit} />
              </div>
            </section>

            <FitSummary metadata={metadata} />

            <section>
              <h4 className="text-sm font-semibold text-slate-950">Style summary</h4>
              <div className="mt-2">
                <StyleBadges styles={metadata.styleSummary} />
              </div>
            </section>

            <section>
              <h4 className="text-sm font-semibold text-slate-950">Key measurements</h4>
              <div className="mt-2">
                <MeasurementBadges measurements={metadata.keyMeasurements} compact={compact} />
              </div>
            </section>

            {metadata.visualNotes.length > 0 ? (
              <section>
                <h4 className="text-sm font-semibold text-slate-950">Preview notes</h4>
                <ul className="mt-2 grid gap-2 text-sm text-slate-700">
                  {metadata.visualNotes.map((note) => (
                    <li key={note} className="rounded-lg border border-brand-200 bg-white px-3 py-2">{note}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            <p className="rounded-lg border border-accent-100 bg-accent-50 p-3 text-sm font-semibold text-brand-900">
              {metadata.warning}
            </p>
          </div>
        </div>
      </article>

      {isBigPreviewOpen ? (
        <BigPreviewModal
          title={title}
          garmentName={garmentName}
          fabricLabel={fabricLabel}
          fabricSkippedText={fabricSkippedText}
          metadata={metadata}
          onClose={() => setIsBigPreviewOpen(false)}
        />
      ) : null}
    </>
  );
}

function PreviewFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-white px-3 py-2 shadow-sm">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function MediaPanel({
  label,
  imageUrl,
  emptyText,
  detail,
  dark = false,
  compactImage = false,
}: {
  label: string;
  imageUrl: string | null;
  emptyText: string;
  detail: string;
  dark?: boolean;
  compactImage?: boolean;
}) {
  return (
    <section className={cn('rounded-lg border p-3', dark ? 'border-white/15 bg-white/10' : 'border-brand-200 bg-brand-50')}>
      <h4 className={cn('text-sm font-semibold', dark ? 'text-white' : 'text-slate-950')}>{label}</h4>
      <div className="mt-2">
        <PreviewImage
          src={imageUrl}
          alt={label}
          className={cn(compactImage ? 'aspect-[5/3]' : 'aspect-[4/3]', 'w-full rounded-lg border bg-white', dark ? 'border-white/20' : 'border-brand-200')}
          emptyText={emptyText}
        />
      </div>
      <p className={cn('mt-2 break-all text-xs font-medium', dark ? 'text-brand-100' : 'text-slate-600')}>{detail}</p>
    </section>
  );
}

function PreviewImage({
  src,
  alt,
  className,
  emptyText,
}: {
  src?: string | null;
  alt: string;
  className: string;
  emptyText: string;
}) {
  const [isBroken, setIsBroken] = useState(false);

  if (src && !isBroken) {
    return <img src={src} alt={alt} className={cn(className, 'object-cover')} loading="lazy" onError={() => setIsBroken(true)} />;
  }

  return (
    <div aria-label={`${alt} unavailable`} className={cn(className, 'flex flex-col items-center justify-center gap-2 p-4 text-center text-sm font-semibold text-slate-500')}>
      <ImageOff aria-hidden="true" className="h-6 w-6 text-slate-400" />
      <span>{isBroken ? 'Image unavailable' : emptyText}</span>
    </div>
  );
}

function BigPreviewModal({
  title,
  garmentName,
  fabricLabel,
  fabricSkippedText,
  metadata,
  onClose,
}: {
  title: string;
  garmentName: string;
  fabricLabel: string;
  fabricSkippedText: string;
  metadata: ReturnType<typeof buildPreviewMetadata>;
  onClose: () => void;
}) {
  const headingId = useId();

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4" role="dialog" aria-modal="true" aria-labelledby={headingId}>
      <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-brand-200 bg-brand-900 p-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase text-accent-100">{title}</p>
            <h2 id={headingId} className="mt-1 text-xl font-semibold text-white">{garmentName} estimated preview</h2>
            <p className="mt-1 text-sm text-brand-100">{metadata.selectedDesign}{metadata.styleCategory ? ` - ${metadata.styleCategory}` : ''}</p>
          </div>
          <button type="button" onClick={onClose} title="Close big preview" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-brand-100 hover:bg-white/10">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <MediaPanel label="Selected Design" imageUrl={metadata.designImageUrl} emptyText="No selected design image" detail={metadata.selectedDesign} />
              <MediaPanel label={fabricLabel} imageUrl={metadata.fabricReferenceUrl} emptyText={fabricSkippedText} detail={metadata.fabricReferenceUrl ?? metadata.fabricReferenceStatus} />
            </div>
            <GarmentMockup metadata={metadata} />
          </div>

          <div className="space-y-4">
            <FitSummary metadata={metadata} />
            <section>
              <h3 className="text-sm font-semibold text-slate-950">Style summary</h3>
              <div className="mt-2">
                <StyleBadges styles={metadata.styleSummary} />
              </div>
            </section>
            <section>
              <h3 className="text-sm font-semibold text-slate-950">Key measurements</h3>
              <div className="mt-2">
                <MeasurementBadges measurements={metadata.keyMeasurements} />
              </div>
            </section>
            <p className="rounded-lg border border-accent-100 bg-accent-50 p-3 text-sm font-semibold text-brand-900">{metadata.warning}</p>
          </div>
        </div>
      </div>
    </div>
  );
}