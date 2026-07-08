import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { TextAreaField, TextField } from '../../../components/ui/FormField';
import type { MeasurementFieldType, MeasurementUnit, StyleFieldType } from '../../../types/database';
import { cn } from '../../../utils/cn';
import {
  emptyGarmentFormValues,
  emptyMeasurementFieldFormValues,
  emptyStyleFieldFormValues,
  garmentFormSchema,
  measurementFieldFormSchema,
  measurementFieldTypes,
  measurementUnits,
  styleFieldFormSchema,
  styleFieldTypes,
  type GarmentFormValues,
  type MeasurementFieldFormValues,
  type StyleFieldFormValues,
} from '../configurationSchemas';
import type { GarmentType } from '../types';

type ErrorMap = Record<string, string>;

type GarmentFormProps = {
  initialValues?: GarmentFormValues;
  submitLabel: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: GarmentFormValues) => void;
};

function issueMap(error: { issues: { path: PropertyKey[]; message: string }[] }): ErrorMap {
  const errors: ErrorMap = {};

  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    errors[key] = issue.message;
  }

  return errors;
}

export function GarmentForm({ initialValues = emptyGarmentFormValues, submitLabel, isSubmitting, error, onSubmit }: GarmentFormProps) {
  const [values, setValues] = useState<GarmentFormValues>(initialValues);
  const [errors, setErrors] = useState<ErrorMap>({});

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const result = garmentFormSchema.safeParse({ ...values, code: values.code.toUpperCase() });

        if (!result.success) {
          setErrors(issueMap(result.error));
          return;
        }

        setErrors({});
        onSubmit(result.data);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <TextField label="Name" value={values.name} error={errors.name} onChange={(event) => setValues({ ...values, name: event.target.value })} />
        <TextField label="Bangla name" value={values.nameBn} error={errors.nameBn} onChange={(event) => setValues({ ...values, nameBn: event.target.value })} />
        <TextField
          label="Code"
          value={values.code}
          error={errors.code}
          onChange={(event) => setValues({ ...values, code: event.target.value.toUpperCase() })}
        />
        <TextField
          label="Sort order"
          type="number"
          inputMode="numeric"
          value={values.sortOrder}
          error={errors.sortOrder}
          onChange={(event) => setValues({ ...values, sortOrder: Number(event.target.value) })}
        />
      </div>
      <TextAreaField
        label="Description"
        value={values.description}
        error={errors.description}
        onChange={(event) => setValues({ ...values, description: event.target.value })}
      />
      <FormError error={error} />
      <SubmitButton disabled={isSubmitting} label={submitLabel} />
    </form>
  );
}

type MeasurementFieldDraft = Omit<MeasurementFieldFormValues, 'minimumValue' | 'maximumValue' | 'stepValue' | 'sortOrder'> & {
  minimumValue: string;
  maximumValue: string;
  stepValue: string;
  sortOrder: string;
};

type MeasurementFieldFormProps = {
  garments: GarmentType[];
  initialValues?: MeasurementFieldFormValues;
  submitLabel: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: MeasurementFieldFormValues) => void;
};

function measurementDraft(initialValues: MeasurementFieldFormValues): MeasurementFieldDraft {
  return {
    ...initialValues,
    minimumValue: initialValues.minimumValue?.toString() ?? '',
    maximumValue: initialValues.maximumValue?.toString() ?? '',
    stepValue: initialValues.stepValue.toString(),
    sortOrder: initialValues.sortOrder.toString(),
  };
}

