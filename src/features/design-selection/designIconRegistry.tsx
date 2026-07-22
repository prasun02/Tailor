import { cn } from '../../utils/cn';

type DesignSvgIconProps = {
  svgIconKey?: string | null;
  label: string;
  className?: string;
};

export function DesignSvgIcon({ svgIconKey, label, className }: DesignSvgIconProps) {
  const iconKey = svgIconKey ?? '';

  if (matches(iconKey, ['lapel', 'buttoning', 'vent', 'shoulder', 'lining', 'satin'])) {
    return <JacketIcon label={label} iconKey={iconKey} className={className} />;
  }

  if (matches(iconKey, ['collar', 'cuff', 'sleeve', 'placket', 'yoke', 'monogram'])) {
    return <ShirtIcon label={label} iconKey={iconKey} className={className} />;
  }

  if (matches(iconKey, ['waist', 'belt', 'front_style', 'fly', 'crease', 'rise', 'bottom_opening', 'trouser'])) {
    return <TrouserIcon label={label} iconKey={iconKey} className={className} />;
  }

  if (matches(iconKey, ['embroidery', 'side_slit', 'hem', 'fabric_weight', 'interfacing'])) {
    return <KurtaIcon label={label} iconKey={iconKey} className={className} />;
  }

  if (matches(iconKey, ['pocket'])) {
    return <PocketIcon label={label} iconKey={iconKey} className={className} />;
  }

  return <GenericGarmentIcon label={label} className={className} />;
}

function matches(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}

function baseClass(className?: string) {
  return cn('h-full w-full text-brand-900', className);
}

function JacketIcon({ label, iconKey, className }: { label: string; iconKey: string; className?: string }) {
  const isPeak = iconKey.includes('peak');
  const isShawl = iconKey.includes('shawl');
  const isDouble = iconKey.includes('double');
  const isNoVent = iconKey.includes('no_vent');
  const isDoubleVent = iconKey.includes('double_vent');

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={baseClass(className)} fill="none">
      <path d="M42 16 24 34v70h72V34L78 16" className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
      <path d="M42 16h36l-18 18L42 16Z" className="fill-brand-50 stroke-current" strokeWidth="4" strokeLinejoin="round" />
      {isShawl ? (
        <path d="M48 22c-8 18-8 42 12 74 20-32 20-56 12-74" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
      ) : (
        <>
          <path d={isPeak ? 'M42 18 57 51 42 43' : 'M42 18 58 48 44 54'} className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
          <path d={isPeak ? 'M78 18 63 51 78 43' : 'M78 18 62 48 76 54'} className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
        </>
      )}
      <path d="M38 70h18M64 70h18" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
      <path d={isDouble ? 'M54 52h0M66 52h0M54 64h0M66 64h0' : 'M60 52h0M60 64h0'} className="stroke-current" strokeWidth="7" strokeLinecap="round" />
      {!isNoVent ? <path d={isDoubleVent ? 'M48 104V84M72 104V84' : 'M60 104V82'} className="stroke-current" strokeWidth="4" strokeLinecap="round" /> : null}
    </svg>
  );
}

function ShirtIcon({ label, iconKey, className }: { label: string; iconKey: string; className?: string }) {
  const isMandarin = iconKey.includes('mandarin') || iconKey.includes('band') || iconKey.includes('chinese');
  const isHidden = iconKey.includes('hidden');
  const isShort = iconKey.includes('short') || iconKey.includes('half');
  const isNoPocket = iconKey.includes('no_pocket');

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={baseClass(className)} fill="none">
      <path d={isShort ? 'M42 18 24 34l8 24 12-5v51h32V53l12 5 8-24-18-16' : 'M42 18 22 36l10 55 13-3v16h30V88l13 3 10-55-20-18'} className="fill-brand-50 stroke-current" strokeWidth="4" strokeLinejoin="round" />
      {isMandarin ? (
        <path d="M48 18v16h24V18" className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M42 18 58 38 48 45" className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
          <path d="M78 18 62 38 72 45" className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
        </>
      )}
      <path d={isHidden ? 'M60 38v60' : 'M60 38v60M60 50h0M60 62h0M60 74h0'} className="stroke-current" strokeWidth={isHidden ? 4 : 6} strokeLinecap="round" />
      {!isNoPocket ? <path d="M72 58h14v16H72z" className="stroke-current" strokeWidth="4" strokeLinejoin="round" /> : null}
    </svg>
  );
}

