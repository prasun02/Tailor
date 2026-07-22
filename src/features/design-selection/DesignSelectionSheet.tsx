import { ArrowRight, CheckCircle2, CircleAlert, Search, Sparkles, Trash2, X } from 'lucide-react';
import type { MutableRefObject } from 'react';
import { cn } from '../../utils/cn';
import { DesignCategoryPanel } from './DesignCategoryPanel';
import type { DesignSelectionState, GarmentDesignCategory, GarmentDesignOption } from './designSelectionTypes';

type DesignSelectionSheetProps = {
  garmentName: string;
  itemNumber: number;
  categories: GarmentDesignCategory[];
  visibleCategories: GarmentDesignCategory[];
  selections: DesignSelectionState;
  search: string;
  selectedCategoryCount: number;
  requiredCount: number;
  selectedRequiredCount: number;
  missingRequiredCount: number;
  validationMessage: string;
  saveNotice: string;
  highlightMissingKeys: Set<string>;
  categoryRefs: MutableRefObject<Record<string, HTMLElement | null>>;
  onSearchChange: (value: string) => void;
  onClearSelection: () => void;
  onClose: () => void;
  onSaveSelection: () => void;
  onSaveAndContinue: () => void;
  onSelectOption: (category: GarmentDesignCategory, option: GarmentDesignOption) => void;
  onPreviewOption: (category: GarmentDesignCategory, option: GarmentDesignOption) => void;
};

export function DesignSelectionSheet({
  garmentName,
  itemNumber,
  categories,
  visibleCategories,
  selections,
  search,
  selectedCategoryCount,
  requiredCount,
  selectedRequiredCount,
  missingRequiredCount,
  validationMessage,
  saveNotice,
  highlightMissingKeys,
  categoryRefs,
  onSearchChange,
  onClearSelection,
  onClose,
  onSaveSelection,
  onSaveAndContinue,
  onSelectOption,
  onPreviewOption,
}: DesignSelectionSheetProps) {
  return (
    <div className="flex h-full w-full max-w-[96rem] flex-col overflow-hidden bg-white shadow-premium sm:max-h-[96vh] sm:rounded-lg">
      <header className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,26rem)_auto] xl:items-center">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-700">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-brand-700" />
              Faabrico Design Sheet
            </p>
            <h2 id="design-selection-title" className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">{garmentName} Design Selection</h2>
            <p className="mt-0.5 text-sm text-slate-600">Item {itemNumber} - all categories are visible together for staff and customer review.</p>
          </div>

          <label className="relative block">
            <span className="sr-only">Search design options</span>
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search collar, pocket, fit"
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <div className="flex items-center gap-2 xl:justify-end">
            <button type="button" onClick={onClearSelection} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              Clear Selection
            </button>
            <button type="button" onClick={onClose} title="Close" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100">
              <X aria-hidden="true" className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <Metric label="Selected" value={`${selectedCategoryCount} / ${categories.length} categories`} tone="brand" />
          <Metric label="Required" value={`${selectedRequiredCount} / ${requiredCount} selected`} tone={missingRequiredCount > 0 ? 'warning' : 'brand'} />
          <Metric label="Missing" value={`${missingRequiredCount} required`} tone={missingRequiredCount > 0 ? 'warning' : 'brand'} />
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto bg-white p-2 sm:p-3" data-testid="design-selection-sheet">
        {validationMessage ? (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-2 text-sm font-semibold text-red-800" role="alert">
            <CircleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{validationMessage}</span>
          </div>
        ) : null}
        {saveNotice ? (
          <div className="mb-2 flex items-start gap-2 rounded-md border border-brand-200 bg-brand-50 p-2 text-sm font-semibold text-brand-800" role="status">
            <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{saveNotice}</span>
          </div>
        ) : null}

        {visibleCategories.length > 0 ? (
          <div className="grid content-start gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4" data-testid="design-sheet-category-grid">
            {visibleCategories.map((category, index) => (
              <DesignCategoryPanel
                key={category.id}
                ref={(node) => {
                  categoryRefs.current[category.categoryKey] = node;
                }}
                category={category}
                categoryNumber={categories.findIndex((entry) => entry.categoryKey === category.categoryKey) + 1 || index + 1}
                selections={selections}
                missing={highlightMissingKeys.has(category.categoryKey)}
                onSelectOption={onSelectOption}
                onPreviewOption={onPreviewOption}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            No matching design categories found.
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-slate-200 bg-white p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm font-semibold text-slate-700">
            {missingRequiredCount > 0 ? (
              <span className="inline-flex rounded-md bg-amber-50 px-3 py-2 text-amber-900">Select {missingRequiredCount} required categor{missingRequiredCount === 1 ? 'y' : 'ies'} before measurement.</span>
            ) : (
              <span className="inline-flex rounded-md bg-brand-50 px-3 py-2 text-brand-900">Required design choices are ready for measurement.</span>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onSaveSelection} className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand-700 bg-white px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50">
              Save Selection
            </button>
            <button type="button" onClick={onSaveAndContinue} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800">
              Continue to Measurement
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'brand' | 'warning' }) {
  return (
    <div className={cn('rounded-md border px-3 py-2', tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-950' : 'border-slate-200 bg-slate-50 text-slate-800')}>
      <span className="block text-[0.68rem] font-semibold uppercase text-slate-500">{label}</span>
      <span className="mt-0.5 block font-semibold">{value}</span>
    </div>
  );
}