export function MeasurementFieldForm({
  garments,
  initialValues = emptyMeasurementFieldFormValues,
  submitLabel,
  isEditing = false,
  isSubmitting,
  error,
  onSubmit,
}: MeasurementFieldFormProps) {
  const [values, setValues] = useState<MeasurementFieldDraft>(measurementDraft(initialValues));
  const [errors, setErrors] = useState<ErrorMap>({});

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const result = measurementFieldFormSchema.safeParse(values);

        if (!result.success) {
          setErrors(issueMap(result.error));
          return;
        }

        setErrors({});
        onSubmit(result.data);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Garment type"
          value={values.garmentTypeId}
          error={errors.garmentTypeId}
          onChange={(value) => setValues({ ...values, garmentTypeId: value })}
          options={garments.map((garment) => ({ value: garment.id, label: `${garment.name} (${garment.code})` }))}
        />
        <TextField label="Label" value={values.label} error={errors.label} onChange={(event) => setValues({ ...values, label: event.target.value })} />
        <TextField label="Bangla label" value={values.labelBn} error={errors.labelBn} onChange={(event) => setValues({ ...values, labelBn: event.target.value })} />
        <TextField
          label="Field key"
          value={values.fieldKey}
          disabled={isEditing}
          description={isEditing ? 'Field keys stay locked after creation to protect historical measurements.' : 'Lowercase stable key, for example chest or sleeve_length.'}
          error={errors.fieldKey}
          onChange={(event) => setValues({ ...values, fieldKey: event.target.value })}
        />
        <SelectField
          label="Field type"
          value={values.fieldType}
          error={errors.fieldType}
          onChange={(value) => setValues({ ...values, fieldType: value as MeasurementFieldType })}
          options={measurementFieldTypes.map((fieldType) => ({ value: fieldType, label: fieldType }))}
        />
        <SelectField
          label="Unit"
          value={values.unit ?? ''}
          error={errors.unit}
          onChange={(value) => setValues({ ...values, unit: value as MeasurementUnit | '' })}
          options={[{ value: '', label: 'No unit' }, ...measurementUnits.map((unit) => ({ value: unit, label: unit }))]}
        />
        <TextField label="Minimum" type="number" inputMode="decimal" value={values.minimumValue} error={errors.minimumValue} onChange={(event) => setValues({ ...values, minimumValue: event.target.value })} />
        <TextField label="Maximum" type="number" inputMode="decimal" value={values.maximumValue} error={errors.maximumValue} onChange={(event) => setValues({ ...values, maximumValue: event.target.value })} />
        <TextField label="Step" type="number" inputMode="decimal" value={values.stepValue} error={errors.stepValue} onChange={(event) => setValues({ ...values, stepValue: event.target.value })} />
        <TextField label="Sort order" type="number" inputMode="numeric" value={values.sortOrder} error={errors.sortOrder} onChange={(event) => setValues({ ...values, sortOrder: event.target.value })} />
        <TextField label="Placeholder" value={values.placeholder} error={errors.placeholder} onChange={(event) => setValues({ ...values, placeholder: event.target.value })} />
        <TextField label="Help text" value={values.helpText} error={errors.helpText} onChange={(event) => setValues({ ...values, helpText: event.target.value })} />
      </div>
      <CheckboxField label="Required" checked={values.isRequired} onChange={(checked) => setValues({ ...values, isRequired: checked })} />
      <FormError error={error} />
      <SubmitButton disabled={isSubmitting} label={submitLabel} />
    </form>
  );
}

type StyleFieldDraft = Omit<StyleFieldFormValues, 'sortOrder'> & {
  sortOrder: string;
};

type StyleFieldFormProps = {
  garments: GarmentType[];
  initialValues?: StyleFieldFormValues;
  submitLabel: string;
  isEditing?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (values: StyleFieldFormValues) => void;
};

function styleDraft(initialValues: StyleFieldFormValues): StyleFieldDraft {
  return {
    ...initialValues,
    sortOrder: initialValues.sortOrder.toString(),
  };
}

