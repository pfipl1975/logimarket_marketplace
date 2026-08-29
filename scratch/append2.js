const fs = require('fs');
const schemaAddition = 
"// ============================================================================\n" +
"// 56B2-A MARKETPLACE SCHEMA\n" +
"// ============================================================================\n" +
"\n" +
"export const buyerLegalContextSnapshots = pgTable('buyer_legal_context_snapshots', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  businessName: varchar('business_name', { length: 255 }).notNull(),\n" +
"  countryCode: varchar('country_code', { length: 2 }).notNull(),\n" +
"  taxIdentifierType: varchar('tax_identifier_type', { length: 50 }),\n" +
"  taxIdentifierValue: varchar('tax_identifier_value', { length: 100 }),\n" +
"  registryIdentifierType: varchar('registry_identifier_type', { length: 50 }),\n" +
"  registryIdentifierValue: varchar('registry_identifier_value', { length: 100 }),\n" +
"  businessVerificationStatus: varchar('business_verification_status', { length: 50 }).notNull().default('unknown'),\n" +
"  businessVerificationMethod: varchar('business_verification_method', { length: 100 }),\n" +
"  businessVerificationSource: varchar('business_verification_source', { length: 100 }),\n" +
"  businessVerifiedAt: timestamp('business_verified_at', { withTimezone: true }),\n" +
"  professionalPurposeEvidence: varchar('professional_purpose_evidence', { length: 1000 }),\n" +
"  categoryBStatus: varchar('category_b_status', { length: 50 }).notNull().default('unknown'),\n" +
"  legalContextReviewState: varchar('legal_context_review_state', { length: 50 }).notNull().default('no_review_needed'),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"}, (t) => [\n" +
"  check('chk_buyer_identifiers_present', sql" + ` + "((tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))" + ` + "),\n" +
"  check('chk_buyer_tax_pair', sql" + ` + "((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))" + ` + "),\n" +
"  check('chk_buyer_registry_pair', sql" + ` + "((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))" + ` + "),\n" +
"  check('chk_buyer_business_verification_status', sql" + ` + "((business_verification_status)::text = ANY ((ARRAY['unknown'::character varying, 'unverified'::character varying, 'verified'::character varying, 'failed'::character varying])::text[]))" + ` + "),\n" +
"  check('chk_buyer_verification_consistency', sql" + ` + "(((business_verification_status)::text = 'verified' AND business_verification_method IS NOT NULL AND business_verification_source IS NOT NULL AND business_verified_at IS NOT NULL) OR ((business_verification_status)::text != 'verified'))" + ` + "),\n" +
"  check('chk_buyer_category_b_status', sql" + ` + "((category_b_status)::text = ANY ((ARRAY['unknown'::character varying, 'not_applicable'::character varying, 'applicable'::character varying, 'under_review'::character varying])::text[]))" + ` + "),\n" +
"  check('chk_buyer_legal_review_state', sql" + ` + "((legal_context_review_state)::text = ANY ((ARRAY['no_review_needed'::character varying, 'pending_review'::character varying, 'approved_by_review'::character varying, 'rejected_by_review'::character varying])::text[]))" + ` + "),\n" +
"]);\n" +
"\n" +
"export const marketplaceOrders = pgTable('marketplace_orders', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  sessionHash: varchar('session_hash', { length: 64 }).notNull(),\n" +
"  buyerLegalContextSnapshotId: bigint('buyer_legal_context_snapshot_id', { mode: 'number' }).notNull().unique().references(() => buyerLegalContextSnapshots.id),\n" +
"  status: varchar('status', { length: 50 }).notNull().default('intent_created'),\n" +
"  e2BuyerIntentAt: timestamp('e2_buyer_intent_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"  e3ReceiptAcknowledgedAt: timestamp('e3_receipt_acknowledged_at', { withTimezone: true }),\n" +
"  customerPoNumber: varchar('customer_po_number', { length: 255 }),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"  updatedAt: timestamp('updated_at', { withTimezone: true }),\n" +
"}, (t) => [\n" +
"  check('chk_marketplace_orders_status', sql" + ` + "((status)::text = ANY ((ARRAY['intent_created'::character varying, 'checkout_submitted'::character varying, 'pending_seller_review'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))" + ` + "),\n" +
"  index('idx_marketplace_orders_session').on(t.sessionHash),\n" +
"]);\n" +
"\n" +
"export const marketplaceOrderSellerDisclosures = pgTable('marketplace_order_seller_disclosures', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  marketplaceOrderId: bigint('marketplace_order_id', { mode: 'number' }).notNull().references(() => marketplaceOrders.id),\n" +
"  partnerId: bigint('partner_id', { mode: 'number' }).notNull().references(() => partners.id),\n" +
"  sellerLegalName: varchar('seller_legal_name', { length: 255 }).notNull(),\n" +
"  registeredAddress: varchar('registered_address', { length: 1000 }).notNull(),\n" +
"  jurisdictionCountry: varchar('jurisdiction_country', { length: 2 }).notNull(),\n" +
"  firmContactEmail: varchar('firm_contact_email', { length: 100 }).notNull(),\n" +
"  sellerRole: varchar('seller_role', { length: 100 }).notNull(),\n" +
"  goodsInvoiceIssuer: varchar('goods_invoice_issuer', { length: 100 }).notNull(),\n" +
"  deliveryResponsibleParty: varchar('delivery_responsible_party', { length: 100 }).notNull(),\n" +
"  complaintResponsibleParty: varchar('complaint_responsible_party', { length: 100 }).notNull(),\n" +
"  returnResponsibleParty: varchar('return_responsible_party', { length: 100 }).notNull(),\n" +
"  logimarketPlatformRole: varchar('logimarket_platform_role', { length: 100 }).notNull(),\n" +
"  taxIdentifierType: varchar('tax_identifier_type', { length: 50 }),\n" +
"  taxIdentifierValue: varchar('tax_identifier_value', { length: 100 }),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"}, (t) => [\n" +
"  unique('uq_mkt_order_disclosure_order_partner').on(t.marketplaceOrderId, t.partnerId),\n" +
"  check('chk_disclosure_tax_pair', sql" + ` + "((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))" + ` + "),\n" +
"  index('idx_mkt_order_disclosure_mkt_order').on(t.marketplaceOrderId),\n" +
"]);\n" +
"\n" +
"export const sellerOrders = pgTable('seller_orders', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  marketplaceOrderId: bigint('marketplace_order_id', { mode: 'number' }).notNull().references(() => marketplaceOrders.id),\n" +
"  partnerId: bigint('partner_id', { mode: 'number' }).notNull().references(() => partners.id),\n" +
"  status: varchar('status', { length: 50 }).notNull().default('submitted'),\n" +
"  e6RoutedToSellerAt: timestamp('e6_routed_to_seller_at', { withTimezone: true }),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"  updatedAt: timestamp('updated_at', { withTimezone: true }),\n" +
"}, (t) => [\n" +
"  unique('uq_seller_orders_mkt_partner').on(t.marketplaceOrderId, t.partnerId),\n" +
"  check('chk_seller_orders_status', sql" + ` + "((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying])::text[]))" + ` + "),\n" +
"  index('idx_seller_orders_partner').on(t.partnerId),\n" +
"  index('idx_seller_orders_mkt_order').on(t.marketplaceOrderId),\n" +
"]);\n" +
"\n" +
"export const sellerOrderSellerSnapshots = pgTable('seller_order_seller_snapshots', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  sellerOrderId: bigint('seller_order_id', { mode: 'number' }).notNull().unique().references(() => sellerOrders.id),\n" +
"  sellerLegalName: varchar('seller_legal_name', { length: 255 }).notNull(),\n" +
"  sellerDisplayName: varchar('seller_display_name', { length: 255 }).notNull(),\n" +
"  jurisdictionCountry: varchar('jurisdiction_country', { length: 2 }).notNull(),\n" +
"  registeredAddress: varchar('registered_address', { length: 1000 }).notNull(),\n" +
"  firmContactEmail: varchar('firm_contact_email', { length: 100 }).notNull(),\n" +
"  taxIdentifierType: varchar('tax_identifier_type', { length: 50 }),\n" +
"  taxIdentifierValue: varchar('tax_identifier_value', { length: 100 }),\n" +
"  registryIdentifierType: varchar('registry_identifier_type', { length: 50 }),\n" +
"  registryIdentifierValue: varchar('registry_identifier_value', { length: 100 }),\n" +
"  contractModel: varchar('contract_model', { length: 100 }).notNull(),\n" +
"  sellerOfRecordResponsibility: varchar('seller_of_record_responsibility', { length: 100 }).notNull(),\n" +
"  goodsInvoiceResponsibility: varchar('goods_invoice_responsibility', { length: 100 }).notNull(),\n" +
"  deliveryResponsibility: varchar('delivery_responsibility', { length: 100 }).notNull(),\n" +
"  complaintResponsibility: varchar('complaint_responsibility', { length: 100 }).notNull(),\n" +
"  returnResponsibility: varchar('return_responsibility', { length: 100 }).notNull(),\n" +
"  refundFinancialLiability: varchar('refund_financial_liability', { length: 100 }).notNull(),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"}, (t) => [\n" +
"  check('chk_snapshot_tax_pair', sql" + ` + "((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))" + ` + "),\n" +
"  check('chk_snapshot_registry_pair', sql" + ` + "((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))" + ` + "),\n" +
"  check('chk_snapshot_contract_model', sql" + ` + "((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[]))" + ` + "),\n" +
"]);\n" +
"\n" +
"export const sellerOrderItems = pgTable('seller_order_items', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  sellerOrderId: bigint('seller_order_id', { mode: 'number' }).notNull().references(() => sellerOrders.id),\n" +
"  offerId: bigint('offer_id', { mode: 'number' }).notNull().references(() => offers.id),\n" +
"  offerTitle: varchar('offer_title', { length: 500 }).notNull(),\n" +
"  manufacturer: varchar('manufacturer', { length: 255 }),\n" +
"  model: varchar('model', { length: 255 }),\n" +
"  technicalDataRef: varchar('technical_data_ref', { length: 255 }),\n" +
"  contentLanguage: varchar('content_language', { length: 10 }),\n" +
"  quantity: integer('quantity').notNull(),\n" +
"  unitPrice: numeric('unit_price').notNull(),\n" +
"  currency: varchar('currency', { length: 3 }).notNull(),\n" +
"  taxContext: varchar('tax_context', { length: 100 }),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"}, (t) => [\n" +
"  check('chk_seller_order_items_qty', sql" + ` + "(quantity > 0)" + ` + "),\n" +
"  check('chk_seller_order_items_currency_shape', sql" + ` + "(currency ~ '^[A-Z]{3}$')" + ` + "),\n" +
"  index('idx_seller_order_items_seller_order').on(t.sellerOrderId),\n" +
"]);\n" +
"\n" +
"export const sellerAcceptanceDecisions = pgTable('seller_acceptance_decisions', {\n" +
"  id: bigserial('id', { mode: 'number' }).primaryKey(),\n" +
"  sellerOrderId: bigint('seller_order_id', { mode: 'number' }).notNull().unique().references(() => sellerOrders.id),\n" +
"  decisionStatus: varchar('decision_status', { length: 50 }).notNull().default('pending_seller_review'),\n" +
"  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),\n" +
"  resolvedAt: timestamp('resolved_at', { withTimezone: true }),\n" +
"  acceptedAt: timestamp('accepted_at', { withTimezone: true }),\n" +
"}, (t) => [\n" +
"  check('chk_seller_acc_dec_status', sql" + ` + "((decision_status)::text = ANY ((ARRAY['pending_seller_review'::character varying, 'seller_accepted'::character varying, 'seller_rejected'::character varying, 'expired'::character varying])::text[]))" + ` + "),\n" +
"  check('chk_seller_acc_dec_consistency', sql" + ` + "(((decision_status)::text = 'pending_seller_review' AND resolved_at IS NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'seller_accepted' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR ((decision_status)::text = 'seller_rejected' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'expired' AND resolved_at IS NOT NULL AND accepted_at IS NULL))" + ` + "),\n" +
"]);\n";
fs.writeFileSync('src/lib/schema.ts', fs.readFileSync('src/lib/schema.ts', 'utf8') + schemaAddition);
