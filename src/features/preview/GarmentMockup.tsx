import type { PreviewMetadata } from './previewUtils';

type MockupKind = 'shirt' | 'pant' | 'panjabi';

function mockupKind(garmentType: string): MockupKind {
  const normalized = garmentType.toLowerCase();

  if (normalized.includes('pant') || normalized.includes('trouser')) return 'pant';
  if (normalized.includes('panjabi') || normalized.includes('punjabi') || normalized.includes('kurta')) return 'panjabi';
  return 'shirt';
}

export function GarmentMockup({ metadata, compact = false }: { metadata: PreviewMetadata; compact?: boolean }) {
  const kind = mockupKind(metadata.garmentType);
  const indicators = metadata.keyMeasurements.slice(0, compact ? 3 : 5);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="mx-auto max-w-sm">
        <div className="relative aspect-[4/5] w-full">
          {kind === 'pant' ? <PantSvg /> : kind === 'panjabi' ? <PanjabiSvg /> : <ShirtSvg />}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {indicators.map((measurement) => (
          <span key={`${measurement.key}-${measurement.value}`} className="rounded-lg border border-white bg-white/85 px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-sm">
            {measurement.label}: {measurement.value}
          </span>
        ))}
      </div>
    </div>
  );
}

function ShirtSvg() {
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="Estimated shirt mockup" className="h-full w-full">
      <path d="M80 38 L105 24 H135 L160 38 L214 83 L185 122 L164 106 V266 H76 V106 L55 122 L26 83 Z" fill="#ffffff" stroke="#334155" strokeWidth="3" />
      <path d="M105 24 L120 54 L135 24" fill="#dbeafe" stroke="#334155" strokeWidth="2" />
      <path d="M96 80 H144" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M78 146 H162" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M166 126 H146 V166 H166 Z" fill="#f8fafc" stroke="#64748b" strokeWidth="2" />
      <path d="M120 58 V266" stroke="#cbd5e1" strokeWidth="2" />
      <circle cx="120" cy="94" r="3" fill="#64748b" />
      <circle cx="120" cy="124" r="3" fill="#64748b" />
      <circle cx="120" cy="154" r="3" fill="#64748b" />
      <path d="M52 58 H188" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
      <path d="M184 60 L188 58 L184 56" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 56 L52 58 L56 60" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M190 88 V252" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <path d="M188 248 L190 252 L192 248" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M192 92 L190 88 L188 92" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PantSvg() {
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="Estimated pant mockup" className="h-full w-full">
      <path d="M72 34 H168 L180 266 H136 L120 104 L104 266 H60 Z" fill="#ffffff" stroke="#334155" strokeWidth="3" />
      <path d="M72 34 H168 V62 H72 Z" fill="#dbeafe" stroke="#334155" strokeWidth="2" />
      <path d="M120 62 V104" stroke="#64748b" strokeWidth="2" />
      <path d="M88 76 C100 88 111 92 120 92 C129 92 140 88 152 76" fill="none" stroke="#94a3b8" strokeWidth="2" />
      <path d="M58 34 H182" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
      <path d="M178 36 L182 34 L178 32" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 32 L58 34 L62 36" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M190 60 V266" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <path d="M188 262 L190 266 L192 262" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M192 64 L190 60 L188 64" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M84 156 H114" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M126 156 H156" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M63 252 H105 M135 252 H177" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
    </svg>
  );
}

function PanjabiSvg() {
  return (
    <svg viewBox="0 0 240 300" role="img" aria-label="Estimated panjabi mockup" className="h-full w-full">
      <path d="M78 38 L104 24 H136 L162 38 L212 86 L184 124 L164 108 V278 H76 V108 L56 124 L28 86 Z" fill="#ffffff" stroke="#334155" strokeWidth="3" />
      <path d="M104 24 L120 58 L136 24" fill="#dbeafe" stroke="#334155" strokeWidth="2" />
      <path d="M120 58 V278" stroke="#cbd5e1" strokeWidth="2" />
      <path d="M98 86 H142" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M78 152 H162" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <path d="M84 246 H156" stroke="#64748b" strokeWidth="2" strokeDasharray="6 6" />
      <circle cx="120" cy="96" r="3" fill="#64748b" />
      <circle cx="120" cy="126" r="3" fill="#64748b" />
      <circle cx="120" cy="156" r="3" fill="#64748b" />
      <path d="M52 58 H188" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" />
      <path d="M184 60 L188 58 L184 56" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M56 56 L52 58 L56 60" stroke="#0f766e" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M190 82 V268" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
      <path d="M188 264 L190 268 L192 264" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M192 86 L190 82 L188 86" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
