import { useState } from 'react';
import { appBrand, brandInitials } from '../app/brand';
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

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-brand-900 text-brand-50 ring-1 ring-accent-500/70',
        compact ? 'h-10 w-10' : 'h-11 w-11',
        className,
      )}
      aria-label={`${name} logo`}
    >
      {showLogo ? (
        <img
          src={logoUrl ?? ''}
          alt={`${name} logo`}
          className="h-full w-full object-cover"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <span className={cn('font-semibold leading-none text-brand-50', compact ? 'text-base' : 'text-lg')}>
          {brandInitials(name)}
        </span>
      )}
    </span>
  );
}