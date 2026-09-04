export const RUNTIME_MIGRATIONS_FOLDER = "drizzle-runtime";

export const MARKETPLACE_ORDER_RLS_TARGET_TABLES = [
  "buyer_legal_context_snapshots",
  "marketplace_orders",
  "marketplace_order_seller_disclosures",
  "seller_orders",
  "seller_order_seller_snapshots",
  "seller_order_items",
  "seller_acceptance_decisions",
] as const;
export const RUNTIME_JOURNAL_SCHEMA = "drizzle_runtime";
export const RUNTIME_JOURNAL_TABLE = "__drizzle_migrations";

export const EXPECTED_POST_0008_TABLES = [
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
  "rfq_leads",
  "seller_eligibility",
  "seller_legal_identities",
  "seller_registry_identifiers",
  "seller_tax_identifiers",
  "seller_verification_events",
  "buyer_legal_context_snapshots",
  "marketplace_orders",
  "marketplace_order_seller_disclosures",
  "seller_orders",
  "seller_order_seller_snapshots",
  "seller_order_items",
  "seller_acceptance_decisions"
];

export const EXPECTED_POST_0009_TABLES = [
  ...EXPECTED_POST_0008_TABLES,
  "agreement_versions",
  "partner_agreement_execution_evidence",
  "partner_agreement_evidence_invalidations"
];

export const EXPECTED_BASELINE_TABLES = EXPECTED_POST_0009_TABLES;

