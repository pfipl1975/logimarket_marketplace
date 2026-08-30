import {
  index,
  AnyPgColumn,
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
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type {
  LegalIdentitySnapshot,
  RegistryIdentifierSnapshot,
  TaxIdentifierSnapshot,
} from "./verification/events-core";


export const partners = pgTable("partners", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  companyName: varchar("company_name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 512 }),
  contactEmail: varchar("contact_email", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
  websiteUrl: varchar("website_url"),
});

export const categories = pgTable("categories", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentId: bigint("parent_id", { mode: "number" }),
  createdAt: timestamp("created_at", { withTimezone: false }).notNull().defaultNow(),
});

export type OfferPublicationStatus = "draft" | "published" | "hidden" | "archived" | "deleted";

export const offers = pgTable("offers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  categoryId: bigint("category_id", { mode: "number" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  priceBrutto: numeric("price_brutto"),
  outboundUrl: varchar("outbound_url", { length: 512 }),
  technicalAttributes: jsonb("technical_attributes").notNull().default({}),
  offerModel: varchar("offer_model", { length: 20 }).notNull().default("rfq"),
  description: text("description"),
  imageUrl: varchar("image_url", { length: 512 }),
  priceOnRequest: boolean("price_on_request").notNull().default(true),
  conversionType: varchar("conversion_type", { length: 20 }).notNull().default("outbound"),
  isFeatured: boolean("is_featured").notNull().default(false),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  publicationStatus: varchar("publication_status", { length: 20 }).$type<OfferPublicationStatus>().notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  contractModel: varchar("contract_model", { length: 30 }),
}, () => [
  check("offers_contract_model_check", sql`((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[]))`)
]);

export const clicks = pgTable("clicks", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: integer("offer_id"),
  partnerId: integer("partner_id"),
  clickedAt: timestamp("clicked_at", { withTimezone: false }).defaultNow(),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  ipHash: varchar("ip_hash", { length: 64 }).notNull(),
  isUnique24h: boolean("is_unique_24h").default(true),
});

export type RfqStatus = "new" | "in_progress" | "responded" | "closed";

export const rfqLeads = pgTable("rfq_leads", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 100 }),
  message: text("message"),
  status: varchar("status", { length: 20 }).notNull().default("new").$type<RfqStatus>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (t) => [
  check("rfq_leads_status_check", sql`((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[]))`),
  foreignKey({
    name: "rfq_leads_offer_id_fkey",
    columns: [t.offerId],
    foreignColumns: [offers.id]
  }).onDelete("no action").onUpdate("no action"),
  foreignKey({
    name: "rfq_leads_partner_id_fkey",
    columns: [t.partnerId],
    foreignColumns: [partners.id]
  }).onDelete("no action").onUpdate("no action"),
  index("idx_rfq_leads_offer").on(t.offerId),
  index("idx_rfq_leads_partner").on(t.partnerId)
]);

export const cartItems = pgTable("cart_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const orders = pgTable("orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("new"),
  companyName: varchar("company_name", { length: 255 }),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 100 }),
  message: text("message"),
  totalAmount: varchar("total_amount", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  orderId: bigint("order_id", { mode: "number" }).notNull(),
  offerId: bigint("offer_id", { mode: "number" }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: varchar("unit_price", { length: 50 }),
  totalPrice: varchar("total_price", { length: 50 }),
});

