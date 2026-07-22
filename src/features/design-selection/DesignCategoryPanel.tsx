import { CheckCircle2, CircleAlert } from 'lucide-react';
import { forwardRef } from 'react';
import { cn } from '../../utils/cn';
import { DesignOptionCard } from './DesignOptionCard';
import type { DesignSelectionState, GarmentDesignCategory, GarmentDesignOption } from './designSelectionTypes';

type DesignCategoryPanelProps = {
  category: GarmentDesignCategory;
  categoryNumber: number;
  selections: DesignSelectionState;
  missing?: boolean;
  onSelectOption: (category: GarmentDesignCategory, option: GarmentDesignOption) => void;
  onPreviewOption: (category: GarmentDesignCategory, option: GarmentDesignOption) => void;
};

export const DesignCategoryPanel = forwardRef<HTMLElement, DesignCategoryPanelProps>(function DesignCategoryPanel(
  { category, categoryNumber, selections, missing = false, onSelectOption, onPreviewOption },
  ref,
) {
  const selectedKeys = selections[category.categoryKey] ?? [];
  const selectedOptionNames = category.options
    .filter((option) => selectedKeys.includes(option.optionKey))
    .map((option) => option.optionName);
  const isComplete = selectedOptionNames.length > 0;
  const titleId = `${category.id}-title`;

  return (
    <section
      ref={ref}
      tabIndex={-1}
      data-testid="design-category-panel"
      className={cn(
        'scroll-mt-24 overflow-hidden rounded-md border bg-white outline-none transition focus:ring-2 focus:ring-brand-200',
        missing ? 'border-red-300 ring-2 ring-red-100' : isComplete ? 'border-brand-700' : 'border-slate-200',
      )}
      aria-labelledby={titleId}
    >
      <div className="flex min-h-10 items-center gap-2 bg-slate-950 px-2.5 py-2 text-white">
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-sm bg-white px-1.5 text-xs font-bold text-slate-950">
          {categoryNumber}
        </span>
        <h3 id={titleId} className="min-w-0 flex-1 truncate text-sm font-semibold">{category.categoryName}</h3>
        <span className={cn('rounded-sm px-1.5 py-0.5 text-[0.62rem] font-semibold uppercase', category.required ? 'bg-amber-100 text-amber-950' : 'bg-slate-200 text-slate-800')}>
          {category.required ? 'Required' : 'Optional'}
        </span>
      </div>

      <div className={cn('border-b px-2.5 py-1.5 text-xs', missing ? 'border-red-100 bg-red-50 text-red-800' : 'border-slate-100 bg-slate-50 text-slate-700')}>
        <div className="flex items-center gap-1.5">
          {missing ? <CircleAlert aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : <CheckCircle2 aria-hidden="true" className={cn('h-3.5 w-3.5 shrink-0', isComplete ? 'text-brand-700' : 'text-slate-400')} />}
          <span className="truncate">
            <span className="font-semibold">Selected: </span>
            {selectedOptionNames.length > 0 ? selectedOptionNames.join(', ') : 'None'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto p-2 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-2 2xl:grid-cols-3">
        {category.options.map((option) => (
          <DesignOptionCard
            key={option.id}
            option={option}
            selectionType={category.selectionType}
            selected={selectedKeys.includes(option.optionKey)}
            onSelect={(selectedOption) => onSelectOption(category, selectedOption)}
            onPreview={(previewOption) => onPreviewOption(category, previewOption)}
          />
        ))}
      </div>
    </section>
  );
});
