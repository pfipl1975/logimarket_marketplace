import {
  bigserial,
  bigint,
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  varchar,
  integer,
  check,
  unique,
  foreignKey,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";


export const partners = pgTable("partners", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 512 }),
  websiteUrl: varchar("website_url", { length: 512 }),
  contactEmail: varchar("contact_email", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: bigint("parent_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type OfferPublicationStatus = "draft" | "published" | "hidden" | "archived" | "deleted";

export const offers = pgTable("offers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  categoryId: bigint("category_id", { mode: "number" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 512 }),
  priceBrutto: numeric("price_brutto"),
  priceOnRequest: boolean("price_on_request").notNull().default(true),
  conversionType: varchar("conversion_type", { length: 20 }).notNull().default("outbound"),
  offerModel: varchar("offer_model", { length: 20 }).notNull().default("rfq"),
  outboundUrl: varchar("outbound_url", { length: 512 }),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  publicationStatus: varchar("publication_status", { length: 20 }).$type<OfferPublicationStatus>().notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  technicalAttributes: jsonb("technical_attributes").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
});

export const clicks = pgTable("clicks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  clickedAt: timestamp("clicked_at", { withTimezone: true }).notNull().defaultNow(),
  sessionHash: varchar("session_hash", { length: 64 }),
  ipHash: varchar("ip_hash", { length: 64 }),
  isUnique24h: boolean("is_unique_24h").notNull().default(true),
});

export const rfqLeads = pgTable("rfq_leads", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cartItems = pgTable("cart_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable("orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  message: text("message"),
  sessionHash: varchar("session_hash", { length: 64 }),
  totalAmount: numeric("total_amount"),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Faceted Filter & Relational Attribute Model

export const attributeDefinitions = pgTable(
  "attribute_definitions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    stableKey: text("stable_key").notNull(),
    dataType: varchar("data_type", { length: 30 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_ad_stable_key").on(t.stableKey),
    check("chk_ad_data_type", sql`${t.dataType} IN ('text','number','boolean','date','year','enum','multi_enum')`),
  ]
);

export const controlledOptionValues = pgTable(
  "controlled_option_values",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    attributeId: bigint("attribute_id", { mode: "number" }).notNull(),
    stableKey: text("stable_key").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_cov_attr_option").on(t.attributeId, t.stableKey),
    foreignKey({
      name: "fk_cov_attribute",
      columns: [t.attributeId],
      foreignColumns: [attributeDefinitions.id]
    }),
  ]
);

export const offerAttributeValues = pgTable(
  "offer_attribute_values",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    offerId: bigint("offer_id", { mode: "number" }).notNull(),
    attributeId: bigint("attribute_id", { mode: "number" }).notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number"),
    valueBoolean: boolean("value_boolean"),
    valueDate: timestamp("value_date", { withTimezone: true, mode: "date" }),
    valueYear: integer("value_year"),
    optionId: bigint("option_id", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_oav_offer_attribute").on(t.offerId, t.attributeId),
    check("chk_oav_value_exclusivity", sql`
      num_nonnulls(
        value_text,
        value_number,
        value_boolean,
        value_date,
        value_year,
        option_id
      ) = 1
    `),
    foreignKey({
      name: "fk_oav_offer",
      columns: [t.offerId],
      foreignColumns: [offers.id]
    }),
    foreignKey({
      name: "fk_oav_attribute",
      columns: [t.attributeId],
      foreignColumns: [attributeDefinitions.id]
    }),
    foreignKey({
      name: "fk_oav_option",
      columns: [t.optionId],
      foreignColumns: [controlledOptionValues.id]
    }),
  ]
);

export const offerAttributeOptionValues = pgTable(
  "offer_attribute_option_values",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    offerId: bigint("offer_id", { mode: "number" }).notNull(),
    attributeId: bigint("attribute_id", { mode: "number" }).notNull(),
    optionId: bigint("option_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_oaov_offer_attribute_option").on(t.offerId, t.attributeId, t.optionId),
    foreignKey({
      name: "fk_oaov_offer",
      columns: [t.offerId],
      foreignColumns: [offers.id]
    }),
    foreignKey({
      name: "fk_oaov_attribute",
      columns: [t.attributeId],
      foreignColumns: [attributeDefinitions.id]
    }),
    foreignKey({
      name: "fk_oaov_option",
      columns: [t.optionId],
      foreignColumns: [controlledOptionValues.id]
    }),
  ]
);

export const migrationBatches = pgTable(
  "migration_batches",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    status: varchar("status", { length: 30 }).notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sourceDescription: text("source_description").notNull(),
    createdBy: text("created_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_mb_status", sql`${t.status} IN ('running','completed','rollback_in_progress','rolled_back','rollback_conflict','failed')`),
  ]
);