function TrouserIcon({ label, iconKey, className }: { label: string; iconKey: string; className?: string }) {
  const hasPleat = iconKey.includes('pleat');
  const hasTurnUp = iconKey.includes('turn_up') || iconKey.includes('cuff');
  const hasSideAdjuster = iconKey.includes('adjuster') || iconKey.includes('side_tab');

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={baseClass(className)} fill="none">
      <path d="M38 18h44l8 88H66L60 44l-6 62H30l8-88Z" className="fill-brand-50 stroke-current" strokeWidth="4" strokeLinejoin="round" />
      <path d="M38 28h44" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
      {hasSideAdjuster ? <path d="M31 30h16M73 30h16" className="stroke-current" strokeWidth="4" strokeLinecap="round" /> : null}
      {hasPleat ? <path d="M52 34v44M68 34v44" className="stroke-current" strokeWidth="3" strokeLinecap="round" /> : null}
      <path d="M45 38 34 50M75 38l11 12" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
      {hasTurnUp ? <path d="M31 96h23M66 96h23" className="stroke-current" strokeWidth="5" strokeLinecap="round" /> : null}
    </svg>
  );
}

function KurtaIcon({ label, iconKey, className }: { label: string; iconKey: string; className?: string }) {
  const hasSlit = iconKey.includes('slit');
  const hasEmbroidery = iconKey.includes('embroidery') || iconKey.includes('zari') || iconKey.includes('thread') || iconKey.includes('bead');

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={baseClass(className)} fill="none">
      <path d="M43 16h34l17 22-10 12-8-7v61H44V43l-8 7-10-12 17-22Z" className="fill-brand-50 stroke-current" strokeWidth="4" strokeLinejoin="round" />
      <path d="M50 18v18h20V18" className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
      <path d="M60 36v55M60 48h0M60 60h0M60 72h0" className="stroke-current" strokeWidth="6" strokeLinecap="round" />
      {hasSlit ? <path d="M44 84v20M76 84v20" className="stroke-current" strokeWidth="4" strokeLinecap="round" /> : null}
      {hasEmbroidery ? (
        <path d="M72 46c8 6 8 17 0 23-8-6-8-17 0-23ZM48 46c-8 6-8 17 0 23 8-6 8-17 0-23Z" className="stroke-accent-500" strokeWidth="3" strokeLinejoin="round" />
      ) : null}
    </svg>
  );
}

function PocketIcon({ label, iconKey, className }: { label: string; iconKey: string; className?: string }) {
  const noPocket = iconKey.includes('no_pocket');
  const flap = iconKey.includes('flap');
  const slanted = iconKey.includes('slanted') || iconKey.includes('slash');

  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={baseClass(className)} fill="none">
      <path d="M28 22h64v76H28z" className="fill-brand-50 stroke-current" strokeWidth="4" strokeLinejoin="round" />
      {noPocket ? (
        <path d="M42 42 78 78M78 42 42 78" className="stroke-current" strokeWidth="5" strokeLinecap="round" />
      ) : (
        <>
          <path d={slanted ? 'M38 56 82 44v32H38V56Z' : 'M38 46h44v30H38z'} className="stroke-current" strokeWidth="4" strokeLinejoin="round" />
          {flap ? <path d="M38 46 60 60l22-14" className="stroke-current" strokeWidth="4" strokeLinejoin="round" /> : null}
        </>
      )}
    </svg>
  );
}

function GenericGarmentIcon({ label, className }: { label: string; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label={label} className={baseClass(className)} fill="none">
      <path d="M42 18h36l18 20-12 14-7-7v57H43V45l-7 7-12-14 18-20Z" className="fill-brand-50 stroke-current" strokeWidth="4" strokeLinejoin="round" />
      <path d="M47 23 60 40l13-17M60 42v48" className="stroke-current" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M48 64h24" className="stroke-current" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
