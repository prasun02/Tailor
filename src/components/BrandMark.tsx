import { useState } from 'react';
import { appBrand } from '../app/brand';
import { cn } from '../utils/cn';

type BrandMarkProps = {
  name?: string;
  logoUrl?: string | null;
  compact?: boolean;
  className?: string;
};

export function BrandMark({ name = appBrand.name, logoUrl, compact = false, className }: BrandMarkProps) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(logoUrl?.trim() && !logoFailed);
  const fallbackText = appBrand.name;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-900 text-brand-50 ring-1 ring-accent-500/70',
        compact ? 'h-10 min-w-28 px-3' : 'h-11 min-w-32 px-3',
        className,
      )}
      aria-label={`${name} logo`}
    >
      {showLogo ? (
        <img
          src={logoUrl ?? ''}
          alt={`${name} logo`}
          className="h-full w-full object-contain"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className={cn('font-semibold leading-none text-brand-50', compact ? 'text-sm' : 'text-base')}>
          {fallbackText}
        </span>
      )}
    </span>
  );
}