export const migrationSourceEntries = pgTable(
  "migration_source_entries",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    batchId: bigint("batch_id", { mode: "number" }).notNull(),
    sourceOfferId: bigint("source_offer_id", { mode: "number" }).notNull(),
    sourceKey: text("source_key").notNull(),
    rawValue: jsonb("raw_value").notNull(),
    sourceHash: text("source_hash").notNull(),
    sourcePayloadVersion: varchar("source_payload_version", { length: 20 }).notNull(),
    processingStatus: varchar("processing_status", { length: 30 }).notNull().default("pending"),
    classificationStatus: varchar("classification_status", { length: 30 }),
    classificationReason: text("classification_reason"),
    expectedTargetCount: integer("expected_target_count").notNull(),
    frequency: integer("frequency").notNull().default(1),
    approvedReason: text("approved_reason"),
    scopeOwner: text("scope_owner"),
    decisionTimestamp: timestamp("decision_timestamp", { withTimezone: true }),
    fallbackStatus: text("fallback_status"),
    processingErrorCode: varchar("processing_error_code", { length: 64 }),
    processingErrorMessage: text("processing_error_message"),
    processingFailedAt: timestamp("processing_failed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_mse_proc_status", sql`${t.processingStatus} IN ('pending','processing','processed','failed')`),
    check("chk_mse_class_status", sql`${t.classificationStatus} IN ('migrated','intentionally_skipped','manual_review_required','out_of_scope')`),
    check("chk_mse_technical_error_state_matrix", sql`
      (
        ${t.processingStatus} IN ('pending', 'processing')
        AND ${t.classificationStatus} IS NULL
        AND ${t.processingErrorCode} IS NULL
        AND ${t.processingErrorMessage} IS NULL
        AND ${t.processingFailedAt} IS NULL
      )
      OR
      (
        ${t.processingStatus} = 'processed'
        AND ${t.classificationStatus} IS NOT NULL
        AND ${t.processingErrorCode} IS NULL
        AND ${t.processingErrorMessage} IS NULL
        AND ${t.processingFailedAt} IS NULL
      )
      OR
      (
        ${t.processingStatus} = 'failed'
        AND ${t.classificationStatus} IS NULL
        AND ${t.processingErrorCode} IS NOT NULL
        AND ${t.processingErrorMessage} IS NOT NULL
        AND ${t.processingFailedAt} IS NOT NULL
      )
    `),
    check("chk_mse_expected_nonnegative", sql`${t.expectedTargetCount} >= 0`),
    check("chk_mse_expected_by_classification", sql`
      (
        ${t.classificationStatus} = 'migrated'
        AND ${t.expectedTargetCount} >= 1
      )
      OR
      (
        ${t.classificationStatus} IN ('intentionally_skipped', 'manual_review_required', 'out_of_scope')
        AND ${t.expectedTargetCount} = 0
      )
      OR
      ${t.classificationStatus} IS NULL
    `),
    check("chk_mse_out_of_scope_governance", sql`
      ${t.classificationStatus} <> 'out_of_scope'
      OR (
        ${t.approvedReason} IS NOT NULL
        AND ${t.scopeOwner} IS NOT NULL
        AND ${t.decisionTimestamp} IS NOT NULL
        AND ${t.fallbackStatus} IS NOT NULL
        AND ${t.frequency} > 0
      )
    `),
    check("chk_mse_source_payload_version", sql`${t.sourcePayloadVersion} IN ('lm-source-v1', 'lm-source-v2')`),
    unique("uq_mse_source_identity").on(t.batchId, t.sourceOfferId, t.sourceKey),
    unique("uq_mse_id_batch").on(t.id, t.batchId),
    foreignKey({
      name: "fk_mse_batch",
      columns: [t.batchId],
      foreignColumns: [migrationBatches.id]
    }),
  ]
);

