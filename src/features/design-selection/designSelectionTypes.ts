export type BuiltInGarmentDesignFamily = 'suit' | 'shirt' | 'pant' | 'panjabi' | 'generic';

export type DesignSelectionType = 'single' | 'multiple';

export type GarmentDesignOption = {
  id: string;
  categoryKey: string;
  optionKey: string;
  optionName: string;
  description: string;
  svgIconKey: string;
  imageUrl?: string | null;
  isDefault?: boolean;
  sortOrder: number;
  metadata?: Record<string, unknown>;
};

export type GarmentDesignCategory = {
  id: string;
  garmentType: BuiltInGarmentDesignFamily;
  categoryKey: string;
  categoryName: string;
  description: string;
  selectionType: DesignSelectionType;
  required: boolean;
  sortOrder: number;
  options: GarmentDesignOption[];
};

export type DesignSelectionState = Record<string, string[]>;

export type SelectedDesignOptionSnapshot = {
  optionKey: string;
  optionName: string;
  description: string;
  svgIconKey: string;
  imageUrl?: string | null;
};

export type SelectedDesignCategorySnapshot = {
  categoryKey: string;
  categoryName: string;
  selectionType: DesignSelectionType;
  selectedOptions: SelectedDesignOptionSnapshot[];
};

export type SelectedDesignDetailsSnapshot = {
  source: 'built_in_catalog';
  garmentType: string;
  garmentFamily: BuiltInGarmentDesignFamily;
  design_name: string;
  design_code: string;
  name: string;
  code: string;
  categories: SelectedDesignCategorySnapshot[];
  selectedCategories: SelectedDesignCategorySnapshot[];
  summary: string;
  summaryText: string;
  selectedDesignIconKeys: string[];
  selectedCategoryCount: number;
  selectedOptionCount: number;
  requiredCategoryCount: number;
  selectionTimestamp: string;
  selection_timestamp: string;
};
