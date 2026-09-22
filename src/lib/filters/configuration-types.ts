export const catalogFilterKinds = ["enum", "multi_enum", "number", "year", "boolean"] as const;

export type CatalogFilterKind = (typeof catalogFilterKinds)[number];

export type CatalogFilterOption = {
  optionId: number;
  label: string;
};

export type CatalogFilterDefinition = {
  attributeId: number;
  filterKind: CatalogFilterKind;
  label: string;
  unit: string | null;
  sortOrder: number;
  options: CatalogFilterOption[];
};

export type CatalogFilterConfiguration = {
  categoryId: number;
  filters: CatalogFilterDefinition[];
};

export type CatalogFilterConfigurationInput = {
  categoryId: unknown;
  locale: unknown;
};

export type CatalogFilterConfigurationErrorCode =
  | "INVALID_CATEGORY_ID"
  | "INVALID_LOCALE"
  | "CATEGORY_ANCESTRY_CYCLE"
  | "CATEGORY_ANCESTRY_DEPTH_LIMIT"
  | "INVALID_DATABASE_VALUE"
  | "INVALID_CONFIGURATION_DTO";

export class CatalogFilterConfigurationError extends Error {
  constructor(public readonly code: CatalogFilterConfigurationErrorCode) {
    super(code);
    this.name = "CatalogFilterConfigurationError";
  }
}
