import { CheckCircle2, X } from 'lucide-react';
import { DesignOptionThumbnail } from './DesignOptionThumbnail';
import type { GarmentDesignCategory, GarmentDesignOption } from './designSelectionTypes';

type DesignOptionPreviewModalProps = {
  category: GarmentDesignCategory;
  option: GarmentDesignOption;
  selected: boolean;
  onClose: () => void;
  onChoose: () => void;
};

export function DesignOptionPreviewModal({
  category,
  option,
  selected,
  onClose,
  onChoose,
}: DesignOptionPreviewModalProps) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="design-option-preview-title">
      <div className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-lg bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-brand-200 bg-[#fffaf0] p-4">
          <div>
            <p className="text-xs font-semibold uppercase text-brand-700">{category.categoryName}</p>
            <h2 id="design-option-preview-title" className="mt-1 text-xl font-semibold text-slate-950">{option.optionName}</h2>
          </div>
          <button type="button" onClick={onClose} title="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-white">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 p-4 sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <DesignOptionThumbnail
            svgIconKey={option.svgIconKey}
            imageUrl={option.imageUrl}
            label={option.optionName}
            selected={selected}
            className="min-h-48"
          />
          <div className="space-y-3">
            <section className="rounded-lg border border-brand-200 bg-brand-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">Design detail</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{option.description}</p>
            </section>
            <section className="rounded-lg border border-brand-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">Example use</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                A practical choice when the customer wants this {category.categoryName.toLowerCase()} detail to define the finished garment look.
              </p>
            </section>
            <section className="rounded-lg border border-brand-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-950">Selection rule</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {category.selectionType === 'multiple'
                  ? 'You can choose more than one option in this category.'
                  : 'Only one option can be selected in this category.'}
              </p>
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-brand-200 p-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-brand-50">
            Close
          </button>
          <button type="button" onClick={onChoose} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {selected ? 'Keep This Option' : 'Choose This Option'}
          </button>
        </div>
      </div>
    </div>
  );
}
