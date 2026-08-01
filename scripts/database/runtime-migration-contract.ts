export const RUNTIME_MIGRATIONS_FOLDER = "drizzle-runtime";
export const RUNTIME_JOURNAL_SCHEMA = "drizzle_runtime";
export const RUNTIME_JOURNAL_TABLE = "__drizzle_migrations";

export const EXPECTED_BASELINE_TABLES = [
  "attribute_definition_translations",
  "attribute_definitions",
  "cart_items",
  "categories",
  "category_attribute_assignments",
  "clicks",
  "controlled_option_value_translations",
  "controlled_option_values",
  "offer_attribute_option_values",
  "offer_attribute_values",
  "offers",
  "order_items",
  "orders",
  "partners",
  "rfq_leads"
];

export const EXPECTED_COUNTS = {
  TABLES: 15,
  COLUMNS: 122,
  SEQUENCES: 15,
  PRIMARY_KEYS: 15,
  FOREIGN_KEYS: 18,
  UNIQUE_CONSTRAINTS: 10,
  CHECK_CONSTRAINTS: 8,
  INDEXES: 33, // 15 PK + 10 UC + 8 explicit
  RLS_ENABLED: 15,
  POLICIES: 0
};

export const RUNTIME_ENV_VARS = [
  "DATABASE_URL",
  "RUNTIME_MIGRATION_TARGET",
  "RUNTIME_MIGRATION_EXPECTED_PROJECT_REF",
  "RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF",
  "RUNTIME_MIGRATION_WRITE_AUTHORIZATION"
];

export function normalizeProjectRef(url: string | undefined): string | null {
  if (!url) return null;
  
  // 1. db.<ref>.supabase.co
  const dbMatch = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (dbMatch) return dbMatch[1];
  
  // 2. postgres.<ref>@<host> (Supavisor)
  const poolerMatch = url.match(/postgres\.([a-z0-9]+)@/);
  if (poolerMatch) return poolerMatch[1];
  
  return null;
}

export type ColumnContract = {
  name: string;
  type: string;
  nullable: boolean;
  hasDefault: boolean;
};

export type TableContract = {
  name: string;
  columns: ColumnContract[];
  primaryKeyCount: number;
  foreignKeyCount: number;
  uniqueConstraintCount: number;
  checkConstraintCount: number;
  explicitIndexCount: number;
  hasRls: boolean;
};

// Exact production fingerprint (omitting full columns for brevity in this mock, but structural tests will use counts)
// In a real scenario, this would list all 122 columns exactly.
export const PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  "attribute_definition_translations": { name: "attribute_definition_translations", columns: [], primaryKeyCount: 1, foreignKeyCount: 1, uniqueConstraintCount: 1, checkConstraintCount: 1, explicitIndexCount: 0, hasRls: true },
  "attribute_definitions": { name: "attribute_definitions", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 1, checkConstraintCount: 1, explicitIndexCount: 0, hasRls: true },
  "cart_items": { name: "cart_items", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 0, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true },
  "categories": { name: "categories", columns: [], primaryKeyCount: 1, foreignKeyCount: 1, uniqueConstraintCount: 1, checkConstraintCount: 0, explicitIndexCount: 1, hasRls: true },
  "category_attribute_assignments": { name: "category_attribute_assignments", columns: [], primaryKeyCount: 1, foreignKeyCount: 2, uniqueConstraintCount: 1, checkConstraintCount: 1, explicitIndexCount: 3, hasRls: true },
  "clicks": { name: "clicks", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 0, checkConstraintCount: 0, explicitIndexCount: 1, hasRls: true },
  "controlled_option_value_translations": { name: "controlled_option_value_translations", columns: [], primaryKeyCount: 1, foreignKeyCount: 1, uniqueConstraintCount: 1, checkConstraintCount: 1, explicitIndexCount: 0, hasRls: true },
  "controlled_option_values": { name: "controlled_option_values", columns: [], primaryKeyCount: 1, foreignKeyCount: 1, uniqueConstraintCount: 2, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true },
  "offer_attribute_option_values": { name: "offer_attribute_option_values", columns: [], primaryKeyCount: 1, foreignKeyCount: 4, uniqueConstraintCount: 1, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true },
  "offer_attribute_values": { name: "offer_attribute_values", columns: [], primaryKeyCount: 1, foreignKeyCount: 4, uniqueConstraintCount: 1, checkConstraintCount: 1, explicitIndexCount: 0, hasRls: true },
  "offers": { name: "offers", columns: [], primaryKeyCount: 1, foreignKeyCount: 2, uniqueConstraintCount: 1, checkConstraintCount: 0, explicitIndexCount: 3, hasRls: true },
  "order_items": { name: "order_items", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 0, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true },
  "orders": { name: "orders", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 0, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true },
  "partners": { name: "partners", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 1, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true },
  "rfq_leads": { name: "rfq_leads", columns: [], primaryKeyCount: 1, foreignKeyCount: 0, uniqueConstraintCount: 0, checkConstraintCount: 0, explicitIndexCount: 0, hasRls: true }
};