export const sellerLegalIdentities = pgTable("seller_legal_identities", {
  partnerId: bigint("partner_id", { mode: "number" }).primaryKey(),
  legalName: varchar("legal_name", { length: 255 }).notNull(),
  jurisdictionCountry: varchar("jurisdiction_country", { length: 2 }).notNull(),
  verificationStatus: varchar("verification_status", { length: 30 }).notNull().default("unverified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationSource: varchar("verification_source", { length: 100 }),
  verificationReference: text("verification_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  registeredAddressLine1: varchar("registered_address_line1", { length: 255 }),
  registeredAddressLine2: varchar("registered_address_line2", { length: 255 }),
  registeredPostalCode: varchar("registered_postal_code", { length: 32 }),
  registeredCity: varchar("registered_city", { length: 120 }),
  registeredRegion: varchar("registered_region", { length: 120 }),
  registeredCountryCode: varchar("registered_country_code", { length: 2 }),
  currentVerificationEventId: bigint("current_verification_event_id", { mode: "number" }).references((): AnyPgColumn => sellerVerificationEvents.id),
}, (t) => [
  foreignKey({
    name: "seller_legal_identities_partner_id_fkey",
    columns: [t.partnerId],
    foreignColumns: [partners.id]
  }).onDelete("no action").onUpdate("no action")
]);

export const sellerTaxIdentifiers = pgTable("seller_tax_identifiers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  identifierType: varchar("identifier_type", { length: 50 }).notNull(),
  identifierValue: varchar("identifier_value", { length: 100 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  verificationStatus: varchar("verification_status", { length: 30 }).notNull().default("unverified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationSource: varchar("verification_source", { length: 100 }),
  verificationReference: text("verification_reference"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  currentVerificationEventId: bigint("current_verification_event_id", { mode: "number" }).references((): AnyPgColumn => sellerVerificationEvents.id),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
}, (t) => [
  unique("uq_seller_tax_identifier_identity").on(t.partnerId, t.identifierType, t.countryCode, t.identifierValue),
  foreignKey({
    name: "seller_tax_identifiers_partner_id_fkey",
    columns: [t.partnerId],
    foreignColumns: [sellerLegalIdentities.partnerId]
  }).onDelete("no action").onUpdate("no action")
]);

export const sellerRegistryIdentifiers = pgTable("seller_registry_identifiers", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  partnerId: bigint("partner_id", { mode: "number" }).notNull(),
  registryType: varchar("registry_type", { length: 50 }).notNull(),
  registryValue: varchar("registry_value", { length: 100 }).notNull(),
  jurisdictionCountry: varchar("jurisdiction_country", { length: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  verificationStatus: varchar("verification_status", { length: 30 }).default("unverified"),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  verificationSource: varchar("verification_source", { length: 100 }),
  verificationReference: text("verification_reference"),
  currentVerificationEventId: bigint("current_verification_event_id", { mode: "number" }).references((): AnyPgColumn => sellerVerificationEvents.id),
  retiredAt: timestamp("retired_at", { withTimezone: true }),
}, (t) => [
  unique("uq_seller_registry_identifier_identity").on(t.partnerId, t.registryType, t.jurisdictionCountry, t.registryValue),
  foreignKey({
    name: "seller_registry_identifiers_partner_id_fkey",
    columns: [t.partnerId],
    foreignColumns: [sellerLegalIdentities.partnerId]
  }).onDelete("no action").onUpdate("no action")
]);

export const sellerEligibility = pgTable("seller_eligibility", {
  partnerId: bigint("partner_id", { mode: "number" }).primaryKey(),
  eligibilityStatus: varchar("eligibility_status", { length: 30 }).notNull().default("pending"),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  check("seller_eligibility_status_check", sql`((eligibility_status)::text = ANY ((ARRAY['pending'::character varying, 'eligible'::character varying, 'ineligible'::character varying, 'suspended'::character varying])::text[]))`),
  foreignKey({
    name: "seller_eligibility_partner_id_fkey",
    columns: [t.partnerId],
    foreignColumns: [partners.id]
  }).onDelete("no action").onUpdate("no action")
]);


// -----------------------------------------------------------------------------
// Seller Verification Events (Immutable History)
// -----------------------------------------------------------------------------
export const sellerVerificationEvents = pgTable("seller_verification_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  subjectType: varchar("subject_type", { length: 50 }).notNull(),
  legalIdentityPartnerId: bigint("legal_identity_partner_id", { mode: "number" }),
  taxIdentifierId: bigint("tax_identifier_id", { mode: "number" }),
  registryIdentifierId: bigint("registry_identifier_id", { mode: "number" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  actorType: varchar("actor_type", { length: 50 }).notNull(),
  actorUserId: varchar("actor_user_id", { length: 255 }),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceName: varchar("source_name", { length: 100 }),
  sourceReference: text("source_reference"),
  reasonCode: varchar("reason_code", { length: 100 }),
  subjectSnapshot: jsonb("subject_snapshot").$type<LegalIdentitySnapshot | TaxIdentifierSnapshot | RegistryIdentifierSnapshot>().notNull(),
  previousVerificationStatus: varchar("previous_verification_status", { length: 30 }),
  previousVerifiedAt: timestamp("previous_verified_at", { withTimezone: true }),
  previousVerificationSource: varchar("previous_verification_source", { length: 100 }),
  previousVerificationReference: text("previous_verification_reference"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("subject_matrix_check", sql`
    (subject_type = 'legal_identity' AND legal_identity_partner_id IS NOT NULL AND tax_identifier_id IS NULL AND registry_identifier_id IS NULL)
    OR
    (subject_type = 'tax_identifier' AND legal_identity_partner_id IS NULL AND tax_identifier_id IS NOT NULL AND registry_identifier_id IS NULL)
    OR
    (subject_type = 'registry_identifier' AND legal_identity_partner_id IS NULL AND tax_identifier_id IS NULL AND registry_identifier_id IS NOT NULL)
  `),
  check("event_type_check", sql`event_type IN ('verified', 'rejected', 'invalidated')`),
  check("actor_type_check", sql`actor_type IN ('admin', 'system', 'external_adapter')`),
  check("actor_matrix_check", sql`
    (actor_type = 'admin' AND actor_user_id IS NOT NULL)
    OR
    (actor_type = 'system' AND actor_user_id IS NULL)
    OR
    (actor_type = 'external_adapter' AND actor_user_id IS NULL)
  `),
  check("source_type_check", sql`source_type IN ('admin_manual', 'public_registry_manual', 'partner_document', 'external_adapter', 'system_rule')`),
  foreignKey({
    name: "seller_verification_events_legal_identity_fkey",
    columns: [t.legalIdentityPartnerId],
    foreignColumns: [sellerLegalIdentities.partnerId]
  }).onDelete("restrict"),
  foreignKey({
    name: "seller_verification_events_tax_identifier_fkey",
    columns: [t.taxIdentifierId],
    foreignColumns: [sellerTaxIdentifiers.id]
  }).onDelete("restrict"),
  foreignKey({
    name: "seller_verification_events_registry_identifier_fkey",
    columns: [t.registryIdentifierId],
    foreignColumns: [sellerRegistryIdentifiers.id]
  }).onDelete("restrict"),
  index("idx_verification_events_legal_subject").on(t.legalIdentityPartnerId),
  index("idx_verification_events_tax_subject").on(t.taxIdentifierId),
  index("idx_verification_events_registry_subject").on(t.registryIdentifierId),
]);


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
    unique("uq_cov_attribute_id_pair").on(t.attributeId, t.id),
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
    foreignKey({
      name: "fk_oav_attribute_option_pair",
      columns: [t.attributeId, t.optionId],
      foreignColumns: [controlledOptionValues.attributeId, controlledOptionValues.id]
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
    foreignKey({
      name: "fk_oaov_attribute_option_pair",
      columns: [t.attributeId, t.optionId],
      foreignColumns: [controlledOptionValues.attributeId, controlledOptionValues.id]
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
    updatedAt: timestamp("updated_at", { withTimezone: true }),
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
    updatedAt: timestamp("updated_at", { withTimezone: true }),
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
    updatedAt: timestamp("updated_at", { withTimezone: true }),
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
export type SellerLegalIdentity = typeof sellerLegalIdentities.$inferSelect;
export type SellerTaxIdentifier = typeof sellerTaxIdentifiers.$inferSelect;
export type SellerRegistryIdentifier = typeof sellerRegistryIdentifiers.$inferSelect;
export type SellerEligibility = typeof sellerEligibility.$inferSelect;
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


// ============================================================================
// 56B2-A MARKETPLACE SCHEMA
// ============================================================================

export const buyerLegalContextSnapshots = pgTable("buyer_legal_context_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  businessName: varchar("business_name", { length: 255 }).notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  taxIdentifierType: varchar("tax_identifier_type", { length: 50 }),
  taxIdentifierValue: varchar("tax_identifier_value", { length: 100 }),
  registryIdentifierType: varchar("registry_identifier_type", { length: 50 }),
  registryIdentifierValue: varchar("registry_identifier_value", { length: 100 }),
  businessVerificationStatus: varchar("business_verification_status", { length: 50 }).notNull().default("unknown"),
  businessVerificationMethod: varchar("business_verification_method", { length: 100 }),
  businessVerificationSource: varchar("business_verification_source", { length: 100 }),
  businessVerifiedAt: timestamp("business_verified_at", { withTimezone: true }),
  professionalPurposeEvidence: varchar("professional_purpose_evidence", { length: 1000 }),
  categoryBStatus: varchar("category_b_status", { length: 50 }).notNull().default("unknown"),
  legalContextReviewState: varchar("legal_context_review_state", { length: 50 }).notNull().default("no_review_needed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("chk_buyer_identifiers_present", sql`((tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))`),
  check("chk_buyer_tax_pair", sql`((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))`),
  check("chk_buyer_registry_pair", sql`((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))`),
  check("chk_buyer_business_verification_status", sql`((business_verification_status)::text = ANY ((ARRAY['unknown'::character varying, 'unverified'::character varying, 'verified'::character varying, 'failed'::character varying])::text[]))`),
  check("chk_buyer_verification_consistency", sql`(((business_verification_status)::text = 'verified' AND business_verification_method IS NOT NULL AND business_verification_source IS NOT NULL AND business_verified_at IS NOT NULL) OR ((business_verification_status)::text != 'verified'))`),
  check("chk_buyer_category_b_status", sql`((category_b_status)::text = ANY ((ARRAY['unknown'::character varying, 'not_applicable'::character varying, 'applicable'::character varying, 'under_review'::character varying])::text[]))`),
  check("chk_buyer_legal_review_state", sql`((legal_context_review_state)::text = ANY ((ARRAY['no_review_needed'::character varying, 'pending_review'::character varying, 'approved_by_review'::character varying, 'rejected_by_review'::character varying])::text[]))`),
]);

export const marketplaceOrders = pgTable("marketplace_orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sessionHash: varchar("session_hash", { length: 64 }).notNull(),
  buyerLegalContextSnapshotId: bigint("buyer_legal_context_snapshot_id", { mode: "number" }).notNull().unique().references(() => buyerLegalContextSnapshots.id),
  status: varchar("status", { length: 50 }).notNull().default("intent_created"),
  e2BuyerIntentAt: timestamp("e2_buyer_intent_at", { withTimezone: true }).notNull().defaultNow(),
  e3ReceiptAcknowledgedAt: timestamp("e3_receipt_acknowledged_at", { withTimezone: true }),
  customerPoNumber: varchar("customer_po_number", { length: 255 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  check("chk_marketplace_orders_status", sql`((status)::text = ANY ((ARRAY['intent_created'::character varying, 'checkout_submitted'::character varying, 'pending_seller_review'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))`),
  index("idx_marketplace_orders_session").on(t.sessionHash),
]);

export const marketplaceOrderSellerDisclosures = pgTable("marketplace_order_seller_disclosures", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  marketplaceOrderId: bigint("marketplace_order_id", { mode: "number" }).notNull().references(() => marketplaceOrders.id),
  partnerId: bigint("partner_id", { mode: "number" }).notNull().references(() => partners.id),
  sellerLegalName: varchar("seller_legal_name", { length: 255 }).notNull(),
  registeredAddress: varchar("registered_address", { length: 1000 }).notNull(),
  jurisdictionCountry: varchar("jurisdiction_country", { length: 2 }).notNull(),
  firmContactEmail: varchar("firm_contact_email", { length: 100 }).notNull(),
  sellerRole: varchar("seller_role", { length: 100 }).notNull(),
  goodsInvoiceIssuer: varchar("goods_invoice_issuer", { length: 100 }).notNull(),
  deliveryResponsibleParty: varchar("delivery_responsible_party", { length: 100 }).notNull(),
  complaintResponsibleParty: varchar("complaint_responsible_party", { length: 100 }).notNull(),
  returnResponsibleParty: varchar("return_responsible_party", { length: 100 }).notNull(),
  logimarketPlatformRole: varchar("logimarket_platform_role", { length: 100 }).notNull(),
  taxIdentifierType: varchar("tax_identifier_type", { length: 50 }),
  taxIdentifierValue: varchar("tax_identifier_value", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique("uq_mkt_order_disclosure_order_partner").on(t.marketplaceOrderId, t.partnerId),
  check("chk_disclosure_tax_pair", sql`((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))`),
]);

export const sellerOrders = pgTable("seller_orders", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  marketplaceOrderId: bigint("marketplace_order_id", { mode: "number" }).notNull().references(() => marketplaceOrders.id),
  partnerId: bigint("partner_id", { mode: "number" }).notNull().references(() => partners.id),
  status: varchar("status", { length: 50 }).notNull().default("submitted"),
  e6RoutedToSellerAt: timestamp("e6_routed_to_seller_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
  unique("uq_seller_orders_mkt_partner").on(t.marketplaceOrderId, t.partnerId),
  check("chk_seller_orders_status", sql`((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying])::text[]))`),
  index("idx_seller_orders_partner").on(t.partnerId),
]);

export const sellerOrderSellerSnapshots = pgTable("seller_order_seller_snapshots", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sellerOrderId: bigint("seller_order_id", { mode: "number" }).notNull().unique().references(() => sellerOrders.id),
  sellerLegalName: varchar("seller_legal_name", { length: 255 }).notNull(),
  sellerDisplayName: varchar("seller_display_name", { length: 255 }).notNull(),
  jurisdictionCountry: varchar("jurisdiction_country", { length: 2 }).notNull(),
  registeredAddress: varchar("registered_address", { length: 1000 }).notNull(),
  firmContactEmail: varchar("firm_contact_email", { length: 100 }).notNull(),
  taxIdentifierType: varchar("tax_identifier_type", { length: 50 }),
  taxIdentifierValue: varchar("tax_identifier_value", { length: 100 }),
  registryIdentifierType: varchar("registry_identifier_type", { length: 50 }),
  registryIdentifierValue: varchar("registry_identifier_value", { length: 100 }),
  contractModel: varchar("contract_model", { length: 100 }).notNull(),
  sellerOfRecordResponsibility: varchar("seller_of_record_responsibility", { length: 100 }).notNull(),
  goodsInvoiceResponsibility: varchar("goods_invoice_responsibility", { length: 100 }).notNull(),
  deliveryResponsibility: varchar("delivery_responsibility", { length: 100 }).notNull(),
  complaintResponsibility: varchar("complaint_responsibility", { length: 100 }).notNull(),
  returnResponsibility: varchar("return_responsibility", { length: 100 }).notNull(),
  refundFinancialLiability: varchar("refund_financial_liability", { length: 100 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, () => [
  check("chk_snapshot_tax_pair", sql`((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))`),
  check("chk_snapshot_registry_pair", sql`((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))`),
  check("chk_snapshot_contract_model", sql`((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[]))`),
]);

export const sellerOrderItems = pgTable("seller_order_items", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sellerOrderId: bigint("seller_order_id", { mode: "number" }).notNull().references(() => sellerOrders.id),
  offerId: bigint("offer_id", { mode: "number" }).notNull().references(() => offers.id),
  offerTitle: varchar("offer_title", { length: 500 }).notNull(),
  manufacturer: varchar("manufacturer", { length: 255 }),
  model: varchar("model", { length: 255 }),
  technicalDataRef: varchar("technical_data_ref", { length: 255 }),
  contentLanguage: varchar("content_language", { length: 10 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price").notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  taxContext: varchar("tax_context", { length: 100 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  check("chk_seller_order_items_qty", sql`(quantity > 0)`),
  check("chk_seller_order_items_currency_shape", sql`(currency ~ '^[A-Z]{3}$')`),
  index("idx_seller_order_items_seller_order").on(t.sellerOrderId),
]);

export const sellerAcceptanceDecisions = pgTable("seller_acceptance_decisions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sellerOrderId: bigint("seller_order_id", { mode: "number" }).notNull().unique().references(() => sellerOrders.id),
  decisionStatus: varchar("decision_status", { length: 50 }).notNull().default("pending_seller_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, () => [
  check("chk_seller_acc_dec_status", sql`((decision_status)::text = ANY ((ARRAY['pending_seller_review'::character varying, 'seller_accepted'::character varying, 'seller_rejected'::character varying, 'expired'::character varying])::text[]))`),
  check("chk_seller_acc_dec_consistency", sql`(((decision_status)::text = 'pending_seller_review' AND resolved_at IS NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'seller_accepted' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR ((decision_status)::text = 'seller_rejected' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'expired' AND resolved_at IS NOT NULL AND accepted_at IS NULL))`),
]);