export const migrationOavTargets = pgTable(
  "migration_oav_targets",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    batchId: bigint("batch_id", { mode: "number" }).notNull(),
    sourceEntryId: bigint("source_entry_id", { mode: "number" }).notNull(),
    targetRowIdCurrent: bigint("target_row_id_current", { mode: "number" }),
    targetRowIdOriginal: bigint("target_row_id_original", { mode: "number" }).notNull(),
    targetOfferId: bigint("target_offer_id", { mode: "number" }).notNull(),
    targetAttributeId: bigint("target_attribute_id", { mode: "number" }).notNull(),
    targetOptionId: bigint("target_option_id", { mode: "number" }),
    targetHashAtCreation: text("target_hash_at_creation").notNull(),
    canonicalPayloadVersion: varchar("canonical_payload_version", { length: 20 }).notNull(),
    targetProvenance: varchar("target_provenance", { length: 30 }).notNull(),
    rollbackStatus: varchar("rollback_status", { length: 30 }).notNull().default("pending"),
    rollbackReason: text("rollback_reason"),
    targetDeletedAt: timestamp("target_deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_mot_provenance", sql`${t.targetProvenance} IN ('created_by_batch', 'unknown_legacy')`),
    check("chk_mot_canonical_version", sql`${t.canonicalPayloadVersion} IN ('lm-source-v1', 'lm-source-v2')`),
    check("chk_mot_rollback_status", sql`${t.rollbackStatus} IN ('pending','cleaned_up','rollback_conflict')`),
    check("chk_mot_hash_format", sql`${t.targetHashAtCreation} ~ '^[0-9a-f]{64}$'`),
    check("chk_mot_row_ids", sql`${t.targetRowIdCurrent} IS NULL OR ${t.targetRowIdCurrent} = ${t.targetRowIdOriginal}`),
    check("chk_mot_lifecycle", sql`
      (
        ${t.rollbackStatus} = 'pending'
        AND ${t.targetRowIdCurrent} IS NOT NULL
        AND ${t.targetDeletedAt} IS NULL
        AND ${t.rollbackReason} IS NULL
      )
      OR
      (
        ${t.rollbackStatus} = 'cleaned_up'
        AND ${t.targetRowIdCurrent} IS NULL
        AND ${t.targetDeletedAt} IS NOT NULL
        AND ${t.rollbackReason} = 'deleted_by_batch_rollback'
      )
      OR
      (
        ${t.rollbackStatus} = 'rollback_conflict'
        AND ${t.rollbackReason} IS NOT NULL
        AND ${t.targetDeletedAt} IS NULL
      )
    `),
    unique("uq_mot_target_original").on(t.targetRowIdOriginal),
    unique("uq_mot_target_current").on(t.targetRowIdCurrent),
    foreignKey({
      name: "fk_mot_oav_target_current",
      columns: [t.targetRowIdCurrent],
      foreignColumns: [offerAttributeValues.id]
    }).onDelete("no action"),
    foreignKey({
      name: "fk_mot_option",
      columns: [t.targetOptionId],
      foreignColumns: [controlledOptionValues.id]
    }),
    foreignKey({
      name: "fk_mot_source_entry",
      columns: [t.sourceEntryId, t.batchId],
      foreignColumns: [migrationSourceEntries.id, migrationSourceEntries.batchId]
    }),
    foreignKey({
      name: "fk_mot_batch",
      columns: [t.batchId],
      foreignColumns: [migrationBatches.id]
    }),
  ]
);