export function StyleFieldForm({ garments, initialValues = emptyStyleFieldFormValues, submitLabel, isEditing = false, isSubmitting, error, onSubmit }: StyleFieldFormProps) {
  const [values, setValues] = useState<StyleFieldDraft>(styleDraft(initialValues));
  const [errors, setErrors] = useState<ErrorMap>({});

  return (
    <form
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const result = styleFieldFormSchema.safeParse(values);

        if (!result.success) {
          setErrors(issueMap(result.error));
          return;
        }

        setErrors({});
        onSubmit(result.data);
      }}
    >
      <div className="grid gap-4 md:grid-cols-2">
        <SelectField
          label="Garment type"
          value={values.garmentTypeId}
          error={errors.garmentTypeId}
          onChange={(value) => setValues({ ...values, garmentTypeId: value })}
          options={garments.map((garment) => ({ value: garment.id, label: `${garment.name} (${garment.code})` }))}
        />
        <TextField label="Label" value={values.label} error={errors.label} onChange={(event) => setValues({ ...values, label: event.target.value })} />
        <TextField label="Bangla label" value={values.labelBn} error={errors.labelBn} onChange={(event) => setValues({ ...values, labelBn: event.target.value })} />
        <TextField
          label="Field key"
          value={values.fieldKey}
          disabled={isEditing}
          description={isEditing ? 'Field keys stay locked after creation to protect historical order snapshots.' : 'Lowercase stable key, for example collar_style.'}
          error={errors.fieldKey}
          onChange={(event) => setValues({ ...values, fieldKey: event.target.value })}
        />
        <SelectField
          label="Field type"
          value={values.fieldType}
          error={errors.fieldType}
          onChange={(value) => setValues({ ...values, fieldType: value as StyleFieldType })}
          options={styleFieldTypes.map((fieldType) => ({ value: fieldType, label: fieldType }))}
        />
        <TextField label="Sort order" type="number" inputMode="numeric" value={values.sortOrder} error={errors.sortOrder} onChange={(event) => setValues({ ...values, sortOrder: event.target.value })} />
      </div>
      <CheckboxField label="Required" checked={values.isRequired} onChange={(checked) => setValues({ ...values, isRequired: checked })} />
      <OptionEditor options={values.options} onChange={(options) => setValues({ ...values, options })} />
      <FormError error={error ?? errors.options} />
      <SubmitButton disabled={isSubmitting} label={submitLabel} />
    </form>
  );
}

function SelectField({ label, value, options, error, onChange }: { label: string; value: string; options: { value: string; label: string }[]; error?: string; onChange: (value: string) => void }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-950 shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : null,
        )}
      >
        {options.some((option) => option.value === '') ? null : <option value="">Select</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <span className="block text-sm font-medium text-red-600">{error}</span> : null}
    </label>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
      />
      {label}
    </label>
  );
}

function OptionEditor({ options, onChange }: { options: string[]; onChange: (options: string[]) => void }) {
  const [draft, setDraft] = useState('');

  function moveOption(index: number, direction: -1 | 1) {
    const next = [...options];
    const targetIndex = index + direction;

    if (targetIndex < 0 || targetIndex >= next.length) {
      return;
    }

    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add option"
          className="min-h-11 flex-1 rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
        />
        <button
          type="button"
          onClick={() => {
            const nextOption = draft.trim();
            if (!nextOption || options.includes(nextOption)) {
              return;
            }
            onChange([...options, nextOption]);
            setDraft('');
          }}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Add
        </button>
      </div>
      <div className="space-y-2">
        {options.length === 0 ? <p className="text-sm text-slate-500">No style options configured.</p> : null}
        {options.map((option, index) => (
          <div key={`${option}-${index}`} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">{option}</span>
            <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white" onClick={() => moveOption(index, -1)}>
              Up
            </button>
            <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white" onClick={() => moveOption(index, 1)}>
              Down
            </button>
            <button
              type="button"
              title="Remove option"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-red-600 hover:bg-white"
              onClick={() => onChange(options.filter((_, optionIndex) => optionIndex !== index))}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FormError({ error }: { error?: string | null }) {
  return error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null;
}

function SubmitButton({ disabled, label }: { disabled?: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Save aria-hidden="true" className="h-4 w-4" />
      {label}
    </button>
  );
}
