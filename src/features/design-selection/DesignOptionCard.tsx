import { Check, Circle, Eye } from 'lucide-react';
import { cn } from '../../utils/cn';
import { DesignOptionThumbnail } from './DesignOptionThumbnail';
import type { DesignSelectionType, GarmentDesignOption } from './designSelectionTypes';

type DesignOptionCardProps = {
  option: GarmentDesignOption;
  selected: boolean;
  selectionType: DesignSelectionType;
  onSelect: (option: GarmentDesignOption) => void;
  onPreview: (option: GarmentDesignOption) => void;
};

export function DesignOptionCard({ option, selected, selectionType, onSelect, onPreview }: DesignOptionCardProps) {
  return (
    <article
      className={cn(
        'group relative min-w-[8.5rem] overflow-hidden rounded-md border bg-white transition sm:min-w-0',
        selected ? 'border-brand-800 bg-brand-50 ring-1 ring-brand-700' : 'border-slate-200 hover:border-brand-600',
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(option)}
        aria-label={`${selected ? 'Selected' : 'Select'} ${option.optionName}`}
        aria-pressed={selected}
        title={`${selectionType === 'multiple' ? 'Toggle' : 'Select'} ${option.optionName}`}
        className="flex h-full w-full flex-col p-1.5 text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-200"
      >
        <DesignOptionThumbnail
          svgIconKey={option.svgIconKey}
          imageUrl={option.imageUrl}
          label={option.optionName}
          selected={selected}
          className="aspect-[5/3] min-h-12 rounded border-slate-200"
        />
        <div className="mt-1 flex min-h-9 items-start justify-between gap-1.5">
          <h4 className="line-clamp-2 text-[0.72rem] font-semibold leading-4 text-slate-950 sm:text-xs">{option.optionName}</h4>
          <span
            aria-hidden="true"
            className={cn(
              'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border',
              selected ? 'border-brand-800 bg-brand-800 text-white' : 'border-slate-300 bg-white text-slate-400',
            )}
          >
            {selected ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : <Circle aria-hidden="true" className="h-2.5 w-2.5" />}
          </span>
        </div>
      </button>

      <button
        type="button"
        onClick={() => onPreview(option)}
        aria-label={`Preview ${option.optionName}`}
        title={`Preview ${option.optionName}`}
        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded bg-white/95 text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
      >
        <Eye aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </article>
  );
}