export const migrationOaovTargets = pgTable(
  "migration_oaov_targets",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    batchId: bigint("batch_id", { mode: "number" }).notNull(),
    sourceEntryId: bigint("source_entry_id", { mode: "number" }).notNull(),
    targetRowIdCurrent: bigint("target_row_id_current", { mode: "number" }),
    targetRowIdOriginal: bigint("target_row_id_original", { mode: "number" }).notNull(),
    targetOfferId: bigint("target_offer_id", { mode: "number" }).notNull(),
    targetAttributeId: bigint("target_attribute_id", { mode: "number" }).notNull(),
    targetOptionId: bigint("target_option_id", { mode: "number" }).notNull(),
    targetHashAtCreation: text("target_hash_at_creation").notNull(),
    canonicalPayloadVersion: varchar("canonical_payload_version", { length: 20 }).notNull(),
    targetProvenance: varchar("target_provenance", { length: 30 }).notNull(),
    rollbackStatus: varchar("rollback_status", { length: 30 }).notNull().default("pending"),
    rollbackReason: text("rollback_reason"),
    targetDeletedAt: timestamp("target_deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("chk_mott_provenance", sql`${t.targetProvenance} IN ('created_by_batch', 'unknown_legacy')`),
    check("chk_mott_canonical_version", sql`${t.canonicalPayloadVersion} IN ('lm-source-v1', 'lm-source-v2')`),
    check("chk_mott_rollback_status", sql`${t.rollbackStatus} IN ('pending','cleaned_up','rollback_conflict')`),
    check("chk_mott_hash_format", sql`${t.targetHashAtCreation} ~ '^[0-9a-f]{64}$'`),
    check("chk_mott_row_ids", sql`${t.targetRowIdCurrent} IS NULL OR ${t.targetRowIdCurrent} = ${t.targetRowIdOriginal}`),
    check("chk_mott_lifecycle", sql`
      (
        ${t.rollbackStatus} = 'pending'
        AND ${t.targetRowIdCurrent} IS NOT NULL
        AND ${t.targetDeletedAt} IS NULL
        AND ${t.rollbackReason} IS NULL
      )
      OR
      (
        ${t.rollbackStatus} = 'cleaned_up'
        AND ${t.targetRowIdCurrent} IS NULL
        AND ${t.targetDeletedAt} IS NOT NULL
        AND ${t.rollbackReason} = 'deleted_by_batch_rollback'
      )
      OR
      (
        ${t.rollbackStatus} = 'rollback_conflict'
        AND ${t.rollbackReason} IS NOT NULL
        AND ${t.targetDeletedAt} IS NULL
      )
    `),
    unique("uq_mott_target_original").on(t.targetRowIdOriginal),
    unique("uq_mott_target_current").on(t.targetRowIdCurrent),
    foreignKey({
      name: "fk_mott_oaov_target_current",
      columns: [t.targetRowIdCurrent],
      foreignColumns: [offerAttributeOptionValues.id]
    }).onDelete("no action"),
    foreignKey({
      name: "fk_mott_source_entry",
      columns: [t.sourceEntryId, t.batchId],
      foreignColumns: [migrationSourceEntries.id, migrationSourceEntries.batchId]
    }),
    foreignKey({
      name: "fk_mott_batch",
      columns: [t.batchId],
      foreignColumns: [migrationBatches.id]
    }),
  ]
);

export const categoryAttributeAssignments = pgTable(
  "category_attribute_assignments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    categoryId: bigint("category_id", { mode: "number" }).notNull(),
    attributeDefinitionId: bigint("attribute_definition_id", { mode: "number" }).notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isFilterable: boolean("is_filterable").notNull().default(false),
    isComparable: boolean("is_comparable").notNull().default(false),
    isRequired: boolean("is_required").notNull().default(false),
    isVisible: boolean("is_visible").notNull().default(true),
    unitCode: varchar("unit_code", { length: 20 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_caa_category_attribute").on(t.categoryId, t.attributeDefinitionId),
    check("chk_caa_sort_order", sql`${t.sortOrder} >= 0`),
    foreignKey({
      name: "fk_caa_category",
      columns: [t.categoryId],
      foreignColumns: [categories.id],
    }),
    foreignKey({
      name: "fk_caa_attribute_definition",
      columns: [t.attributeDefinitionId],
      foreignColumns: [attributeDefinitions.id],
    }),
    index("idx_caa_cat_visible_sort").on(t.categoryId, t.isVisible, t.sortOrder),
    index("idx_caa_cat_filterable_sort").on(t.categoryId, t.isFilterable, t.sortOrder),
    index("idx_caa_attribute").on(t.attributeDefinitionId),
  ]
);

export const attributeDefinitionTranslations = pgTable(
  "attribute_definition_translations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    attributeDefinitionId: bigint("attribute_definition_id", { mode: "number" }).notNull(),
    locale: varchar("locale", { length: 10 }).notNull(),
    name: text("name").notNull(),
    shortLabel: varchar("short_label", { length: 100 }),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_adt_attribute_locale").on(t.attributeDefinitionId, t.locale),
    check("chk_adt_locale", sql`${t.locale} IN ('pl','en','de','fr','uk','es','zh')`),
    foreignKey({
      name: "fk_adt_attribute_definition",
      columns: [t.attributeDefinitionId],
      foreignColumns: [attributeDefinitions.id],
    }),
  ]
);

export const controlledOptionValueTranslations = pgTable(
  "controlled_option_value_translations",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    controlledOptionValueId: bigint("controlled_option_value_id", { mode: "number" }).notNull(),
    locale: varchar("locale", { length: 10 }).notNull(),
    label: text("label").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(() => new Date()),
  },
  (t) => [
    unique("uq_covt_option_locale").on(t.controlledOptionValueId, t.locale),
    check("chk_covt_locale", sql`${t.locale} IN ('pl','en','de','fr','uk','es','zh')`),
    foreignKey({
      name: "fk_covt_controlled_option_value",
      columns: [t.controlledOptionValueId],
      foreignColumns: [controlledOptionValues.id],
    }),
  ]
);

