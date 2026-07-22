import { useMemo, useRef, useState } from 'react';
import { DesignOptionPreviewModal } from './DesignOptionPreviewModal';
import { DesignSelectionSheet } from './DesignSelectionSheet';
import {
  buildDesignDetailsSnapshot,
  getBuiltInDesignCategories,
  requiredDesignCategoryCount,
  selectedRequiredDesignCategoryCount,
  selectionsFromDesignSnapshot,
} from './designSelectionUtils';
import type {
  DesignSelectionState,
  GarmentDesignCategory,
  GarmentDesignOption,
  SelectedDesignDetailsSnapshot,
} from './designSelectionTypes';

type DesignSelectionModalProps = {
  garmentName: string;
  itemNumber: number;
  initialSnapshot?: Record<string, unknown>;
  onClose: () => void;
  onSave: (snapshot: SelectedDesignDetailsSnapshot) => void;
  onContinueToMeasurement?: () => void;
};

type PreviewTarget = {
  category: GarmentDesignCategory;
  option: GarmentDesignOption;
};

export function DesignSelectionModal({
  garmentName,
  itemNumber,
  initialSnapshot,
  onClose,
  onSave,
  onContinueToMeasurement,
}: DesignSelectionModalProps) {
  const categories = useMemo(() => getBuiltInDesignCategories(garmentName), [garmentName]);
  const [selections, setSelections] = useState<DesignSelectionState>(() => selectionsFromDesignSnapshot(initialSnapshot));
  const [search, setSearch] = useState('');
  const [previewTarget, setPreviewTarget] = useState<PreviewTarget | null>(null);
  const [validationMessage, setValidationMessage] = useState('');
  const [saveNotice, setSaveNotice] = useState('');
  const [highlightMissingKeys, setHighlightMissingKeys] = useState<Set<string>>(() => new Set());
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const visibleCategories = useMemo(() => filterCategories(categories, search), [categories, search]);
  const selectedCategoryCount = categories.filter((category) => (selections[category.categoryKey]?.length ?? 0) > 0).length;
  const requiredCount = requiredDesignCategoryCount(categories);
  const selectedRequiredCount = selectedRequiredDesignCategoryCount(categories, selections);
  const missingRequiredCategories = useMemo(
    () => categories.filter((category) => category.required && (selections[category.categoryKey]?.length ?? 0) === 0),
    [categories, selections],
  );
  const missingRequiredCount = missingRequiredCategories.length;

  function snapshotFromSelections() {
    return buildDesignDetailsSnapshot({ garmentName, categories, selections });
  }

  function saveSelection() {
    onSave(snapshotFromSelections());
    setSaveNotice('Design selection saved.');
  }

  function clearSelection() {
    setSelections({});
    setValidationMessage('');
    setSaveNotice('');
    setHighlightMissingKeys(new Set());
  }

  function saveAndContinue() {
    if (!validateRequiredCategories()) return;

    onSave(snapshotFromSelections());
    onClose();
    onContinueToMeasurement?.();
  }

  function chooseOption(category: GarmentDesignCategory, option: GarmentDesignOption, forceSelected = false) {
    setSelections((current) => {
      const selectedKeys = current[category.categoryKey] ?? [];
      const isSelected = selectedKeys.includes(option.optionKey);
      const nextKeys = category.selectionType === 'multiple'
        ? forceSelected
          ? isSelected
            ? selectedKeys
            : [...selectedKeys, option.optionKey]
          : isSelected
            ? selectedKeys.filter((key) => key !== option.optionKey)
            : [...selectedKeys, option.optionKey]
        : [option.optionKey];

      return { ...current, [category.categoryKey]: nextKeys };
    });
    setPreviewTarget(null);
    setSaveNotice('');
    setValidationMessage('');
    setHighlightMissingKeys((current) => {
      if (!current.has(category.categoryKey)) return current;
      const next = new Set(current);
      next.delete(category.categoryKey);
      return next;
    });
  }

  function validateRequiredCategories() {
    if (missingRequiredCategories.length === 0) {
      setValidationMessage('');
      setHighlightMissingKeys(new Set());
      return true;
    }

    const missingNames = missingRequiredCategories.map((category) => category.categoryName);
    const missingKeys = new Set(missingRequiredCategories.map((category) => category.categoryKey));
    const firstMissingKey = missingRequiredCategories[0]?.categoryKey;

    setSearch('');
    setSaveNotice('');
    setHighlightMissingKeys(missingKeys);
    setValidationMessage(`Please select required design options before measurement: ${missingNames.join(', ')}.`);

    window.setTimeout(() => {
      if (!firstMissingKey) return;
      const firstMissingElement = categoryRefs.current[firstMissingKey];
      firstMissingElement?.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
      firstMissingElement?.focus?.({ preventScroll: true });
    }, 0);

    return false;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-stretch justify-center bg-slate-950/70 p-0 sm:p-3" role="dialog" aria-modal="true" aria-labelledby="design-selection-title">
      <DesignSelectionSheet
        garmentName={garmentName}
        itemNumber={itemNumber}
        categories={categories}
        visibleCategories={visibleCategories}
        selections={selections}
        search={search}
        selectedCategoryCount={selectedCategoryCount}
        requiredCount={requiredCount}
        selectedRequiredCount={selectedRequiredCount}
        missingRequiredCount={missingRequiredCount}
        validationMessage={validationMessage}
        saveNotice={saveNotice}
        highlightMissingKeys={highlightMissingKeys}
        categoryRefs={categoryRefs}
        onSearchChange={setSearch}
        onClearSelection={clearSelection}
        onClose={onClose}
        onSaveSelection={saveSelection}
        onSaveAndContinue={saveAndContinue}
        onSelectOption={(selectedCategory, option) => chooseOption(selectedCategory, option)}
        onPreviewOption={(selectedCategory, option) => setPreviewTarget({ category: selectedCategory, option })}
      />

      {previewTarget ? (
        <DesignOptionPreviewModal
          category={previewTarget.category}
          option={previewTarget.option}
          selected={(selections[previewTarget.category.categoryKey] ?? []).includes(previewTarget.option.optionKey)}
          onClose={() => setPreviewTarget(null)}
          onChoose={() => chooseOption(previewTarget.category, previewTarget.option, true)}
        />
      ) : null}
    </div>
  );
}

function filterCategories(categories: GarmentDesignCategory[], search: string): GarmentDesignCategory[] {
  const normalized = search.trim().toLowerCase();
  if (!normalized) return categories;

  return categories.flatMap((category) => {
    const categoryMatches = `${category.categoryName} ${category.description}`.toLowerCase().includes(normalized);
    const options = categoryMatches
      ? category.options
      : category.options.filter((option) => `${option.optionName} ${option.description}`.toLowerCase().includes(normalized));

    if (options.length === 0) {
      return [];
    }

    return [{ ...category, options }];
  });
}
