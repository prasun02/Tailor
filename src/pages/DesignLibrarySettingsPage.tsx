import { Archive, Image, RotateCcw, Search, ShieldAlert, Sparkles, Upload, X } from 'lucide-react';
import { useId, useState, type ChangeEvent, type FormEvent } from 'react';
import { EmptyState } from '../components/ui/EmptyState';
import { TextAreaField, TextField } from '../components/ui/FormField';
import { Loading } from '../components/ui/Loading';
import {
  useArchiveGarmentDesign,
  useCreateGarmentDesign,
  useGarmentDesigns,
  useRestoreGarmentDesign,
  useUpdateGarmentDesign,
} from '../features/designs/designHooks';
import { designFormSchema, emptyDesignFormValues, type DesignFormValues } from '../features/designs/designSchemas';
import { designToFormValues } from '../features/designs/designService';
import type { GarmentDesign } from '../features/designs/types';
import { useGarmentTypes } from '../features/measurements/configurationHooks';
import type { GarmentType } from '../features/measurements/types';
import { GarmentPreviewCard } from '../features/preview/GarmentPreviewCard';
import { uploadImageToStorage, validateImageFile, type ImageUploadBucket } from '../features/uploads/imageUpload';
import { useShop } from '../features/shop/shopContext';
import { canManageConfiguration } from '../utils/authorization';
import { cn } from '../utils/cn';

