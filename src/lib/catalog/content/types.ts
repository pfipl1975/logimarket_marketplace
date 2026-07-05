export type CategoryContentLocale = "pl" | "en" | "de";

export type RelatedCategoryRelationType =
  | "parent_child"
  | "sibling_alternative"
  | "accessory"
  | "safety_dependency"
  | "process_next_step"
  | "compatibility"
  | "consumable"
  | "service_or_installation"
  | "comparison"
  | "replacement"
  | "application_context";

export type CategoryTechnicalParameter = {
  label: string;
  value: string;
};

export type CategoryInquiryChecklistGroup = {
  groupLabel: string;
  fields: string[];
};

export type CategoryInquiryChecklist = {
  description?: string;
  groups: CategoryInquiryChecklistGroup[];
};

export type CategoryFaqItem = {
  question: string;
  answer: string;
};

export type RelatedCategoryEdge = {
  targetSlug: string;
  relationType: RelatedCategoryRelationType;
  priority: number;
  context?: string;
  reciprocal?: boolean;
};

export type CategoryContentSeed = {
  slug: string;
  locale: CategoryContentLocale;
  intro?: string;
  definition?: string;
  applications?: string[];
  decisionFactors?: string[];
  inquiryChecklist?: CategoryInquiryChecklist;
  technicalParameters?: CategoryTechnicalParameter[];
  faq?: CategoryFaqItem[];
  relatedCategoryEdges?: RelatedCategoryEdge[];
};

export type CategoryContentMap = Record<string, CategoryContentSeed>;