export type Partner = typeof partners.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Offer = typeof offers.$inferSelect;
export type TechnicalAttributes = Record<string, string | number>;

export type CategoryAttributeAssignment = typeof categoryAttributeAssignments.$inferSelect;
export type AttributeDefinitionTranslation = typeof attributeDefinitionTranslations.$inferSelect;
export type ControlledOptionValueTranslation = typeof controlledOptionValueTranslations.$inferSelect;
export type ControlledOptionValue = typeof controlledOptionValues.$inferSelect;
export type OfferAttributeValue = typeof offerAttributeValues.$inferSelect;
export type OfferAttributeOptionValue = typeof offerAttributeOptionValues.$inferSelect;
export type MigrationBatch = typeof migrationBatches.$inferSelect;
export type MigrationSourceEntry = typeof migrationSourceEntries.$inferSelect;
export type MigrationOavTarget = typeof migrationOavTargets.$inferSelect;
export type MigrationOaovTarget = typeof migrationOaovTargets.$inferSelect;

export const migrationRollbackAttempts = pgTable(
  "migration_rollback_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    batchId: bigint("batch_id", { mode: "number" }).notNull(),
    attemptNumber: integer("attempt_number").notNull(),
    status: varchar("status", { length: 30 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    sqlstate: varchar("sqlstate", { length: 5 }),
    constraintName: text("constraint_name"),
    message: text("message"),
    detail: text("detail"),
    hint: text("hint"),
    targetsDeletedCount: integer("targets_deleted_count").notNull().default(0),
    targetsSkippedCount: integer("targets_skipped_count").notNull().default(0),
    targetsConflictCount: integer("targets_conflict_count").notNull().default(0),
    initiatedBy: text("initiated_by").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("uq_mra_batch_attempt").on(t.batchId, t.attemptNumber),
    check("chk_mra_attempt_number", sql`${t.attemptNumber} > 0`),
    check("chk_mra_deleted_nonnegative", sql`${t.targetsDeletedCount} >= 0`),
    check("chk_mra_skipped_nonnegative", sql`${t.targetsSkippedCount} >= 0`),
    check("chk_mra_conflict_nonnegative", sql`${t.targetsConflictCount} >= 0`),
    check("chk_mra_status_check", sql`${t.status} IN ('running', 'succeeded', 'failed', 'conflict')`),
    check("chk_mra_lifecycle", sql`
      (
        ${t.status} = 'running'
        AND ${t.finishedAt} IS NULL
        AND ${t.sqlstate} IS NULL
        AND ${t.constraintName} IS NULL
        AND ${t.message} IS NULL
        AND ${t.detail} IS NULL
        AND ${t.hint} IS NULL
        AND ${t.targetsDeletedCount} = 0
        AND ${t.targetsSkippedCount} = 0
        AND ${t.targetsConflictCount} = 0
      )
      OR
      (
        ${t.status} = 'succeeded'
        AND ${t.finishedAt} IS NOT NULL
        AND ${t.sqlstate} IS NULL
        AND ${t.constraintName} IS NULL
        AND ${t.message} IS NULL
        AND ${t.detail} IS NULL
        AND ${t.hint} IS NULL
        AND ${t.targetsDeletedCount} > 0
        AND ${t.targetsConflictCount} = 0
      )
      OR
      (
        ${t.status} = 'failed'
        AND ${t.finishedAt} IS NOT NULL
        AND ${t.sqlstate} IS NOT NULL
        AND char_length(${t.sqlstate}) = 5
        AND ${t.message} IS NOT NULL
      )
      OR
      (
        ${t.status} = 'conflict'
        AND ${t.finishedAt} IS NOT NULL
        AND ${t.targetsConflictCount} > 0
        AND ${t.sqlstate} IS NULL
        AND ${t.constraintName} IS NULL
        AND ${t.message} IS NULL
        AND ${t.detail} IS NULL
        AND ${t.hint} IS NULL
      )
    `),
    check("chk_mra_sqlstate", sql`${t.sqlstate} IS NULL OR char_length(${t.sqlstate}) = 5`),
    foreignKey({
      name: "fk_mra_batch",
      columns: [t.batchId],
      foreignColumns: [migrationBatches.id]
    }).onDelete("restrict"),
  ]
);

export type MigrationRollbackAttempt = typeof migrationRollbackAttempts.$inferSelect;