export function DesignLibrarySettingsPage() {
  const { currentRole, currentShopId } = useShop();
  const canManage = canManageConfiguration(currentRole);
  const [includeArchived, setIncludeArchived] = useState(false);
  const [garmentFilter, setGarmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<GarmentDesign | null>(null);
  const garmentsQuery = useGarmentTypes(currentShopId, false);
  const designsQuery = useGarmentDesigns(currentShopId, {
    garmentTypeId: garmentFilter || undefined,
    search,
    activeOnly: !includeArchived,
    limit: 200,
  });
  const createDesign = useCreateGarmentDesign(currentShopId ?? '');
  const updateDesign = useUpdateGarmentDesign(currentShopId ?? '', editing?.id ?? '');
  const archiveDesign = useArchiveGarmentDesign(currentShopId ?? '');
  const restoreDesign = useRestoreGarmentDesign(currentShopId ?? '');
  const garments = garmentsQuery.data ?? [];
  const garmentNameById = new Map(garments.map((garment) => [garment.id, garment.name]));

  if (!canManage) {
    return <EmptyState icon={ShieldAlert} title="Design library is restricted" message="Only owners and managers can manage design previews." />;
  }

  async function submitDesign(values: DesignFormValues) {
    if (editing) {
      await updateDesign.mutateAsync(values);
      setEditing(null);
      return;
    }

    await createDesign.mutateAsync(values);
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Sparkles aria-hidden="true" className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-slate-950">Design Library</h1>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Manage sample designs, customer preview media, cloth references, and practical style metadata for order entry.
          </p>
        </div>
      </header>

      <DesignForm
        key={editing?.id ?? 'new-design'}
        shopId={currentShopId}
        garments={garments}
        initialValues={editing ? designToFormValues(editing) : emptyDesignFormValues}
        submitLabel={editing ? 'Save design' : 'Create design'}
        onCancel={editing ? () => setEditing(null) : undefined}
        onSubmit={(values) => void submitDesign(values)}
        isSubmitting={createDesign.isPending || updateDesign.isPending}
        error={createDesign.error?.message ?? updateDesign.error?.message}
      />

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
        <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_14rem_auto] lg:items-end">
          <label className="relative block">
            <span className="mb-2 block text-sm font-medium text-slate-700">Search designs</span>
            <Search aria-hidden="true" className="pointer-events-none absolute bottom-4 left-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="min-h-12 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
              placeholder="Classic full sleeve formal shirt, SH-001, wedding"
            />
          </label>
          <SelectBox
            label="Garment"
            value={garmentFilter}
            options={[{ value: '', label: 'All garments' }, ...garments.map((garment) => ({ value: garment.id, label: garment.name }))]}
            onChange={setGarmentFilter}
          />
          <label className="flex min-h-12 items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" checked={includeArchived} onChange={(event) => setIncludeArchived(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
            Show archived
          </label>
        </div>

        {garmentsQuery.isLoading || designsQuery.isLoading ? <Loading label="Loading design library" /> : null}
        {designsQuery.isError ? <EmptyState icon={ShieldAlert} title="Could not load designs" message={designsQuery.error.message} /> : null}
        {designsQuery.data?.length === 0 ? <EmptyState icon={Image} title="No designs found" message="Create a design entry or change your filter." /> : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {designsQuery.data?.map((design) => {
            const garmentName = garmentNameById.get(design.garment_type_id) ?? 'Garment';
            const isArchived = Boolean(design.deleted_at || !design.is_active);

            return (
              <div key={design.id} className="rounded-lg border border-slate-200 p-3">
                <GarmentPreviewCard
                  title={design.design_code}
                  garmentName={garmentName}
                  designName={design.design_name}
                  styleCategory={design.style_category}
                  previewImageUrl={design.preview_image_url}
                  fabricReferenceUrl={design.cloth_reference_url}
                  fabricLabel="Library cloth/reference"
                  fabricSkippedText="No library cloth reference"
                  previewVideoUrl={design.preview_video_url}
                  measurementValues={{}}
                  styleValues={typeof design.style_metadata === 'object' && design.style_metadata && !Array.isArray(design.style_metadata) ? design.style_metadata : {}}
                  previewSummary={{ fit: typeof design.style_metadata === 'object' && design.style_metadata && !Array.isArray(design.style_metadata) ? design.style_metadata.fit : undefined }}
                  compact
                />
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', isArchived ? 'bg-slate-200 text-slate-700' : 'bg-emerald-50 text-emerald-700')}>
                      {isArchived ? 'Archived' : 'Active'}
                    </span>
                    {design.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{tag}</span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setEditing(design)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                      Edit
                    </button>
                    {isArchived ? (
                      <button type="button" onClick={() => void restoreDesign.mutateAsync(design.id)} className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
                        <RotateCcw aria-hidden="true" className="h-4 w-4" />
                        Restore
                      </button>
                    ) : (
                      <button type="button" onClick={() => void archiveDesign.mutateAsync(design.id)} className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100">
                        <Archive aria-hidden="true" className="h-4 w-4" />
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function DesignForm({
  shopId,
  garments,
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitting,
  error,
}: {
  shopId: string | null;
  garments: GarmentType[];
  initialValues: DesignFormValues;
  submitLabel: string;
  onSubmit: (values: DesignFormValues) => void;
  onCancel?: () => void;
  isSubmitting: boolean;
  error?: string;
}) {
  const [values, setValues] = useState<DesignFormValues>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPreview, setUploadingPreview] = useState(false);
  const [uploadingCloth, setUploadingCloth] = useState(false);
  const selectedGarment = garments.find((garment) => garment.id === values.garmentTypeId);
  const stylePreview = recordFromMetadataText(values.styleMetadataText);
  const isUploading = uploadingPreview || uploadingCloth;

  function update<K extends keyof DesignFormValues>(key: K, value: DesignFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = designFormSchema.safeParse(values);

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        nextErrors[issue.path.join('.')] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    onSubmit(parsed.data);
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg border border-slate-200 bg-white p-4 shadow-panel">
      <div className="grid gap-4 md:grid-cols-2">
        <SelectBox
          label="Garment type *"
          value={values.garmentTypeId}
          error={errors.garmentTypeId}
          options={garments.map((garment) => ({ value: garment.id, label: garment.name }))}
          onChange={(value) => update('garmentTypeId', value)}
        />
        <TextField label="Design name *" placeholder="Classic full sleeve formal shirt" value={values.name} error={errors.name} onChange={(event) => update('name', event.target.value)} />
        <TextField label="Design code *" placeholder="SH-001" value={values.code} error={errors.code} onChange={(event) => update('code', event.target.value.toUpperCase().replace(/\s+/g, '_'))} />
        <TextField label="Style category" placeholder="Formal / Casual / Wedding / Office" value={values.styleCategory} error={errors.styleCategory} onChange={(event) => update('styleCategory', event.target.value)} />
        <DesignImageUploadField
          label="Preview image upload"
          shopId={shopId}
          bucket="design-assets"
          folder="designs"
          imageUrl={values.previewImageUrl}
          onUploaded={(url) => update('previewImageUrl', url)}
          onClear={() => update('previewImageUrl', '')}
          onUploadingChange={setUploadingPreview}
        />
        <TextField label="Preview image URL" placeholder="Paste design/reference image URL" value={values.previewImageUrl} error={errors.previewImageUrl} onChange={(event) => update('previewImageUrl', event.target.value)} />
        <TextField label="Preview video URL optional" placeholder="Paste optional preview video URL" value={values.previewVideoUrl} error={errors.previewVideoUrl} onChange={(event) => update('previewVideoUrl', event.target.value)} />
        <DesignImageUploadField
          label="Cloth/reference image upload optional"
          shopId={shopId}
          bucket="design-assets"
          folder="designs"
          imageUrl={values.clothReferenceUrl}
          onUploaded={(url) => update('clothReferenceUrl', url)}
          onClear={() => update('clothReferenceUrl', '')}
          onUploadingChange={setUploadingCloth}
        />
        <TextField label="Cloth/reference image URL optional" placeholder="Paste fabric/reference image URL" value={values.clothReferenceUrl} error={errors.clothReferenceUrl} onChange={(event) => update('clothReferenceUrl', event.target.value)} />
        <TextField label="Sort order" type="number" value={values.sortOrder} error={errors.sortOrder} onChange={(event) => update('sortOrder', Number(event.target.value))} />
        <TextField label="Tags" placeholder="formal, wedding, premium" value={values.tagsText} error={errors.tagsText} description="Separate tags with commas." onChange={(event) => update('tagsText', event.target.value)} className="md:col-span-2" />
        <TextAreaField label="Description" placeholder="Short customer-facing design description" value={values.description} error={errors.description} onChange={(event) => update('description', event.target.value)} className="md:col-span-2" />
        <TextAreaField label="Style metadata JSON" value={values.styleMetadataText} error={errors.styleMetadataText} description='Example: {"fit":"Regular fit","collar":"Band","pocket":"Single"}' onChange={(event) => update('styleMetadataText', event.target.value)} className="font-mono md:col-span-2" />
      </div>
      {values.previewImageUrl ? (
        <div className="mt-4">
          <GarmentPreviewCard
            title={values.code || 'Design preview'}
            garmentName={selectedGarment?.name ?? 'Garment'}
            designName={values.name || 'New design'}
            styleCategory={values.styleCategory}
            previewImageUrl={values.previewImageUrl}
            fabricReferenceUrl={values.clothReferenceUrl}
            fabricLabel="Library cloth/reference"
            fabricSkippedText="No library cloth reference"
            previewVideoUrl={values.previewVideoUrl}
            measurementValues={{}}
            styleValues={stylePreview}
            previewSummary={{ fit: typeof stylePreview.fit === 'string' ? stylePreview.fit : undefined }}
            compact
          />
        </div>
      ) : null}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-h-10 items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={values.isActive} onChange={(event) => update('isActive', event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600" />
          Active in order entry
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          {onCancel ? (
            <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Cancel edit
            </button>
          ) : null}
          <button type="submit" disabled={isSubmitting || isUploading} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {isSubmitting ? 'Saving' : isUploading ? 'Uploading' : submitLabel}
          </button>
        </div>
      </div>
      {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
    </form>
  );
}

function DesignImageUploadField({
  label,
  shopId,
  bucket,
  folder,
  imageUrl,
  onUploaded,
  onClear,
  onUploadingChange,
}: {
  label: string;
  shopId: string | null;
  bucket: ImageUploadBucket;
  folder: string;
  imageUrl: string | undefined;
  onUploaded: (url: string) => void;
  onClear: () => void;
  onUploadingChange: (isUploading: boolean) => void;
}) {
  const inputId = useId();
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  function setUploading(value: boolean) {
    setIsUploading(value);
    onUploadingChange(value);
  }

  const currentImageUrl = imageUrl ?? '';

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    const validationError = validateImageFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!shopId) {
      setError('Select an active shop before uploading an image.');
      return;
    }

    setError('');
    setUploading(true);

    try {
      const result = await uploadImageToStorage({ bucket, shopId, folder, file });
      onUploaded(result.publicUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label htmlFor={inputId} className="text-sm font-semibold text-slate-800">{label}</label>
          <p className="mt-1 text-xs leading-5 text-slate-500">JPG, JPEG, PNG, or WEBP. Maximum 5 MB.</p>
        </div>
        {currentImageUrl ? (
          <button type="button" onClick={onClear} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100">
            <X aria-hidden="true" className="h-4 w-4" />
            Clear
          </button>
        ) : null}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_8rem]">
        <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-600 hover:bg-slate-50" htmlFor={inputId}>
          <Upload aria-hidden="true" className="mb-2 h-5 w-5 text-brand-700" />
          {isUploading ? 'Uploading image...' : 'Upload image'}
          <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" className="sr-only" onChange={(event) => void handleFileChange(event)} />
        </label>
        {currentImageUrl ? (
          <UploadPreviewImage src={currentImageUrl} />
        ) : (
          <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-400">No image</div>
        )}
      </div>
      {error ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-900">{error}</p> : null}
    </div>
  );
}

function UploadPreviewImage({ src }: { src: string }) {
  const [isBroken, setIsBroken] = useState(false);

  if (!isBroken) {
    return <img src={src} alt="" className="h-32 w-full rounded-lg border border-slate-200 bg-white object-cover" onError={() => setIsBroken(true)} />;
  }

  return (
    <div aria-label="Image unavailable" className="flex h-32 w-full items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-center text-xs font-semibold text-slate-500">
      Image unavailable
    </div>
  );
}

function recordFromMetadataText(value: string | undefined) {
  if (!value?.trim()) return {};

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function SelectBox({
  label,
  value,
  options,
  error,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(
          'min-h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100',
          error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : null,
        )}
      >
        {options.some((option) => option.value === '') ? null : <option value="">Select</option>}
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {error ? <span className="block text-sm font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