export const EXPECTED_COUNTS = {
  get TABLES() { return Object.keys(PRODUCTION_FINGERPRINT).length; },
  get COLUMNS() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.columns.length, 0); },
  get SEQUENCES() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.columns.filter((c) => c.sequenceName !== null).length, 0); },
  get PRIMARY_KEYS() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.constraints.filter((c) => c.type === "PRIMARY KEY").length, 0); },
  get FOREIGN_KEYS() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.constraints.filter((c) => c.type === "FOREIGN KEY").length, 0); },
  get UNIQUE_CONSTRAINTS() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.constraints.filter((c) => c.type === "UNIQUE").length, 0); },
  get CHECK_CONSTRAINTS() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.constraints.filter((c) => c.type === "CHECK").length, 0); },
  get INDEXES() { return this.PRIMARY_KEYS + this.UNIQUE_CONSTRAINTS + Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + b.explicitIndexes.length, 0); },
  get RLS_ENABLED() { return Object.values(PRODUCTION_FINGERPRINT).filter((table) => table.rlsEnabled).length; },
  get POLICIES() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + (b.policyCount ?? 0), 0); },
  get TRIGGERS() { return Object.values(PRODUCTION_FINGERPRINT).reduce((a, b) => a + (b.triggerCount ?? 0), 0); }
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
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith('.supabase.co')) {
      const parts = parsed.hostname.split('.');
      if (parts.length >= 4 && parts[0] === 'db') {
        return parts[1];
      }
    }
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
      return 'localhost';
    }
    if (parsed.username) {
      const username = decodeURIComponent(parsed.username);
      const parts = username.split('.');
      if (parts.length === 2 && parts[0] === 'postgres') {
        return parts[1];
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

export type ColumnContract = {
  name: string;
  type: string;
  nullable: boolean;
  defaultVal: string | null;
  sequenceName: string | null;
};

export type SequenceContract = {
  name: string;
  ownedByTable: string;
  ownedByColumn: string;
  dataType: string;
};

export type ConstraintContract = {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  definition: string;
  isValidated?: boolean;
};

export type IndexContract = {
  name: string;
  method: string;
  expressions: string;
};

export type TableContract = {
  name: string;
  columns: ColumnContract[];
  constraints: ConstraintContract[];
  explicitIndexes: IndexContract[];
  rlsEnabled: boolean;
  rlsForced?: boolean;
  policyCount?: number;
  triggerCount?: number;
};

// ---------------------------------------------------------------------------
// 1. CANONICAL_0000_BASELINE_FINGERPRINT
// Exact physical state after 0000_production_runtime_baseline.sql on empty DB
// ---------------------------------------------------------------------------
export const CANONICAL_0000_BASELINE_FINGERPRINT: Record<string, TableContract> = {
  "attribute_definitions": {
    name: "attribute_definitions",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('attribute_definitions_id_seq'::regclass)", sequenceName: "attribute_definitions_id_seq" },
      { name: "stable_key", type: "text", nullable: false, defaultVal: null, sequenceName: null },
      { name: "data_type", type: "character varying(30)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "is_active", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "attribute_definitions_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_ad_stable_key", type: "UNIQUE", definition: "UNIQUE (stable_key)" },
      { name: "chk_ad_data_type", type: "CHECK", definition: "CHECK (((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'year'::character varying, 'enum'::character varying, 'multi_enum'::character varying])::text[])))" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "categories": {
    name: "categories",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('categories_id_seq'::regclass)", sequenceName: "categories_id_seq" },
      { name: "name", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "slug", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "parent_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp without time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "categories_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "categories_slug_key", type: "UNIQUE", definition: "UNIQUE (slug)" },
      { name: "categories_parent_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (parent_id) REFERENCES categories(id)" }
    ],
    explicitIndexes: [
      { name: "idx_categories_parent", method: "btree", expressions: "parent_id" }
    ],
    rlsEnabled: true
  },
  "partners": {
    name: "partners",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('partners_id_seq'::regclass)", sequenceName: "partners_id_seq" },
      { name: "company_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "logo_url", type: "character varying(512)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "contact_email", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp without time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "website_url", type: "character varying", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "partners_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "controlled_option_values": {
    name: "controlled_option_values",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('controlled_option_values_id_seq'::regclass)", sequenceName: "controlled_option_values_id_seq" },
      { name: "attribute_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "stable_key", type: "text", nullable: false, defaultVal: null, sequenceName: null },
      { name: "is_active", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "controlled_option_values_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_cov_attr_option", type: "UNIQUE", definition: "UNIQUE (attribute_id, stable_key)" },
      { name: "uq_cov_attribute_id_pair", type: "UNIQUE", definition: "UNIQUE (attribute_id, id)" },
      { name: "fk_cov_attribute", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "attribute_definition_translations": {
    name: "attribute_definition_translations",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('attribute_definition_translations_id_seq'::regclass)", sequenceName: "attribute_definition_translations_id_seq" },
      { name: "attribute_definition_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "locale", type: "character varying(10)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "name", type: "text", nullable: false, defaultVal: null, sequenceName: null },
      { name: "short_label", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "description", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "attribute_definition_translations_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_adt_attribute_locale", type: "UNIQUE", definition: "UNIQUE (attribute_definition_id, locale)" },
      { name: "fk_adt_attribute_definition", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_definition_id) REFERENCES attribute_definitions(id)" },
      { name: "chk_adt_locale", type: "CHECK", definition: "CHECK (((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[])))" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "controlled_option_value_translations": {
    name: "controlled_option_value_translations",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('controlled_option_value_translations_id_seq'::regclass)", sequenceName: "controlled_option_value_translations_id_seq" },
      { name: "controlled_option_value_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "locale", type: "character varying(10)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "label", type: "text", nullable: false, defaultVal: null, sequenceName: null },
      { name: "description", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "controlled_option_value_translations_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_covt_option_locale", type: "UNIQUE", definition: "UNIQUE (controlled_option_value_id, locale)" },
      { name: "fk_covt_controlled_option_value", type: "FOREIGN KEY", definition: "FOREIGN KEY (controlled_option_value_id) REFERENCES controlled_option_values(id)" },
      { name: "chk_covt_locale", type: "CHECK", definition: "CHECK (((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[])))" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "category_attribute_assignments": {
    name: "category_attribute_assignments",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('category_attribute_assignments_id_seq'::regclass)", sequenceName: "category_attribute_assignments_id_seq" },
      { name: "category_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "attribute_definition_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "sort_order", type: "integer", nullable: false, defaultVal: "0", sequenceName: null },
      { name: "is_filterable", type: "boolean", nullable: false, defaultVal: "false", sequenceName: null },
      { name: "is_comparable", type: "boolean", nullable: false, defaultVal: "false", sequenceName: null },
      { name: "is_required", type: "boolean", nullable: false, defaultVal: "false", sequenceName: null },
      { name: "is_visible", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "unit_code", type: "character varying(20)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "category_attribute_assignments_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_caa_category_attribute", type: "UNIQUE", definition: "UNIQUE (category_id, attribute_definition_id)" },
      { name: "fk_caa_attribute_definition", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_definition_id) REFERENCES attribute_definitions(id)" },
      { name: "fk_caa_category", type: "FOREIGN KEY", definition: "FOREIGN KEY (category_id) REFERENCES categories(id)" },
      { name: "chk_caa_sort_order", type: "CHECK", definition: "CHECK ((sort_order >= 0))" }
    ],
    explicitIndexes: [
      { name: "idx_caa_attribute", method: "btree", expressions: "attribute_definition_id" },
      { name: "idx_caa_cat_filterable_sort", method: "btree", expressions: "category_id, is_filterable, sort_order" },
      { name: "idx_caa_cat_visible_sort", method: "btree", expressions: "category_id, is_visible, sort_order" }
    ],
    rlsEnabled: true
  },
  "offers": {
    name: "offers",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('offers_id_seq'::regclass)", sequenceName: "offers_id_seq" },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "category_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "title", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "price_brutto", type: "numeric", nullable: true, defaultVal: null, sequenceName: null },
      { name: "outbound_url", type: "character varying(512)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "technical_attributes", type: "jsonb", nullable: false, defaultVal: "'{}'::jsonb", sequenceName: null },
      { name: "offer_model", type: "character varying(20)", nullable: false, defaultVal: "'rfq'::character varying", sequenceName: null },
      { name: "description", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "image_url", type: "character varying(512)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "price_on_request", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "conversion_type", type: "character varying(20)", nullable: false, defaultVal: "'outbound'::character varying", sequenceName: null },
      { name: "is_featured", type: "boolean", nullable: false, defaultVal: "false", sequenceName: null },
      { name: "is_active", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "publication_status", type: "character varying(20)", nullable: false, defaultVal: "'draft'::character varying", sequenceName: null },
      { name: "published_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "archived_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "deleted_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "offers_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "offers_category_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (category_id) REFERENCES categories(id)" },
      { name: "offers_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)" },
      { name: "offers_conversion_type_check", type: "CHECK", definition: "CHECK (((conversion_type)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))" },
      { name: "offers_offer_model_check", type: "CHECK", definition: "CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'marketplace'::character varying])::text[])))" },
      { name: "offers_publication_status_check", type: "CHECK", definition: "CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))" }
    ],
    explicitIndexes: [
      { name: "idx_offers_category", method: "btree", expressions: "category_id" },
      { name: "idx_offers_partner", method: "btree", expressions: "partner_id" },
      { name: "idx_offers_tech_attributes", method: "gin", expressions: "technical_attributes" }
    ],
    rlsEnabled: true
  },
  "cart_items": {
    name: "cart_items",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('cart_items_id_seq'::regclass)", sequenceName: "cart_items_id_seq" },
      { name: "session_hash", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "quantity", type: "integer", nullable: false, defaultVal: "1", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: true, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "cart_items_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "cart_items_session_hash_offer_id_key", type: "UNIQUE", definition: "UNIQUE (session_hash, offer_id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "clicks": {
    name: "clicks",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('clicks_id_seq'::regclass)", sequenceName: "clicks_id_seq" },
      { name: "offer_id", type: "integer", nullable: true, defaultVal: null, sequenceName: null },
      { name: "partner_id", type: "integer", nullable: true, defaultVal: null, sequenceName: null },
      { name: "clicked_at", type: "timestamp without time zone", nullable: true, defaultVal: "CURRENT_TIMESTAMP", sequenceName: null },
      { name: "session_hash", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "ip_hash", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "is_unique_24h", type: "boolean", nullable: true, defaultVal: "true", sequenceName: null }
    ],
    constraints: [
      { name: "clicks_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "clicks_offer_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (offer_id) REFERENCES offers(id)" },
      { name: "clicks_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)" }
    ],
    explicitIndexes: [
      { name: "idx_clicks_tracking", method: "btree", expressions: "offer_id, partner_id, clicked_at" }
    ],
    rlsEnabled: true
  },
  "offer_attribute_values": {
    name: "offer_attribute_values",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('offer_attribute_values_id_seq'::regclass)", sequenceName: "offer_attribute_values_id_seq" },
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "attribute_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "value_text", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "value_number", type: "numeric", nullable: true, defaultVal: null, sequenceName: null },
      { name: "value_boolean", type: "boolean", nullable: true, defaultVal: null, sequenceName: null },
      { name: "value_date", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "value_year", type: "integer", nullable: true, defaultVal: null, sequenceName: null },
      { name: "option_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "offer_attribute_values_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_oav_offer_attribute", type: "UNIQUE", definition: "UNIQUE (offer_id, attribute_id)" },
      { name: "fk_oav_attribute", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)" },
      { name: "fk_oav_attribute_option_pair", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_id, option_id) REFERENCES controlled_option_values(attribute_id, id)" },
      { name: "fk_oav_offer", type: "FOREIGN KEY", definition: "FOREIGN KEY (offer_id) REFERENCES offers(id)" },
      { name: "fk_oav_option", type: "FOREIGN KEY", definition: "FOREIGN KEY (option_id) REFERENCES controlled_option_values(id)" },
      { name: "chk_oav_value_exclusivity", type: "CHECK", definition: "CHECK ((num_nonnulls(value_text, (value_number)::text, (value_boolean)::text, (value_date)::text, (value_year)::text, (option_id)::text) = 1))" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "offer_attribute_option_values": {
    name: "offer_attribute_option_values",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('offer_attribute_option_values_id_seq'::regclass)", sequenceName: "offer_attribute_option_values_id_seq" },
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "attribute_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "option_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "offer_attribute_option_values_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_oaov_offer_attribute_option", type: "UNIQUE", definition: "UNIQUE (offer_id, attribute_id, option_id)" },
      { name: "fk_oaov_attribute", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_id) REFERENCES attribute_definitions(id)" },
      { name: "fk_oaov_attribute_option_pair", type: "FOREIGN KEY", definition: "FOREIGN KEY (attribute_id, option_id) REFERENCES controlled_option_values(attribute_id, id)" },
      { name: "fk_oaov_offer", type: "FOREIGN KEY", definition: "FOREIGN KEY (offer_id) REFERENCES offers(id)" },
      { name: "fk_oaov_option", type: "FOREIGN KEY", definition: "FOREIGN KEY (option_id) REFERENCES controlled_option_values(id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "orders": {
    name: "orders",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('orders_id_seq'::regclass)", sequenceName: "orders_id_seq" },
      { name: "session_hash", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(20)", nullable: false, defaultVal: "'new'::character varying", sequenceName: null },
      { name: "company_name", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "contact_name", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "email", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "phone", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "message", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "total_amount", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: true, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "orders_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "order_items": {
    name: "order_items",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('order_items_id_seq'::regclass)", sequenceName: "order_items_id_seq" },
      { name: "order_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "title", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "quantity", type: "integer", nullable: false, defaultVal: null, sequenceName: null },
      { name: "unit_price", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "total_price", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "order_items_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "rfq_leads": {
    name: "rfq_leads",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('rfq_leads_id_seq'::regclass)", sequenceName: "rfq_leads_id_seq" },
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "company_name", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "contact_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "email", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "phone", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "message", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(20)", nullable: false, defaultVal: "'new'::character varying", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: true, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "rfq_leads_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  }
};

// ---------------------------------------------------------------------------
// 2. PROD_LEGACY_BASELINE_FINGERPRINT
// Exact physical legacy PROD pre-migration schema (15 tables)
// ---------------------------------------------------------------------------
export const PROD_LEGACY_BASELINE_FINGERPRINT: Record<string, TableContract> = {
  ...CANONICAL_0000_BASELINE_FINGERPRINT,
  "categories": {
    ...CANONICAL_0000_BASELINE_FINGERPRINT["categories"],
    constraints: [
      { name: "categories_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "categories_slug_key", type: "UNIQUE", definition: "UNIQUE (slug)" },
      { name: "categories_parent_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT" }
    ]
  },
  "offers": {
    ...CANONICAL_0000_BASELINE_FINGERPRINT["offers"],
    constraints: [
      { name: "offers_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "offers_category_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT" },
      { name: "offers_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE" },
      { name: "offers_conversion_type_check", type: "CHECK", definition: "CHECK (((conversion_type)::text = ANY ((ARRAY['rfq'::character varying, 'cart'::character varying, 'outbound'::character varying])::text[])))" },
      { name: "offers_offer_model_check", type: "CHECK", definition: "CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'ecommerce'::character varying, 'outbound'::character varying])::text[])))" },
      { name: "offers_publication_status_check", type: "CHECK", definition: "CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])))" }
    ]
  },
  "clicks": {
    ...CANONICAL_0000_BASELINE_FINGERPRINT["clicks"],
    constraints: [
      { name: "clicks_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "clicks_offer_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE" },
      { name: "clicks_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE" }
    ],
    explicitIndexes: [
      { name: "idx_clicks_tracking", method: "btree", expressions: "ip_hash, offer_id, clicked_at" }
    ]
  }
};

// BASELINE_PRODUCTION_FINGERPRINT alias pointing to PROD legacy baseline
export const BASELINE_PRODUCTION_FINGERPRINT = PROD_LEGACY_BASELINE_FINGERPRINT;

// ---------------------------------------------------------------------------
// 3. PRE_0003_PRODUCTION_FINGERPRINT (Exact state after 0000 + 0001 + 0002)
// Used by QA and existing 0002 migration chain (19 tables)
// ---------------------------------------------------------------------------
const baselineRfq = CANONICAL_0000_BASELINE_FINGERPRINT["rfq_leads"];

export const PRE_0003_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...CANONICAL_0000_BASELINE_FINGERPRINT,
  "offers": {
    ...CANONICAL_0000_BASELINE_FINGERPRINT["offers"],
    columns: [
      ...CANONICAL_0000_BASELINE_FINGERPRINT["offers"].columns,
      { name: "contract_model", type: "character varying(30)", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      ...CANONICAL_0000_BASELINE_FINGERPRINT["offers"].constraints,
      { name: "offers_contract_model_check", type: "CHECK", definition: "CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])))" }
    ]
  },
  "rfq_leads": {
    ...baselineRfq,
    columns: [...baselineRfq.columns],
    constraints: [
      ...baselineRfq.constraints,
      {
        name: "rfq_leads_offer_id_fkey",
        type: "FOREIGN KEY",
        definition: "FOREIGN KEY (offer_id) REFERENCES offers(id)"
      },
      {
        name: "rfq_leads_partner_id_fkey",
        type: "FOREIGN KEY",
        definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)"
      },
      {
        name: "rfq_leads_status_check",
        type: "CHECK",
        definition: "CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])))"
      }
    ],
    explicitIndexes: [
      ...baselineRfq.explicitIndexes,
      {
        name: "idx_rfq_leads_offer",
        method: "btree",
        expressions: "offer_id"
      },
      {
        name: "idx_rfq_leads_partner",
        method: "btree",
        expressions: "partner_id"
      }
    ]
  },
  "seller_legal_identities": {
    name: "seller_legal_identities",
    columns: [
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "legal_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "jurisdiction_country", type: "character varying(2)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "verification_status", type: "character varying(30)", nullable: false, defaultVal: "'unverified'::character varying", sequenceName: null },
      { name: "verified_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "verification_source", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "verification_reference", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "seller_legal_identities_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (partner_id)" },
      { name: "seller_legal_identities_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "seller_tax_identifiers": {
    name: "seller_tax_identifiers",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_tax_identifiers_id_seq'::regclass)", sequenceName: "seller_tax_identifiers_id_seq" },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "identifier_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "identifier_value", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "country_code", type: "character varying(2)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "verification_status", type: "character varying(30)", nullable: false, defaultVal: "'unverified'::character varying", sequenceName: null },
      { name: "verified_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "verification_source", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "verification_reference", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "seller_tax_identifiers_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "seller_tax_identifiers_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES seller_legal_identities(partner_id)" },
      { name: "uq_seller_tax_identifier_identity", type: "UNIQUE", definition: "UNIQUE (partner_id, identifier_type, country_code, identifier_value)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "seller_registry_identifiers": {
    name: "seller_registry_identifiers",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_registry_identifiers_id_seq'::regclass)", sequenceName: "seller_registry_identifiers_id_seq" },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "registry_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "registry_value", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "jurisdiction_country", type: "character varying(2)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "seller_registry_identifiers_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "seller_registry_identifiers_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES seller_legal_identities(partner_id)" },
      { name: "uq_seller_registry_identifier_identity", type: "UNIQUE", definition: "UNIQUE (partner_id, registry_type, jurisdiction_country, registry_value)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  },
  "seller_eligibility": {
    name: "seller_eligibility",
    columns: [
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "eligibility_status", type: "character varying(30)", nullable: false, defaultVal: "'pending'::character varying", sequenceName: null },
      { name: "reason", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "seller_eligibility_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (partner_id)" },
      { name: "seller_eligibility_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)" },
      { name: "seller_eligibility_status_check", type: "CHECK", definition: "CHECK (((eligibility_status)::text = ANY ((ARRAY['pending'::character varying, 'eligible'::character varying, 'ineligible'::character varying, 'suspended'::character varying])::text[])))" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  }
};



// ---------------------------------------------------------------------------
// 4. FINAL_POST_0003_PRODUCTION_FINGERPRINT
// Single exact final runtime schema after 0003 (19 tables)
// ---------------------------------------------------------------------------
export const FINAL_POST_0003_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...PRE_0003_PRODUCTION_FINGERPRINT,
  "categories": {
    ...PRE_0003_PRODUCTION_FINGERPRINT["categories"],
    constraints: [
      { name: "categories_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "categories_slug_key", type: "UNIQUE", definition: "UNIQUE (slug)" },
      { name: "categories_parent_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT" }
    ]
  },
  "offers": {
    ...PRE_0003_PRODUCTION_FINGERPRINT["offers"],
    constraints: [
      { name: "offers_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "offers_category_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT" },
      { name: "offers_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE" },
      { name: "offers_conversion_type_check", type: "CHECK", definition: "CHECK (((conversion_type)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))" },
      { name: "offers_offer_model_check", type: "CHECK", definition: "CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'marketplace'::character varying])::text[])))" },
      { name: "offers_publication_status_check", type: "CHECK", definition: "CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])))" },
      { name: "offers_contract_model_check", type: "CHECK", definition: "CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])))" }
    ]
  },
  "clicks": {
    ...PRE_0003_PRODUCTION_FINGERPRINT["clicks"],
    constraints: [
      { name: "clicks_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "clicks_offer_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE" },
      { name: "clicks_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE" }
    ],
    explicitIndexes: [
      { name: "idx_clicks_tracking", method: "btree", expressions: "ip_hash, offer_id, clicked_at" }
    ]
  }
};

// ---------------------------------------------------------------------------
// 5. FINAL_POST_0004_PRODUCTION_FINGERPRINT
// Single exact final runtime schema after 0004 (19 tables, +6 address columns)
// ---------------------------------------------------------------------------
export const FINAL_POST_0004_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...FINAL_POST_0003_PRODUCTION_FINGERPRINT,
  "seller_legal_identities": {
    ...FINAL_POST_0003_PRODUCTION_FINGERPRINT["seller_legal_identities"],
    columns: [
      ...FINAL_POST_0003_PRODUCTION_FINGERPRINT["seller_legal_identities"].columns,
      { name: "registered_address_line1", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registered_address_line2", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registered_postal_code", type: "character varying(32)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registered_city", type: "character varying(120)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registered_region", type: "character varying(120)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registered_country_code", type: "character varying(2)", nullable: true, defaultVal: null, sequenceName: null }
    ]
  }
};


export const FINAL_POST_0005_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...FINAL_POST_0004_PRODUCTION_FINGERPRINT,
  "buyer_legal_context_snapshots": {
    name: "buyer_legal_context_snapshots",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('buyer_legal_context_snapshots_id_seq'::regclass)", sequenceName: 'buyer_legal_context_snapshots_id_seq' },
      { name: "business_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "country_code", type: "character varying(2)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_type", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_value", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registry_identifier_type", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registry_identifier_value", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "business_verification_status", type: "character varying(50)", nullable: false, defaultVal: "'unknown'::character varying", sequenceName: null },
      { name: "business_verification_method", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "business_verification_source", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "business_verified_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "professional_purpose_evidence", type: "character varying(1000)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "category_b_status", type: "character varying(50)", nullable: false, defaultVal: "'unknown'::character varying", sequenceName: null },
      { name: "legal_context_review_state", type: "character varying(50)", nullable: false, defaultVal: "'no_review_needed'::character varying", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
    ],
    constraints: [
      { name: "buyer_legal_context_snapshots_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "chk_buyer_identifiers_present", type: "CHECK", definition: "CHECK ((((tax_identifier_type IS NOT NULL) AND (tax_identifier_value IS NOT NULL)) OR ((registry_identifier_type IS NOT NULL) AND (registry_identifier_value IS NOT NULL))))" },
      { name: "chk_buyer_tax_pair", type: "CHECK", definition: "CHECK ((((tax_identifier_type IS NULL) AND (tax_identifier_value IS NULL)) OR ((tax_identifier_type IS NOT NULL) AND (tax_identifier_value IS NOT NULL))))" },
      { name: "chk_buyer_registry_pair", type: "CHECK", definition: "CHECK ((((registry_identifier_type IS NULL) AND (registry_identifier_value IS NULL)) OR ((registry_identifier_type IS NOT NULL) AND (registry_identifier_value IS NOT NULL))))" },
      { name: "chk_buyer_business_verification_status", type: "CHECK", definition: "CHECK (((business_verification_status)::text = ANY ((ARRAY['unknown'::character varying, 'unverified'::character varying, 'verified'::character varying, 'failed'::character varying])::text[])))" },
      { name: "chk_buyer_verification_consistency", type: "CHECK", definition: "CHECK (((((business_verification_status)::text = 'verified'::text) AND (business_verification_method IS NOT NULL) AND (business_verification_source IS NOT NULL) AND (business_verified_at IS NOT NULL)) OR ((business_verification_status)::text <> 'verified'::text)))" },
      { name: "chk_buyer_category_b_status", type: "CHECK", definition: "CHECK (((category_b_status)::text = ANY ((ARRAY['unknown'::character varying, 'not_applicable'::character varying, 'applicable'::character varying, 'under_review'::character varying])::text[])))" },
      { name: "chk_buyer_legal_review_state", type: "CHECK", definition: "CHECK (((legal_context_review_state)::text = ANY ((ARRAY['no_review_needed'::character varying, 'pending_review'::character varying, 'approved_by_review'::character varying, 'rejected_by_review'::character varying])::text[])))" },
    ],
    explicitIndexes: [
    ],
    rlsEnabled: false
  },
  "marketplace_orders": {
    name: "marketplace_orders",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('marketplace_orders_id_seq'::regclass)", sequenceName: 'marketplace_orders_id_seq' },
      { name: "session_hash", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "buyer_legal_context_snapshot_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(50)", nullable: false, defaultVal: "'intent_created'::character varying", sequenceName: null },
      { name: "e2_buyer_intent_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
      { name: "e3_receipt_acknowledged_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "customer_po_number", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
    ],
    constraints: [
      { name: "marketplace_orders_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_marketplace_orders_snapshot", type: "UNIQUE", definition: "UNIQUE (buyer_legal_context_snapshot_id)" },
      { name: "chk_marketplace_orders_status", type: "CHECK", definition: "CHECK (((status)::text = ANY ((ARRAY['intent_created'::character varying, 'checkout_submitted'::character varying, 'pending_seller_review'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))" },
      { name: "marketplace_orders_buyer_legal_context_snapshot_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (buyer_legal_context_snapshot_id) REFERENCES buyer_legal_context_snapshots(id)" },
    ],
    explicitIndexes: [
      { name: "idx_marketplace_orders_session", method: "btree", expressions: "session_hash" },
    ],
    rlsEnabled: false
  },
  "marketplace_order_seller_disclosures": {
    name: "marketplace_order_seller_disclosures",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('marketplace_order_seller_disclosures_id_seq'::regclass)", sequenceName: 'marketplace_order_seller_disclosures_id_seq' },
      { name: "marketplace_order_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "seller_legal_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "registered_address", type: "character varying(1000)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "jurisdiction_country", type: "character varying(2)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "firm_contact_email", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "seller_role", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "goods_invoice_issuer", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "delivery_responsible_party", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "complaint_responsible_party", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "return_responsible_party", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "logimarket_platform_role", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_type", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_value", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
    ],
    constraints: [
      { name: "marketplace_order_seller_disclosures_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_mkt_order_disclosure_order_partner", type: "UNIQUE", definition: "UNIQUE (marketplace_order_id, partner_id)" },
      { name: "chk_disclosure_tax_pair", type: "CHECK", definition: "CHECK ((((tax_identifier_type IS NULL) AND (tax_identifier_value IS NULL)) OR ((tax_identifier_type IS NOT NULL) AND (tax_identifier_value IS NOT NULL))))" },
      { name: "marketplace_order_seller_disclosures_marketplace_order_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (marketplace_order_id) REFERENCES marketplace_orders(id)" },
      { name: "marketplace_order_seller_disclosures_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)" },
    ],
    explicitIndexes: [
    ],
    rlsEnabled: false
  },
  "seller_orders": {
    name: "seller_orders",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_orders_id_seq'::regclass)", sequenceName: 'seller_orders_id_seq' },
      { name: "marketplace_order_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(50)", nullable: false, defaultVal: "'submitted'::character varying", sequenceName: null },
      { name: "e6_routed_to_seller_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
    ],
    constraints: [
      { name: "seller_orders_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_seller_orders_mkt_partner", type: "UNIQUE", definition: "UNIQUE (marketplace_order_id, partner_id)" },
      { name: "chk_seller_orders_status", type: "CHECK", definition: "CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying])::text[])))" },
      { name: "seller_orders_marketplace_order_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (marketplace_order_id) REFERENCES marketplace_orders(id)" },
      { name: "seller_orders_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id)" },
    ],
    explicitIndexes: [
      { name: "idx_seller_orders_partner", method: "btree", expressions: "partner_id" },
    ],
    rlsEnabled: false
  },
  "seller_order_seller_snapshots": {
    name: "seller_order_seller_snapshots",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_order_seller_snapshots_id_seq'::regclass)", sequenceName: 'seller_order_seller_snapshots_id_seq' },
      { name: "seller_order_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "seller_legal_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "seller_display_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "jurisdiction_country", type: "character varying(2)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "registered_address", type: "character varying(1000)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "firm_contact_email", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_type", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_value", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registry_identifier_type", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registry_identifier_value", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "contract_model", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "seller_of_record_responsibility", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "goods_invoice_responsibility", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "delivery_responsibility", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "complaint_responsibility", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "return_responsibility", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "refund_financial_liability", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
    ],
    constraints: [
      { name: "seller_order_seller_snapshots_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_seller_order_seller_snapshots_seller_order", type: "UNIQUE", definition: "UNIQUE (seller_order_id)" },
      { name: "chk_snapshot_tax_pair", type: "CHECK", definition: "CHECK ((((tax_identifier_type IS NULL) AND (tax_identifier_value IS NULL)) OR ((tax_identifier_type IS NOT NULL) AND (tax_identifier_value IS NOT NULL))))" },
      { name: "chk_snapshot_registry_pair", type: "CHECK", definition: "CHECK ((((registry_identifier_type IS NULL) AND (registry_identifier_value IS NULL)) OR ((registry_identifier_type IS NOT NULL) AND (registry_identifier_value IS NOT NULL))))" },
      { name: "chk_snapshot_contract_model", type: "CHECK", definition: "CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])))" },
      { name: "seller_order_seller_snapshots_seller_order_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id)" },
    ],
    explicitIndexes: [
    ],
    rlsEnabled: false
  },
  "seller_order_items": {
    name: "seller_order_items",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_order_items_id_seq'::regclass)", sequenceName: 'seller_order_items_id_seq' },
      { name: "seller_order_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "offer_title", type: "character varying(500)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "manufacturer", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "model", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "technical_data_ref", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "content_language", type: "character varying(10)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "quantity", type: "integer", nullable: false, defaultVal: null, sequenceName: null },
      { name: "unit_price", type: "numeric", nullable: false, defaultVal: null, sequenceName: null },
      { name: "currency", type: "character varying(3)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "tax_context", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
    ],
    constraints: [
      { name: "seller_order_items_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "chk_seller_order_items_qty", type: "CHECK", definition: "CHECK ((quantity > 0))" },
      { name: "chk_seller_order_items_currency_shape", type: "CHECK", definition: "CHECK (((currency)::text ~ '^[A-Z]{3}$'::text))" },
      { name: "seller_order_items_seller_order_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id)" },
      { name: "seller_order_items_offer_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (offer_id) REFERENCES offers(id)" },
    ],
    explicitIndexes: [
      { name: "idx_seller_order_items_seller_order", method: "btree", expressions: "seller_order_id" },
    ],
    rlsEnabled: false
  },
  "seller_acceptance_decisions": {
    name: "seller_acceptance_decisions",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_acceptance_decisions_id_seq'::regclass)", sequenceName: 'seller_acceptance_decisions_id_seq' },
      { name: "seller_order_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "decision_status", type: "character varying(50)", nullable: false, defaultVal: "'pending_seller_review'::character varying", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: 'now()', sequenceName: null },
      { name: "resolved_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "accepted_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
    ],
    constraints: [
      { name: "seller_acceptance_decisions_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_seller_acceptance_decisions_seller_order", type: "UNIQUE", definition: "UNIQUE (seller_order_id)" },
      { name: "chk_seller_acc_dec_status", type: "CHECK", definition: "CHECK (((decision_status)::text = ANY ((ARRAY['pending_seller_review'::character varying, 'seller_accepted'::character varying, 'seller_rejected'::character varying, 'expired'::character varying])::text[])))" },
      { name: "chk_seller_acc_dec_consistency", type: "CHECK", definition: "CHECK (((((decision_status)::text = 'pending_seller_review'::text) AND (resolved_at IS NULL) AND (accepted_at IS NULL)) OR (((decision_status)::text = 'seller_accepted'::text) AND (resolved_at IS NOT NULL) AND (accepted_at IS NOT NULL)) OR (((decision_status)::text = 'seller_rejected'::text) AND (resolved_at IS NOT NULL) AND (accepted_at IS NULL)) OR (((decision_status)::text = 'expired'::text) AND (resolved_at IS NOT NULL) AND (accepted_at IS NULL))))" },
      { name: "seller_acceptance_decisions_seller_order_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (seller_order_id) REFERENCES seller_orders(id)" },
    ],
    explicitIndexes: [
    ],
    rlsEnabled: false
  },
};

// ---------------------------------------------------------------------------
// 7. FINAL_POST_0006_PRODUCTION_FINGERPRINT
// Seller Verification Evidence: immutable history plus nullable current links.
// ---------------------------------------------------------------------------
export const FINAL_POST_0006_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...FINAL_POST_0005_PRODUCTION_FINGERPRINT,
  "seller_legal_identities": {
    ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_legal_identities"],
    columns: [
      ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_legal_identities"].columns,
      { name: "current_verification_event_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_legal_identities"].constraints,
      { name: "chk_legacy_legal_status", type: "CHECK", definition: "CHECK (((verification_status)::text = ANY ((ARRAY['unverified'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[])))", isValidated: false },
      { name: "seller_legal_identities_current_verification_event_id_seller_verification_events_id_fk", type: "FOREIGN KEY", definition: "FOREIGN KEY (current_verification_event_id) REFERENCES seller_verification_events(id)" }
    ]
  },
  "seller_tax_identifiers": {
    ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_tax_identifiers"],
    columns: [
      ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_tax_identifiers"].columns,
      { name: "current_verification_event_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "retired_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_tax_identifiers"].constraints,
      { name: "chk_legacy_tax_status", type: "CHECK", definition: "CHECK (((verification_status)::text = ANY ((ARRAY['unverified'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[])))", isValidated: false },
      { name: "seller_tax_identifiers_current_verification_event_id_seller_verification_events_id_fk", type: "FOREIGN KEY", definition: "FOREIGN KEY (current_verification_event_id) REFERENCES seller_verification_events(id)" }
    ]
  },
  "seller_registry_identifiers": {
    ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_registry_identifiers"],
    columns: [
      ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_registry_identifiers"].columns,
      { name: "verification_status", type: "character varying(30)", nullable: true, defaultVal: "'unverified'::character varying", sequenceName: null },
      { name: "verified_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "verification_source", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "verification_reference", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "current_verification_event_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "retired_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      ...FINAL_POST_0005_PRODUCTION_FINGERPRINT["seller_registry_identifiers"].constraints,
      { name: "chk_legacy_registry_status", type: "CHECK", definition: "CHECK (((verification_status IS NULL) OR ((verification_status)::text = ANY ((ARRAY['unverified'::character varying, 'verified'::character varying, 'rejected'::character varying])::text[]))))", isValidated: false },
      { name: "seller_registry_identifiers_current_verification_event_id_seller_verification_events_id_fk", type: "FOREIGN KEY", definition: "FOREIGN KEY (current_verification_event_id) REFERENCES seller_verification_events(id)" }
    ]
  },
  "seller_verification_events": {
    name: "seller_verification_events",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('seller_verification_events_id_seq'::regclass)", sequenceName: "seller_verification_events_id_seq" },
      { name: "subject_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "legal_identity_partner_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "tax_identifier_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "registry_identifier_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "event_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "actor_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "actor_user_id", type: "character varying(255)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "source_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "source_name", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "source_reference", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "reason_code", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "subject_snapshot", type: "jsonb", nullable: false, defaultVal: null, sequenceName: null },
      { name: "previous_verification_status", type: "character varying(30)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "previous_verified_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "previous_verification_source", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "previous_verification_reference", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "occurred_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "seller_verification_events_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "subject_matrix_check", type: "CHECK", definition: "CHECK (((((subject_type)::text = 'legal_identity'::text) AND (legal_identity_partner_id IS NOT NULL) AND (tax_identifier_id IS NULL) AND (registry_identifier_id IS NULL)) OR (((subject_type)::text = 'tax_identifier'::text) AND (legal_identity_partner_id IS NULL) AND (tax_identifier_id IS NOT NULL) AND (registry_identifier_id IS NULL)) OR (((subject_type)::text = 'registry_identifier'::text) AND (legal_identity_partner_id IS NULL) AND (tax_identifier_id IS NULL) AND (registry_identifier_id IS NOT NULL))))" },
      { name: "event_type_check", type: "CHECK", definition: "CHECK (((event_type)::text = ANY ((ARRAY['verified'::character varying, 'rejected'::character varying, 'invalidated'::character varying])::text[])))" },
      { name: "actor_type_check", type: "CHECK", definition: "CHECK (((actor_type)::text = ANY ((ARRAY['admin'::character varying, 'system'::character varying, 'external_adapter'::character varying])::text[])))" },
      { name: "actor_matrix_check", type: "CHECK", definition: "CHECK (((((actor_type)::text = 'admin'::text) AND (actor_user_id IS NOT NULL)) OR (((actor_type)::text = 'system'::text) AND (actor_user_id IS NULL)) OR (((actor_type)::text = 'external_adapter'::text) AND (actor_user_id IS NULL))))" },
      { name: "source_type_check", type: "CHECK", definition: "CHECK (((source_type)::text = ANY ((ARRAY['admin_manual'::character varying, 'public_registry_manual'::character varying, 'partner_document'::character varying, 'external_adapter'::character varying, 'system_rule'::character varying])::text[])))" },
      { name: "seller_verification_events_legal_identity_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (legal_identity_partner_id) REFERENCES seller_legal_identities(partner_id) ON DELETE RESTRICT" },
      { name: "seller_verification_events_tax_identifier_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (tax_identifier_id) REFERENCES seller_tax_identifiers(id) ON DELETE RESTRICT" },
      { name: "seller_verification_events_registry_identifier_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (registry_identifier_id) REFERENCES seller_registry_identifiers(id) ON DELETE RESTRICT" }
    ],
    explicitIndexes: [
      { name: "idx_verification_events_legal_subject", method: "btree", expressions: "legal_identity_partner_id" },
      { name: "idx_verification_events_tax_subject", method: "btree", expressions: "tax_identifier_id" },
      { name: "idx_verification_events_registry_subject", method: "btree", expressions: "registry_identifier_id" }
    ],
    rlsEnabled: true,
    policyCount: 0,
    triggerCount: 1
  }
};

// ---------------------------------------------------------------------------
// 8. FINAL_POST_0007_PRODUCTION_FINGERPRINT
// Marketplace order foundation: default-deny RLS, intentionally no policies.
// ---------------------------------------------------------------------------
export const FINAL_POST_0007_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...FINAL_POST_0006_PRODUCTION_FINGERPRINT,
  "buyer_legal_context_snapshots": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["buyer_legal_context_snapshots"],
    rlsEnabled: true,
    policyCount: 0,
  },
  "marketplace_orders": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["marketplace_orders"],
    rlsEnabled: true,
    policyCount: 0,
  },
  "marketplace_order_seller_disclosures": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["marketplace_order_seller_disclosures"],
    rlsEnabled: true,
    policyCount: 0,
  },
  "seller_orders": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["seller_orders"],
    rlsEnabled: true,
    policyCount: 0,
  },
  "seller_order_seller_snapshots": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["seller_order_seller_snapshots"],
    rlsEnabled: true,
    policyCount: 0,
  },
  "seller_order_items": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["seller_order_items"],
    rlsEnabled: true,
    policyCount: 0,
  },
  "seller_acceptance_decisions": {
    ...FINAL_POST_0006_PRODUCTION_FINGERPRINT["seller_acceptance_decisions"],
    rlsEnabled: true,
    policyCount: 0,
  },
};

export type RuntimeSecurityContract = {
  preventVerificationEventsMutationSearchPath: string[] | null;
  preventPartnerAgreementExecutionEvidenceMutationSearchPath?: string[] | null;
  preventPartnerAgreementEvidenceInvalidationsMutationSearchPath?: string[] | null;
  checkPartnerAgreementActiveExternalTxSearchPath?: string[] | null;
};

export const PRE_0008_SECURITY_CONTRACT: RuntimeSecurityContract = {
  preventVerificationEventsMutationSearchPath: null,
  preventPartnerAgreementExecutionEvidenceMutationSearchPath: null,
  preventPartnerAgreementEvidenceInvalidationsMutationSearchPath: null,
  checkPartnerAgreementActiveExternalTxSearchPath: null,
};

export const POST_0008_SECURITY_CONTRACT: RuntimeSecurityContract = {
  preventVerificationEventsMutationSearchPath: ['search_path=""'],
  preventPartnerAgreementExecutionEvidenceMutationSearchPath: null,
  preventPartnerAgreementEvidenceInvalidationsMutationSearchPath: null,
  checkPartnerAgreementActiveExternalTxSearchPath: null,
};

export const POST_0009_SECURITY_CONTRACT: RuntimeSecurityContract = {
  preventVerificationEventsMutationSearchPath: ['search_path=""'],
  preventPartnerAgreementExecutionEvidenceMutationSearchPath: ['search_path=""'],
  preventPartnerAgreementEvidenceInvalidationsMutationSearchPath: ['search_path=""'],
  checkPartnerAgreementActiveExternalTxSearchPath: ['search_path=""'],
};

export const FINAL_POST_0008_PRODUCTION_FINGERPRINT = FINAL_POST_0007_PRODUCTION_FINGERPRINT;

export const FINAL_POST_0009_PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
  ...FINAL_POST_0008_PRODUCTION_FINGERPRINT,
  "agreement_versions": {
    name: "agreement_versions",
    columns: [
      { name: "id", type: "integer", nullable: false, defaultVal: "nextval('agreement_versions_id_seq'::regclass)", sequenceName: "agreement_versions_id_seq" },
      { name: "agreement_type", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "version", type: "character varying(50)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "canonical_template_hash_sha256", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(30)", nullable: false, defaultVal: "'draft'::character varying", sequenceName: null },
      { name: "effective_from", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "effective_to", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "published_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null }
    ],
    constraints: [
      { name: "agreement_versions_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "chk_agreement_versions_type", type: "CHECK", definition: "CHECK (((agreement_type)::text = ANY ((ARRAY['partner_agreement_b2b'::character varying, 'PARTNER_AGREEMENT_B2B'::character varying])::text[])))" },
      { name: "chk_agreement_versions_status", type: "CHECK", definition: "CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'active'::character varying, 'superseded'::character varying, 'archived'::character varying])::text[])))" },
      { name: "chk_agreement_versions_hash_format", type: "CHECK", definition: "CHECK (((canonical_template_hash_sha256)::text ~ '^[0-9a-f]{64}$'::text))" },
      { name: "chk_agreement_versions_active_lifecycle", type: "CHECK", definition: "CHECK ((((status)::text <> 'active'::text) OR ((effective_from IS NOT NULL) AND (published_at IS NOT NULL))))" },
      { name: "chk_agreement_versions_effective_dates", type: "CHECK", definition: "CHECK (((effective_to IS NULL) OR (effective_from IS NULL) OR (effective_to > effective_from)))" },
      { name: "uq_agreement_versions_type_version", type: "UNIQUE", definition: "UNIQUE (agreement_type, version)" },
      { name: "uq_agreement_versions_hash", type: "UNIQUE", definition: "UNIQUE (canonical_template_hash_sha256)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true,
    policyCount: 0,
    triggerCount: 0
  },
  "partner_agreement_execution_evidence": {
    name: "partner_agreement_execution_evidence",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('partner_agreement_execution_evidence_id_seq'::regclass)", sequenceName: "partner_agreement_execution_evidence_id_seq" },
      { name: "partner_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "agreement_version_id", type: "integer", nullable: false, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(30)", nullable: false, defaultVal: "'ACCEPTED'::character varying", sequenceName: null },
      { name: "execution_method", type: "character varying(50)", nullable: false, defaultVal: "'platform_documentary_electronic'::character varying", sequenceName: null },
      { name: "signed_at", type: "timestamp with time zone", nullable: false, defaultVal: null, sequenceName: null },
      { name: "signatory_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "signatory_role", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "signatory_email", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "external_platform", type: "character varying(100)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "external_transaction_id", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "signed_pdf_sha256", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "recorded_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "recorded_by_admin_user_id", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "partner_agreement_execution_evidence_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "chk_partner_agreement_evidence_status", type: "CHECK", definition: "CHECK (((status)::text = ANY ((ARRAY['accepted'::character varying, 'ACCEPTED'::character varying])::text[])))" },
      { name: "chk_partner_agreement_evidence_method", type: "CHECK", definition: "CHECK (((execution_method)::text = ANY ((ARRAY['platform_documentary_electronic'::character varying, 'qualified_electronic_signature'::character varying, 'advanced_electronic_signature'::character varying])::text[])))" },
      { name: "chk_partner_agreement_evidence_hash_format", type: "CHECK", definition: "CHECK (((signed_pdf_sha256)::text ~ '^[0-9a-f]{64}$'::text))" },
      { name: "chk_partner_agreement_evidence_signatory_name", type: "CHECK", definition: "CHECK ((length(btrim((signatory_name)::text)) > 0))" },
      { name: "chk_partner_agreement_evidence_signatory_role", type: "CHECK", definition: "CHECK ((length(btrim((signatory_role)::text)) > 0))" },
      { name: "chk_partner_agreement_evidence_signatory_email", type: "CHECK", definition: "CHECK ((length(btrim((signatory_email)::text)) > 0))" },
      { name: "chk_partner_agreement_evidence_external_platform", type: "CHECK", definition: "CHECK ((length(btrim((external_platform)::text)) > 0))" },
      { name: "chk_partner_agreement_evidence_external_tx", type: "CHECK", definition: "CHECK ((length(btrim((external_transaction_id)::text)) > 0))" },
      { name: "chk_partner_agreement_evidence_recorded_by", type: "CHECK", definition: "CHECK ((length(btrim((recorded_by_admin_user_id)::text)) > 0))" },
      { name: "partner_agreement_execution_evidence_partner_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE RESTRICT" },
      { name: "partner_agreement_execution_evidence_agreement_version_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (agreement_version_id) REFERENCES agreement_versions(id) ON DELETE RESTRICT" }
    ],
    explicitIndexes: [
      { name: "idx_partner_agreement_evidence_partner_id", method: "btree", expressions: "partner_id" },
      { name: "idx_partner_agreement_evidence_version_id", method: "btree", expressions: "agreement_version_id" }
    ],
    rlsEnabled: true,
    policyCount: 0,
    triggerCount: 2
  },
  "partner_agreement_evidence_invalidations": {
    name: "partner_agreement_evidence_invalidations",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('partner_agreement_evidence_invalidations_id_seq'::regclass)", sequenceName: "partner_agreement_evidence_invalidations_id_seq" },
      { name: "execution_evidence_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "reason", type: "text", nullable: false, defaultVal: null, sequenceName: null },
      { name: "invalidated_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "invalidated_by_admin_user_id", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null }
    ],
    constraints: [
      { name: "partner_agreement_evidence_invalidations_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" },
      { name: "uq_partner_agreement_evidence_invalidations_evidence", type: "UNIQUE", definition: "UNIQUE (execution_evidence_id)" },
      { name: "chk_partner_agreement_invalidation_reason", type: "CHECK", definition: "CHECK ((length(btrim(reason)) > 0))" },
      { name: "chk_partner_agreement_invalidation_by", type: "CHECK", definition: "CHECK ((length(btrim((invalidated_by_admin_user_id)::text)) > 0))" },
      { name: "partner_agreement_evidence_invalidations_execution_evidence_id_fkey", type: "FOREIGN KEY", definition: "FOREIGN KEY (execution_evidence_id) REFERENCES partner_agreement_execution_evidence(id) ON DELETE RESTRICT" }
    ],
    explicitIndexes: [
      { name: "idx_partner_agreement_invalidations_evidence_id", method: "btree", expressions: "execution_evidence_id" }
    ],
    rlsEnabled: true,
    policyCount: 0,
    triggerCount: 1
  }
};

export const PREVIOUS_PRODUCTION_FINGERPRINT = FINAL_POST_0008_PRODUCTION_FINGERPRINT;
export const PRODUCTION_FINGERPRINT = FINAL_POST_0009_PRODUCTION_FINGERPRINT;
