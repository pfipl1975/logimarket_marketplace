export interface GlossaryTerm {
  slug: string;
  term: string;
  shortDefinition: string;
  definition: string[];
  applications?: string[];
  relatedTerms?: string[];
  relatedCategories?: string[];
  synonyms?: string[];
  faq?: {
    question: string;
    answer: string;
  }[];
}

export type GlossaryContentMap = Record<string, GlossaryTerm>;
