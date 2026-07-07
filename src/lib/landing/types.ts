import type { Locale } from "@/lib/i18n/config";

export type LandingLocale = Extract<Locale, "pl" | "en" | "de">;

export type LandingIntent =
  | "warehouse-equipment"
  | "intralogistics"
  | "picking-packing"
  | "ecommerce-warehouse"
  | "distribution-center"
  | "receiving-shipping"
  | "storage-systems"
  | "packaging-load-securing"
  | "warehouse-safety"
  | "forklift-attachments";

export interface LandingCategoryLink {
  label: string;
  categorySlug: string;
  context: string;
}

export interface LandingGlossaryLink {
  label: string;
  glossarySlug: string;
  context: string;
}

export interface LandingDecisionFactor {
  title: string;
  description: string;
}

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export interface LandingPageContent {
  intent: LandingIntent;
  locale: LandingLocale;
  slug: string;
  path: string;
  sectionLabel: string;
  title: string;
  eyebrow: string;
  intro: string;
  procurementContextTitle: string;
  procurementContext: string[];
  decisionGuidanceTitle: string;
  decisionFactors: LandingDecisionFactor[];
  relatedCategoriesTitle: string;
  relatedCategories: LandingCategoryLink[];
  relatedGlossaryTitle: string;
  relatedGlossaryTerms: LandingGlossaryLink[];
  faqTitle: string;
  faq: LandingFaqItem[];
  cta: {
    primaryLabel: string;
    primaryHref: string;
    secondaryLabel: string;
  };
  seo: {
    title: string;
    description: string;
  };
}
