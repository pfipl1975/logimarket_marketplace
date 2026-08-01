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
  const dbMatch = url.match(/db\.([a-z0-9]+)\.supabase\.co/);
  if (dbMatch) return dbMatch[1];
  const poolerMatch = url.match(/postgres\.([a-z0-9]+)@/);
  if (poolerMatch) return poolerMatch[1];
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
};

export const PRODUCTION_FINGERPRINT: Record<string, TableContract> = {
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
      { name: "parent_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "slug", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "description", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "is_active", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "created_at", type: "timestamp without time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
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
      { name: "slug", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "description", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "is_active", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "created_at", type: "timestamp without time zone", nullable: false, defaultVal: "now()", sequenceName: null },
      { name: "updated_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null }
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
  "offers": {
    name: "offers",
    columns: [
      { name: "id", type: "bigint", nullable: false, defaultVal: "nextval('offers_id_seq'::regclass)", sequenceName: "offers_id_seq" },
      { name: "category_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "partner_id", type: "bigint", nullable: true, defaultVal: null, sequenceName: null },
      { name: "source_offer_id", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "title", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "description", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "sku", type: "character varying(100)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "ean", type: "character varying(20)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "price", type: "numeric", nullable: true, defaultVal: null, sequenceName: null },
      { name: "currency", type: "character varying(3)", nullable: false, defaultVal: "'PLN'::character varying", sequenceName: null },
      { name: "image_url", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "outbound_url", type: "text", nullable: false, defaultVal: null, sequenceName: null },
      { name: "is_featured", type: "boolean", nullable: false, defaultVal: "false", sequenceName: null },
      { name: "is_active", type: "boolean", nullable: false, defaultVal: "true", sequenceName: null },
      { name: "publication_status", type: "character varying(20)", nullable: false, defaultVal: "'draft'::character varying", sequenceName: null },
      { name: "conversion_type", type: "character varying(20)", nullable: false, defaultVal: "'outbound'::character varying", sequenceName: null },
      { name: "offer_model", type: "character varying(20)", nullable: false, defaultVal: "'rfq'::character varying", sequenceName: null },
      { name: "published_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "archived_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "deleted_at", type: "timestamp with time zone", nullable: true, defaultVal: null, sequenceName: null },
      { name: "technical_attributes", type: "jsonb", nullable: false, defaultVal: "'{}'::jsonb", sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: false, defaultVal: "now()", sequenceName: null },
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
      { name: "offer_id", type: "bigint", nullable: false, defaultVal: null, sequenceName: null },
      { name: "quantity", type: "integer", nullable: false, defaultVal: "1", sequenceName: null },
      { name: "session_hash", type: "character varying(64)", nullable: false, defaultVal: null, sequenceName: null },
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
      { name: "session_hash", type: "character varying", nullable: false, defaultVal: null, sequenceName: null },
      { name: "ip_hash", type: "character varying", nullable: false, defaultVal: null, sequenceName: null },
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
      { name: "value_date", type: "date", nullable: true, defaultVal: null, sequenceName: null },
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
      { name: "company_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "contact_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "email", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "phone", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "message", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "session_hash", type: "character varying", nullable: false, defaultVal: null, sequenceName: null },
      { name: "total_amount", type: "character varying", nullable: true, defaultVal: null, sequenceName: null },
      { name: "status", type: "character varying(20)", nullable: false, defaultVal: "'new'::character varying", sequenceName: null },
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
      { name: "unit_price", type: "character varying", nullable: true, defaultVal: null, sequenceName: null },
      { name: "total_price", type: "character varying", nullable: true, defaultVal: null, sequenceName: null }
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
      { name: "company_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "contact_name", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "email", type: "character varying(255)", nullable: false, defaultVal: null, sequenceName: null },
      { name: "phone", type: "character varying(50)", nullable: true, defaultVal: null, sequenceName: null },
      { name: "message", type: "text", nullable: true, defaultVal: null, sequenceName: null },
      { name: "created_at", type: "timestamp with time zone", nullable: true, defaultVal: "now()", sequenceName: null },
      { name: "status", type: "character varying", nullable: false, defaultVal: "'new'::character varying", sequenceName: null }
    ],
    constraints: [
      { name: "rfq_leads_pkey", type: "PRIMARY KEY", definition: "PRIMARY KEY (id)" }
    ],
    explicitIndexes: [],
    rlsEnabled: true
  }
};
