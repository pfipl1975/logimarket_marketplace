import "server-only";

export {
  getCategoryAttributeConfigurationFromDb,
  validateCategoryId,
} from "./category-attribute-read-model-core";

export type {
  CategoryAttributeConfiguration,
  CategoryAttributeOption,
  AssignmentId,
  AttributeId,
  OptionId,
} from "./category-attribute-read-model-core";
