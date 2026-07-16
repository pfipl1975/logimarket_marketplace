export type ControlledFilter = { attributeId: number; optionIds: number[] };
export type RangeFilter = { attributeId: number; min?: number; max?: number };
export type BooleanFilter = { attributeId: number; value: boolean };

export type FilterQueryInput = {
  categoryId: number;
  controlled?: ControlledFilter[];
  numbers?: RangeFilter[];
  years?: RangeFilter[];
  booleans?: BooleanFilter[];
  page?: number;
  pageSize?: number;
};

export type FilterErrorCode =
  | "INVALID_INPUT" | "INVALID_IDENTIFIER" | "INVALID_PAGINATION"
  | "EMPTY_OPTION_ARRAY" | "DUPLICATE_ATTRIBUTE_FILTER" | "NON_FINITE_NUMBER"
  | "INVALID_NUMERIC_BOUNDS" | "INVALID_YEAR_BOUNDS" | "UNKNOWN_CATEGORY" | "UNKNOWN_ATTRIBUTE"
  | "INACTIVE_ATTRIBUTE" | "ATTRIBUTE_NOT_ASSIGNED" | "INACTIVE_ASSIGNMENT"
  | "UNKNOWN_OPTION" | "OPTION_WRONG_ATTRIBUTE" | "INACTIVE_OPTION"
  | "INCOMPATIBLE_FILTER_TYPE";

export type FilterValidationError = { code: FilterErrorCode; attributeId?: number; optionId?: number };

export type NormalizedFilterQuery = {
  categoryId: number;
  controlled: ControlledFilter[];
  numbers: RangeFilter[];
  years: RangeFilter[];
  booleans: BooleanFilter[];
  page?: number;
  pageSize?: number;
};
