import { builtInDesignCatalog } from './designCatalog';
import type {
  BuiltInGarmentDesignFamily,
  DesignSelectionState,
  GarmentDesignCategory,
  SelectedDesignCategorySnapshot,
  SelectedDesignDetailsSnapshot,
} from './designSelectionTypes';

export type DesignSelectionEntry = {
  key: string;
  label: string;
  value: string;
};

export function garmentDesignFamilyFromName(garmentName: string | null | undefined): BuiltInGarmentDesignFamily {
  const normalized = normalizeText(garmentName ?? '');

  if (matchesAny(normalized, ['suit', 'blazer', 'coat', 'waistcoat', 'coti', 'safari'])) {
    return 'suit';
  }

  if (matchesAny(normalized, ['shirt'])) {
    return 'shirt';
  }

  if (matchesAny(normalized, ['pant', 'trouser'])) {
    return 'pant';
  }

  if (matchesAny(normalized, ['panjabi', 'punjabi', 'kurta', 'jubba', 'kabuli'])) {
    return 'panjabi';
  }

  return 'generic';
}

export function getBuiltInDesignCategories(garmentName: string | null | undefined): GarmentDesignCategory[] {
  const family = garmentDesignFamilyFromName(garmentName);
  return builtInDesignCatalog[family];
}

export function selectionsFromDesignSnapshot(snapshot: unknown): DesignSelectionState {
  const record = recordFromUnknown(snapshot);
  const categoryRecords = categoryRecordsFromSnapshot(record);

  return categoryRecords.reduce<DesignSelectionState>((selection, categoryRecord) => {
    const categoryKey = stringValue(categoryRecord.categoryKey) || stringValue(categoryRecord.category_key);
    if (!categoryKey) return selection;

    const selectedOptions = arrayOfRecords(categoryRecord.selectedOptions ?? categoryRecord.selected_options)
      .map((optionRecord) => stringValue(optionRecord.optionKey) || stringValue(optionRecord.option_key))
      .filter(Boolean);

    if (selectedOptions.length > 0) {
      selection[categoryKey] = selectedOptions;
    }

    return selection;
  }, {});
}

export function buildDesignDetailsSnapshot({
  garmentName,
  categories,
  selections,
}: {
  garmentName: string;
  categories: GarmentDesignCategory[];
  selections: DesignSelectionState;
}): SelectedDesignDetailsSnapshot {
  const garmentFamily = garmentDesignFamilyFromName(garmentName);
  const selectedCategories = categories
    .map((category): SelectedDesignCategorySnapshot | null => {
      const selectedKeys = selections[category.categoryKey] ?? [];
      const selectedOptions = category.options
        .filter((option) => selectedKeys.includes(option.optionKey))
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((option) => ({
          optionKey: option.optionKey,
          optionName: option.optionName,
          description: option.description,
          svgIconKey: option.svgIconKey,
          imageUrl: option.imageUrl ?? null,
        }));

      if (selectedOptions.length === 0) {
        return null;
      }

      return {
        categoryKey: category.categoryKey,
        categoryName: category.categoryName,
        selectionType: category.selectionType,
        selectedOptions,
      };
    })
    .filter((category): category is SelectedDesignCategorySnapshot => Boolean(category));
  const summary = designSummaryFromCategories(selectedCategories);
  const designName = `${garmentName || 'Garment'} Design Details`;
  const designCode = `BUILT_IN_${garmentFamily.toUpperCase()}_DESIGN`;
  const selectedOptionCount = selectedCategories.reduce((count, category) => count + category.selectedOptions.length, 0);
  const selectionTimestamp = new Date().toISOString();

  return {
    source: 'built_in_catalog',
    garmentType: garmentName || 'Garment',
    garmentFamily,
    design_name: designName,
    design_code: designCode,
    name: designName,
    code: designCode,
    categories: selectedCategories,
    selectedCategories,
    summary,
    summaryText: summary,
    selectedDesignIconKeys: selectedCategories.flatMap((category) => category.selectedOptions.map((option) => option.svgIconKey)),
    selectedCategoryCount: selectedCategories.length,
    selectedOptionCount,
    requiredCategoryCount: requiredDesignCategoryCount(categories),
    selectionTimestamp,
    selection_timestamp: selectionTimestamp,
  };
}

