import { useState } from 'react';

type PrintImageThumbProps = {
  src?: string | null;
  label: string;
  compact?: boolean;
};

export function PrintImageThumb({ src, label, compact = false }: PrintImageThumbProps) {
  const [isBroken, setIsBroken] = useState(false);
  const usableSrc = src?.trim();
  const showImage = Boolean(usableSrc && !isBroken);

  return (
    <figure className={compact ? 'print-image-thumb print-image-thumb--compact' : 'print-image-thumb'}>
      {showImage ? (
        <img src={usableSrc} alt={label} onError={() => setIsBroken(true)} />
      ) : (
        <div className="print-image-empty" aria-label={`${label} image unavailable`}>
          No image
        </div>
      )}
      <figcaption className="print-image-caption">{label}</figcaption>
    </figure>
  );
}
