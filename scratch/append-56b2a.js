const fs = require('fs');
const schemaAddition = \
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
}, (t) => [
  check("chk_buyer_identifiers_present", sql\((tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))\),
  check("chk_buyer_tax_pair", sql\((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))\),
  check("chk_buyer_registry_pair", sql\((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))\),
  check("chk_buyer_business_verification_status", sql\((business_verification_status)::text = ANY ((ARRAY['unknown'::character varying, 'unverified'::character varying, 'verified'::character varying, 'failed'::character varying])::text[]))\),
  check("chk_buyer_verification_consistency", sql\(((business_verification_status)::text = 'verified' AND business_verification_method IS NOT NULL AND business_verification_source IS NOT NULL AND business_verified_at IS NOT NULL) OR ((business_verification_status)::text != 'verified'))\),
  check("chk_buyer_category_b_status", sql\((category_b_status)::text = ANY ((ARRAY['unknown'::character varying, 'not_applicable'::character varying, 'applicable'::character varying, 'under_review'::character varying])::text[]))\),
  check("chk_buyer_legal_review_state", sql\((legal_context_review_state)::text = ANY ((ARRAY['no_review_needed'::character varying, 'pending_review'::character varying, 'approved_by_review'::character varying, 'rejected_by_review'::character varying])::text[]))\),
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
  check("chk_marketplace_orders_status", sql\((status)::text = ANY ((ARRAY['intent_created'::character varying, 'checkout_submitted'::character varying, 'pending_seller_review'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))\),
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
  check("chk_disclosure_tax_pair", sql\((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))\),
  index("idx_mkt_order_disclosure_mkt_order").on(t.marketplaceOrderId),
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
  check("chk_seller_orders_status", sql\((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying])::text[]))\),
  index("idx_seller_orders_partner").on(t.partnerId),
  index("idx_seller_orders_mkt_order").on(t.marketplaceOrderId),
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
}, (t) => [
  check("chk_snapshot_tax_pair", sql\((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))\),
  check("chk_snapshot_registry_pair", sql\((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))\),
  check("chk_snapshot_contract_model", sql\((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[]))\),
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
  check("chk_seller_order_items_qty", sql\(quantity > 0)\),
  check("chk_seller_order_items_currency_shape", sql\(currency ~ '^[A-Z]{3}$')\),
  index("idx_seller_order_items_seller_order").on(t.sellerOrderId),
]);

export const sellerAcceptanceDecisions = pgTable("seller_acceptance_decisions", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  sellerOrderId: bigint("seller_order_id", { mode: "number" }).notNull().unique().references(() => sellerOrders.id),
  decisionStatus: varchar("decision_status", { length: 50 }).notNull().default("pending_seller_review"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
}, (t) => [
  check("chk_seller_acc_dec_status", sql\((decision_status)::text = ANY ((ARRAY['pending_seller_review'::character varying, 'seller_accepted'::character varying, 'seller_rejected'::character varying, 'expired'::character varying])::text[]))\),
  check("chk_seller_acc_dec_consistency", sql\(((decision_status)::text = 'pending_seller_review' AND resolved_at IS NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'seller_accepted' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR ((decision_status)::text = 'seller_rejected' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'expired' AND resolved_at IS NOT NULL AND accepted_at IS NULL))\),
]);
\
fs.appendFileSync('src/lib/schema.ts', schemaAddition);