export function designSummaryFromSnapshot(snapshot: unknown, limit = 10): string {
  const record = recordFromUnknown(snapshot);
  const storedSummary = stringValue(record.summary);

  if (storedSummary) {
    return storedSummary;
  }

  const entries = designSelectionEntriesFromSnapshot(record);

  if (entries.length === 0) {
    return 'No design details selected';
  }

  return entries
    .slice(0, limit)
    .map((entry) => entry.value)
    .join(', ');
}

export function designSelectionEntriesFromSnapshot(snapshot: unknown): DesignSelectionEntry[] {
  const record = recordFromUnknown(snapshot);
  const categoryRecords = categoryRecordsFromSnapshot(record);

  return categoryRecords.flatMap((categoryRecord) => {
    const categoryKey = stringValue(categoryRecord.categoryKey) || stringValue(categoryRecord.category_key);
    const categoryName = stringValue(categoryRecord.categoryName) || stringValue(categoryRecord.category_name) || labelFromKey(categoryKey);
    const optionNames = arrayOfRecords(categoryRecord.selectedOptions ?? categoryRecord.selected_options)
      .map((optionRecord) => stringValue(optionRecord.optionName) || stringValue(optionRecord.option_name))
      .filter(Boolean);

    if (!categoryKey || optionNames.length === 0) {
      return [];
    }

    return [{ key: categoryKey, label: categoryName, value: optionNames.join(', ') }];
  });
}

export function styleValuesFromDesignSnapshot(snapshot: unknown): Record<string, unknown> {
  return designSelectionEntriesFromSnapshot(snapshot).reduce<Record<string, unknown>>((values, entry) => {
    values[entry.key] = entry.value;
    return values;
  }, {});
}

export function hasDesignSelections(snapshot: unknown): boolean {
  return designSelectionEntriesFromSnapshot(snapshot).length > 0;
}

export function selectedDesignCategoryCount(snapshot: unknown): number {
  return designSelectionEntriesFromSnapshot(snapshot).length;
}

export function requiredDesignCategoryCount(categories: GarmentDesignCategory[]): number {
  return categories.filter((category) => category.required).length;
}

export function selectedRequiredDesignCategoryCount(categories: GarmentDesignCategory[], selections: DesignSelectionState): number {
  return categories.filter((category) => category.required && (selections[category.categoryKey]?.length ?? 0) > 0).length;
}

export function designOptionNamesForCategory(snapshot: unknown, categoryKeys: string[]): string[] {
  const requested = new Set(categoryKeys.map(normalizeKey));

  return designSelectionEntriesFromSnapshot(snapshot)
    .filter((entry) => requested.has(normalizeKey(entry.key)))
    .map((entry) => entry.value);
}

function categoryRecordsFromSnapshot(record: Record<string, unknown>): Record<string, unknown>[] {
  const categories = arrayOfRecords(record.categories);

  if (categories.length > 0) {
    return categories;
  }

  return arrayOfRecords(record.selectedCategories ?? record.selected_categories);
}

function designSummaryFromCategories(categories: SelectedDesignCategorySnapshot[]): string {
  const optionNames = categories.flatMap((category) => category.selectedOptions.map((option) => option.optionName));

  if (optionNames.length === 0) {
    return 'No design details selected';
  }

  const visible = optionNames.slice(0, 8);
  const suffix = optionNames.length > visible.length ? `, +${optionNames.length - visible.length} more` : '';
  return `${visible.join(', ')}${suffix}`;
}

function labelFromKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || 'Design Detail';
}

function recordFromUnknown(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function arrayOfRecords(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    const record = recordFromUnknown(entry);
    return Object.keys(record).length > 0 ? [record] : [];
  });
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function matchesAny(value: string, candidates: string[]): boolean {
  return candidates.some((candidate) => value.includes(candidate));
}
