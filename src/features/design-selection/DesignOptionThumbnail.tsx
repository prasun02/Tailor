import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../utils/cn';
import { DesignSvgIcon } from './designIconRegistry';

type DesignOptionThumbnailProps = {
  svgIconKey?: string | null;
  imageUrl?: string | null;
  label: string;
  selected?: boolean;
  disabled?: boolean;
  className?: string;
};

export function DesignOptionThumbnail({
  svgIconKey,
  imageUrl,
  label,
  selected = false,
  disabled = false,
  className,
}: DesignOptionThumbnailProps) {
  const [isBroken, setIsBroken] = useState(false);
  const canShowImage = Boolean(imageUrl?.trim()) && !isBroken;

  return (
    <div
      className={cn(
        'relative flex aspect-[4/3] min-h-28 items-center justify-center overflow-hidden rounded-md border bg-white',
        selected ? 'border-brand-700 ring-2 ring-brand-100' : 'border-brand-200',
        disabled ? 'opacity-50' : null,
        className,
      )}
    >
      {canShowImage ? (
        <img
          src={imageUrl ?? undefined}
          alt={label}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setIsBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-slate-50 p-3">
          {svgIconKey ? (
            <DesignSvgIcon svgIconKey={svgIconKey} label={label} className="max-h-28" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-center text-sm font-semibold text-slate-500">
              <ImageOff aria-hidden="true" className="h-6 w-6 text-slate-400" />
              <span>{isBroken ? 'Image unavailable' : 'Design preview'}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
