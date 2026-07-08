import type { MeasurementFieldType, StyleFieldType } from '../../../types/database';
import { cn } from '../../../utils/cn';
import type { DynamicFieldValue } from '../dynamicValidation';

type DynamicOption = {
  label: string;
  value: string;
};

type DynamicFieldProps = {
  id: string;
  label: string;
  labelBn?: string | null;
  type: MeasurementFieldType | StyleFieldType;
  value: DynamicFieldValue | undefined;
  required?: boolean;
  unitLabel?: string | null;
  placeholder?: string | null;
  helpText?: string | null;
  minimum?: number | null;
  maximum?: number | null;
  step?: number | null;
  options?: unknown;
  error?: string;
  onChange: (value: DynamicFieldValue) => void;
};

export function DynamicField({
  id,
  label,
  labelBn,
  type,
  value,
  required = false,
  unitLabel,
  placeholder,
  helpText,
  minimum,
  maximum,
  step,
  options = [],
  error,
  onChange,
}: DynamicFieldProps) {
  const labelText = labelBn ? `${label} / ${labelBn}` : label;
  const normalizedOptions = normalizeDynamicOptions(options);

  return (
    <label className="block space-y-2" htmlFor={id}>
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
        {labelText}
        {required ? <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-700">Required</span> : null}
        {unitLabel ? <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{unitLabel}</span> : null}
      </span>
      <DynamicControl
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        minimum={minimum}
        maximum={maximum}
        step={step}
        options={normalizedOptions}
        error={error}
        onChange={onChange}
      />
      {helpText ? <span className="block text-xs leading-5 text-slate-500">{helpText}</span> : null}
      {error ? <span className="block text-sm font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function DynamicControl({
  id,
  type,
  value,
  placeholder,
  minimum,
  maximum,
  step,
  options = [],
  error,
  onChange,
}: Omit<DynamicFieldProps, 'label' | 'labelBn' | 'required' | 'unitLabel' | 'helpText'>) {
  const normalizedOptions = normalizeDynamicOptions(options);
  const baseClass = cn(
    'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
    error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : null,
  );

  if (type === 'number') {
    return (
      <input
        id={id}
        type="number"
        inputMode="decimal"
        min={minimum ?? undefined}
        max={maximum ?? undefined}
        step={step ?? undefined}
        value={typeof value === 'number' || typeof value === 'string' ? value : ''}
        placeholder={placeholder ?? undefined}
        className={baseClass}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (type === 'textarea') {
    return (
      <textarea
        id={id}
        value={typeof value === 'string' ? value : ''}
        placeholder={placeholder ?? undefined}
        className={cn(baseClass, 'min-h-28')}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  if (type === 'select') {
    return (
      <select
        id={id}
        value={typeof value === 'string' ? value : ''}
        className={baseClass}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select</option>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (type === 'multiselect') {
    const selectedValues = Array.isArray(value) ? value : [];

    return (
      <div className="grid gap-2 rounded-lg border border-slate-200 p-3">
        {normalizedOptions.length === 0 ? <p className="text-sm text-slate-500">No options configured.</p> : null}
        {normalizedOptions.map((option) => (
          <label key={option.value} className="flex min-h-9 items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={selectedValues.includes(option.value)}
              onChange={(event) => {
                const next = event.target.checked
                  ? [...selectedValues, option.value]
                  : selectedValues.filter((selectedValue) => selectedValue !== option.value);
                onChange(next);
              }}
              className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
        />
        Yes
      </label>
    );
  }

  return (
    <input
      id={id}
      type="text"
      value={typeof value === 'string' || typeof value === 'number' ? value : ''}
      placeholder={placeholder ?? undefined}
      className={baseClass}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function MissingValue({ label = 'Missing' }: { label?: string }) {
  return <span className="text-slate-400">{label}</span>;
}

function isDynamicOptionRecord(option: unknown): option is { label: unknown; value: unknown } {
  return option !== null && typeof option === 'object' && !Array.isArray(option) && 'label' in option && 'value' in option;
}

function normalizeDynamicOptions(options: unknown): DynamicOption[] {
  if (!Array.isArray(options)) {
    return [];
  }

  return options.flatMap((option) => {
    if (!isDynamicOptionRecord(option)) {
      return [];
    }

    const value = String(option.value).trim();
    const label = String(option.label).trim();

    return value && label ? [{ label, value }] : [];
  });
}
