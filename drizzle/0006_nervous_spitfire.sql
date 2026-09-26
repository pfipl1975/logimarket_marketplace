CREATE TABLE "agreement_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"agreement_type" varchar(50) NOT NULL,
	"version" varchar(50) NOT NULL,
	"canonical_template_hash_sha256" varchar(64) NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_agreement_versions_type_version" UNIQUE("agreement_type","version"),
	CONSTRAINT "uq_agreement_versions_hash" UNIQUE("canonical_template_hash_sha256"),
	CONSTRAINT "chk_agreement_versions_type" CHECK (agreement_type = 'partner_agreement_b2b'),
	CONSTRAINT "chk_agreement_versions_status" CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "chk_agreement_versions_hash_format" CHECK (canonical_template_hash_sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_agreement_versions_active_lifecycle" CHECK (((status)::text <> 'active'::text) OR (effective_from IS NOT NULL AND published_at IS NOT NULL)),
	CONSTRAINT "chk_agreement_versions_effective_dates" CHECK (effective_to IS NULL OR effective_from IS NULL OR effective_to > effective_from)
);
--> statement-breakpoint
CREATE TABLE "buyer_organization_memberships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"membership_role" varchar(30) NOT NULL,
	"membership_status" varchar(20) DEFAULT 'active' NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_buyer_organization_membership" UNIQUE("auth_user_id","buyer_organization_id"),
	CONSTRAINT "chk_buyer_organization_membership_role" CHECK (membership_role IN ('organization_admin', 'authorized_buyer')),
	CONSTRAINT "chk_buyer_organization_membership_status" CHECK (membership_status IN ('active', 'inactive', 'revoked')),
	CONSTRAINT "chk_buyer_organization_membership_consistency" CHECK (
    (membership_status = 'active' AND ended_at IS NULL)
    OR (membership_status IN ('inactive', 'revoked') AND ended_at IS NOT NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "buyer_organization_verification_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"outcome_status" varchar(20) NOT NULL,
	"actor_type" varchar(30) NOT NULL,
	"actor_user_id" uuid,
	"source_type" varchar(30) NOT NULL,
	"source_name" varchar(100),
	"source_reference" text,
	"verification_method" varchar(100) NOT NULL,
	"reason_code" varchar(100),
	"previous_verification_status" varchar(20) NOT NULL,
	"legal_name_snapshot" varchar(255) NOT NULL,
	"jurisdiction_country_snapshot" varchar(2) NOT NULL,
	"tax_identifier_id" bigint,
	"tax_identifier_type_snapshot" varchar(50),
	"tax_identifier_value_snapshot" varchar(100),
	"tax_country_code_snapshot" varchar(2),
	"registry_identifier_id" bigint,
	"registry_type_snapshot" varchar(50),
	"registry_value_snapshot" varchar(100),
	"registry_country_code_snapshot" varchar(2),
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_buyer_verification_event_owner" UNIQUE("id","buyer_organization_id"),
	CONSTRAINT "chk_buyer_verification_event_type" CHECK (event_type IN ('verified', 'rejected', 'revoked', 'invalidated')),
	CONSTRAINT "chk_buyer_verification_outcome_status" CHECK (outcome_status IN ('pending', 'verified', 'rejected', 'revoked')),
	CONSTRAINT "chk_buyer_verification_previous_status" CHECK (previous_verification_status IN ('pending', 'verified', 'rejected', 'revoked')),
	CONSTRAINT "chk_buyer_verification_event_outcome" CHECK (
    (event_type = 'verified' AND outcome_status = 'verified')
    OR (event_type = 'rejected' AND outcome_status = 'rejected')
    OR (event_type = 'revoked' AND outcome_status = 'revoked')
    OR (event_type = 'invalidated' AND outcome_status = 'pending')
  ),
	CONSTRAINT "chk_buyer_verification_actor_type" CHECK (actor_type IN ('admin', 'buyer_user', 'system', 'external_adapter')),
	CONSTRAINT "chk_buyer_verification_source_type" CHECK (source_type IN ('admin_manual', 'buyer_change', 'system_rule', 'external_adapter')),
	CONSTRAINT "chk_buyer_verification_actor" CHECK (
    (actor_type IN ('admin', 'buyer_user') AND actor_user_id IS NOT NULL)
    OR (actor_type IN ('system', 'external_adapter') AND actor_user_id IS NULL)
  ),
	CONSTRAINT "chk_buyer_verification_source_actor" CHECK (
    (source_type = 'admin_manual' AND actor_type = 'admin')
    OR (source_type = 'buyer_change' AND actor_type = 'buyer_user')
    OR (source_type = 'system_rule' AND actor_type = 'system')
    OR (source_type = 'external_adapter' AND actor_type = 'external_adapter')
  ),
	CONSTRAINT "chk_buyer_verification_tax_snapshot" CHECK (
    (tax_identifier_id IS NULL AND tax_identifier_type_snapshot IS NULL AND tax_identifier_value_snapshot IS NULL AND tax_country_code_snapshot IS NULL)
    OR (tax_identifier_id IS NOT NULL AND tax_identifier_type_snapshot IS NOT NULL AND tax_identifier_value_snapshot IS NOT NULL AND tax_country_code_snapshot IS NOT NULL)
  ),
	CONSTRAINT "chk_buyer_verification_registry_snapshot" CHECK (
    (registry_identifier_id IS NULL AND registry_type_snapshot IS NULL AND registry_value_snapshot IS NULL AND registry_country_code_snapshot IS NULL)
    OR (registry_identifier_id IS NOT NULL AND registry_type_snapshot IS NOT NULL AND registry_value_snapshot IS NOT NULL AND registry_country_code_snapshot IS NOT NULL)
  ),
	CONSTRAINT "chk_buyer_verification_identifier_present" CHECK (tax_identifier_id IS NOT NULL OR registry_identifier_id IS NOT NULL),
	CONSTRAINT "chk_buyer_verification_evidence" CHECK (
    event_type <> 'verified'
    OR (length(btrim(source_name)) > 0 AND length(btrim(source_reference)) > 0)
  ),
	CONSTRAINT "chk_buyer_verification_reason" CHECK (
    event_type = 'verified'
    OR length(btrim(reason_code)) > 0
  ),
	CONSTRAINT "chk_buyer_verification_country" CHECK (jurisdiction_country_snapshot ~ '^[A-Z]{2}$')
);
--> statement-breakpoint
CREATE TABLE "buyer_organizations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"current_verification_event_id" bigint,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "chk_buyer_organizations_country" CHECK (jurisdiction_country ~ '^[A-Z]{2}$'),
	CONSTRAINT "chk_buyer_organizations_verification_status" CHECK (verification_status IN ('pending', 'verified', 'rejected', 'revoked')),
	CONSTRAINT "chk_buyer_organizations_verification_consistency" CHECK (
    (verification_status = 'verified' AND current_verification_event_id IS NOT NULL AND verified_at IS NOT NULL)
    OR (verification_status = 'pending' AND verified_at IS NULL)
    OR (verification_status IN ('rejected', 'revoked') AND current_verification_event_id IS NOT NULL AND verified_at IS NULL)
  )
);
--> statement-breakpoint
CREATE TABLE "buyer_registry_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"registry_type" varchar(50) NOT NULL,
	"registry_value" varchar(100) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"trusted_by_verification_event_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "uq_buyer_registry_identifier_owner" UNIQUE("id","buyer_organization_id"),
	CONSTRAINT "uq_buyer_registry_identifier_identity" UNIQUE("buyer_organization_id","registry_type","jurisdiction_country","registry_value"),
	CONSTRAINT "chk_buyer_registry_identifier_type" CHECK (registry_type IN ('commercial_register', 'statistical_id')),
	CONSTRAINT "chk_buyer_registry_identifier_country" CHECK (jurisdiction_country ~ '^[A-Z]{2}$'),
	CONSTRAINT "chk_buyer_registry_identifier_value" CHECK (length(btrim(registry_value)) > 0),
	CONSTRAINT "chk_buyer_registry_identifier_trust_retirement" CHECK (trusted_by_verification_event_id IS NULL OR retired_at IS NULL)
);
--> statement-breakpoint
CREATE TABLE "buyer_tax_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"buyer_organization_id" bigint NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"identifier_value" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"canonical_identity_class" varchar(50) NOT NULL,
	"canonical_identifier_value" varchar(100) NOT NULL,
	"trusted_by_verification_event_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"retired_at" timestamp with time zone,
	CONSTRAINT "uq_buyer_tax_identifier_owner" UNIQUE("id","buyer_organization_id"),
	CONSTRAINT "uq_buyer_tax_identifier_identity" UNIQUE("buyer_organization_id","identifier_type","country_code","identifier_value"),
	CONSTRAINT "chk_buyer_tax_identifier_type" CHECK (identifier_type IN ('tax_id', 'vat_id')),
	CONSTRAINT "chk_buyer_tax_identifier_country" CHECK (country_code ~ '^[A-Z]{2}$'),
	CONSTRAINT "chk_buyer_tax_identifier_value" CHECK (length(btrim(identifier_value)) > 0),
	CONSTRAINT "chk_buyer_tax_identifier_trust_retirement" CHECK (trusted_by_verification_event_id IS NULL OR retired_at IS NULL)
);
--> statement-breakpoint
CREATE TABLE "legal_document_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"legal_document_id" integer NOT NULL,
	"version" varchar(50) NOT NULL,
	"language" varchar(10) DEFAULT 'pl' NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"file_name" varchar(255),
	"mime_type" varchar(100),
	"storage_reference" varchar(1024),
	"sha256" varchar(64),
	"file_size_bytes" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "uq_legal_doc_versions_ver" UNIQUE("legal_document_id","language","version"),
	CONSTRAINT "chk_legal_doc_versions_status" CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "chk_legal_doc_versions_hash_format" CHECK (sha256 IS NULL OR sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_legal_doc_versions_active_integrity" CHECK (((status)::text <> 'active'::text) OR (sha256 IS NOT NULL AND storage_reference IS NOT NULL AND file_name IS NOT NULL AND file_size_bytes IS NOT NULL AND effective_from IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"title_pl" varchar(255) NOT NULL,
	"document_type" varchar(50) DEFAULT 'informational' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "legal_documents_slug_unique" UNIQUE("slug"),
	CONSTRAINT "uq_legal_documents_code" UNIQUE("code"),
	CONSTRAINT "chk_legal_documents_type" CHECK (document_type IN ('public_legal', 'partner_legal_pack', 'informational'))
);
--> statement-breakpoint
CREATE TABLE "legal_pack_documents" (
	"legal_pack_version_id" integer NOT NULL,
	"legal_document_version_id" integer NOT NULL,
	"ordinal" integer NOT NULL,
	"acceptance_required" boolean DEFAULT true NOT NULL,
	CONSTRAINT "legal_pack_documents_legal_pack_version_id_legal_document_version_id_pk" PRIMARY KEY("legal_pack_version_id","legal_document_version_id"),
	CONSTRAINT "uq_legal_pack_doc_ordinal" UNIQUE("legal_pack_version_id","ordinal")
);
--> statement-breakpoint
CREATE TABLE "legal_pack_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"version" varchar(50) NOT NULL,
	"language" varchar(10) DEFAULT 'pl' NOT NULL,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"effective_from" timestamp with time zone,
	"effective_until" timestamp with time zone,
	"hash_algorithm" varchar(20) DEFAULT 'sha256' NOT NULL,
	"canonicalization_scheme" varchar(50) DEFAULT 'RFC8785-JCS' NOT NULL,
	"root_sha256" varchar(64),
	"manifest_json" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"activated_at" timestamp with time zone,
	"superseded_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	CONSTRAINT "uq_legal_pack_versions_ver" UNIQUE("code","language","version"),
	CONSTRAINT "chk_legal_pack_versions_status" CHECK (status IN ('draft', 'active', 'superseded', 'archived')),
	CONSTRAINT "chk_legal_pack_versions_hash_format" CHECK (root_sha256 IS NULL OR root_sha256 ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_buyer_contact_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"marketplace_order_id" bigint NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(100),
	"message" varchar(5000),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_order_buyer_contact_snapshots_marketplace_order_id_unique" UNIQUE("marketplace_order_id")
);
--> statement-breakpoint
CREATE TABLE "notification_outbox_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_notification_outbox_event" UNIQUE("seller_order_id","event_type"),
	CONSTRAINT "chk_outbox_event_type" CHECK (event_type IN ('seller_order.routed_to_seller', 'seller_order.accepted_for_buyer', 'seller_order.rejected_for_buyer', 'seller_order.expired_for_seller', 'seller_order.expired_for_buyer'))
);
--> statement-breakpoint
CREATE TABLE "offer_media" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"storage_bucket" varchar(100) NOT NULL,
	"object_path" text NOT NULL,
	"source_type" varchar(30) NOT NULL,
	"source_url" text,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" bigint NOT NULL,
	"checksum_sha256" varchar(64) NOT NULL,
	"width" integer,
	"height" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"alt_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "offer_media_object_path_unique" UNIQUE("object_path"),
	CONSTRAINT "offer_media_source_type_check" CHECK (((source_type)::text = ANY ((ARRAY['upload'::character varying, 'remote_import'::character varying])::text[]))),
	CONSTRAINT "offer_media_size_bytes_check" CHECK (size_bytes > 0),
	CONSTRAINT "offer_media_sort_order_check" CHECK (sort_order >= 0),
	CONSTRAINT "offer_media_checksum_format_check" CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "partner_agreement_evidence_invalidations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"execution_evidence_id" bigint NOT NULL,
	"reason" text NOT NULL,
	"invalidated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"invalidated_by_admin_user_id" varchar(255) NOT NULL,
	CONSTRAINT "uq_partner_agreement_evidence_invalidations_evidence" UNIQUE("execution_evidence_id"),
	CONSTRAINT "chk_partner_agreement_invalidation_reason" CHECK (length(btrim(reason)) > 0),
	CONSTRAINT "chk_partner_agreement_invalidation_by" CHECK (length(btrim((invalidated_by_admin_user_id)::text)) > 0)
);
--> statement-breakpoint
CREATE TABLE "partner_agreement_execution_evidence" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"agreement_version_id" integer NOT NULL,
	"status" varchar(30) DEFAULT 'accepted' NOT NULL,
	"execution_method" varchar(50) DEFAULT 'platform_documentary_electronic' NOT NULL,
	"signed_at" timestamp with time zone NOT NULL,
	"signatory_name" varchar(255) NOT NULL,
	"signatory_role" varchar(255) NOT NULL,
	"signatory_email" varchar(255) NOT NULL,
	"external_platform" varchar(100) NOT NULL,
	"external_transaction_id" varchar(255) NOT NULL,
	"signed_pdf_sha256" varchar(64) NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"recorded_by_admin_user_id" varchar(255) NOT NULL,
	"accepted_legal_pack_version_id" integer,
	"accepted_pack_root_sha256" varchar(64),
	CONSTRAINT "chk_partner_agreement_evidence_status" CHECK (status = 'accepted'),
	CONSTRAINT "chk_partner_agreement_evidence_method" CHECK (execution_method IN ('platform_documentary_electronic', 'qualified_electronic_signature', 'advanced_electronic_signature')),
	CONSTRAINT "chk_partner_agreement_evidence_hash_format" CHECK (signed_pdf_sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_name" CHECK (length(btrim((signatory_name)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_role" CHECK (length(btrim((signatory_role)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_email" CHECK (length(btrim((signatory_email)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_external_platform" CHECK (length(btrim((external_platform)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_external_tx" CHECK (length(btrim((external_transaction_id)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_recorded_by" CHECK (length(btrim((recorded_by_admin_user_id)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_pack_hash" CHECK (accepted_pack_root_sha256 IS NULL OR accepted_pack_root_sha256 ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "partner_user_memberships" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"auth_user_id" uuid NOT NULL,
	"partner_id" bigint NOT NULL,
	"membership_status" varchar(20) NOT NULL,
	"can_accept_orders" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "uq_partner_user_membership" UNIQUE("auth_user_id","partner_id"),
	CONSTRAINT "chk_partner_membership_status" CHECK (((membership_status)::text = ANY ((ARRAY['active'::character varying, 'revoked'::character varying])::text[]))),
	CONSTRAINT "chk_partner_membership_consistency" CHECK ((((membership_status)::text = 'active' AND revoked_at IS NULL) OR ((membership_status)::text = 'revoked' AND revoked_at IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" DROP CONSTRAINT "chk_seller_acc_dec_consistency";--> statement-breakpoint
ALTER TABLE "seller_orders" DROP CONSTRAINT "chk_seller_orders_status";--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD COLUMN "buyer_auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "decided_by_auth_user_id" uuid;--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "decision_source" varchar(50);--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD COLUMN "expires_at" timestamp with time zone NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD COLUMN "canonical_identity_class" varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD COLUMN "canonical_identifier_value" varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE "buyer_organization_memberships" ADD CONSTRAINT "buyer_organization_memberships_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."buyer_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_organization_verification_events" ADD CONSTRAINT "buyer_verification_events_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."buyer_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_registry_identifiers" ADD CONSTRAINT "buyer_registry_identifiers_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."buyer_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "buyer_tax_identifiers" ADD CONSTRAINT "buyer_tax_identifiers_organization_fk" FOREIGN KEY ("buyer_organization_id") REFERENCES "public"."buyer_organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_legal_document_id_legal_documents_id_fk" FOREIGN KEY ("legal_document_id") REFERENCES "public"."legal_documents"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_pack_documents" ADD CONSTRAINT "legal_pack_documents_legal_pack_version_id_legal_pack_versions_id_fk" FOREIGN KEY ("legal_pack_version_id") REFERENCES "public"."legal_pack_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_pack_documents" ADD CONSTRAINT "legal_pack_documents_legal_document_version_id_legal_document_versions_id_fk" FOREIGN KEY ("legal_document_version_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_buyer_contact_snapshots" ADD CONSTRAINT "marketplace_order_buyer_contact_snapshots_marketplace_order_id_marketplace_orders_id_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_outbox_events" ADD CONSTRAINT "notification_outbox_events_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_evidence_invalidations" ADD CONSTRAINT "partner_agreement_evidence_invalidations_execution_evidence_id_partner_agreement_execution_evidence_id_fk" FOREIGN KEY ("execution_evidence_id") REFERENCES "public"."partner_agreement_execution_evidence"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_agreement_version_id_agreement_versions_id_fk" FOREIGN KEY ("agreement_version_id") REFERENCES "public"."agreement_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_accepted_legal_pack_version_id_legal_pack_versions_id_fk" FOREIGN KEY ("accepted_legal_pack_version_id") REFERENCES "public"."legal_pack_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_user_memberships" ADD CONSTRAINT "partner_user_memberships_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_buyer_memberships_auth_status" ON "buyer_organization_memberships" USING btree ("auth_user_id","membership_status");--> statement-breakpoint
CREATE INDEX "idx_buyer_memberships_org_status" ON "buyer_organization_memberships" USING btree ("buyer_organization_id","membership_status");--> statement-breakpoint
CREATE INDEX "idx_buyer_verification_events_org_time" ON "buyer_organization_verification_events" USING btree ("buyer_organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_buyer_verification_events_type_time" ON "buyer_organization_verification_events" USING btree ("event_type","occurred_at");--> statement-breakpoint
CREATE INDEX "idx_buyer_verification_events_tax" ON "buyer_organization_verification_events" USING btree ("tax_identifier_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_verification_events_registry" ON "buyer_organization_verification_events" USING btree ("registry_identifier_id");--> statement-breakpoint
CREATE INDEX "idx_buyer_organizations_verification_status" ON "buyer_organizations" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "idx_buyer_registry_identifiers_active_org" ON "buyer_registry_identifiers" USING btree ("buyer_organization_id") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_buyer_registry_identifiers_active_value" ON "buyer_registry_identifiers" USING btree ("registry_type","jurisdiction_country","registry_value") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_buyer_tax_identifiers_active_org" ON "buyer_tax_identifiers" USING btree ("buyer_organization_id") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_buyer_tax_identifiers_active_canonical" ON "buyer_tax_identifiers" USING btree ("canonical_identity_class","canonical_identifier_value") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_legal_doc_versions_active" ON "legal_document_versions" USING btree ("legal_document_id","language") WHERE status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_legal_pack_versions_active" ON "legal_pack_versions" USING btree ("code","language") WHERE status = 'active';--> statement-breakpoint
CREATE INDEX "idx_offer_media_offer_id" ON "offer_media" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offer_media_primary" ON "offer_media" USING btree ("offer_id") WHERE is_primary = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offer_media_checksum" ON "offer_media" USING btree ("offer_id","checksum_sha256");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_invalidations_evidence_id" ON "partner_agreement_evidence_invalidations" USING btree ("execution_evidence_id");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_evidence_partner_id" ON "partner_agreement_execution_evidence" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_evidence_version_id" ON "partner_agreement_execution_evidence" USING btree ("agreement_version_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_orders_buyer_auth" ON "marketplace_orders" USING btree ("buyer_auth_user_id");--> statement-breakpoint
CREATE INDEX "idx_seller_acceptance_decisions_pending_expires_at" ON "seller_acceptance_decisions" USING btree ("expires_at") WHERE decision_status = 'pending_seller_review';--> statement-breakpoint
CREATE INDEX "idx_seller_tax_canonical_active" ON "seller_tax_identifiers" USING btree ("canonical_identity_class","canonical_identifier_value") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_verification_events_legal_subject" ON "seller_verification_events" USING btree ("legal_identity_partner_id");--> statement-breakpoint
CREATE INDEX "idx_verification_events_tax_subject" ON "seller_verification_events" USING btree ("tax_identifier_id");--> statement-breakpoint
CREATE INDEX "idx_verification_events_registry_subject" ON "seller_verification_events" USING btree ("registry_identifier_id");--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_publication_status_check" CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'pending_review'::character varying, 'published'::character varying, 'hidden'::character varying, 'archived'::character varying, 'deleted'::character varying])::text[])));--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_source" CHECK ((decision_source IS NULL OR (decision_source)::text = 'partner_portal'));--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "chk_seller_acc_dec_consistency" CHECK ((((decision_status)::text = 'pending_seller_review' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'seller_accepted' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NOT NULL AND (decision_source)::text = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR ((decision_status)::text = 'seller_rejected' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NOT NULL AND (decision_source)::text = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'expired' AND expires_at IS NOT NULL AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NOT NULL AND accepted_at IS NULL)));--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "chk_seller_orders_status" CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying, 'expired'::character varying])::text[])));
CREATE OR REPLACE FUNCTION prevent_frozen_legal_document_mutation()
RETURNS TRIGGER AS $body$
BEGIN
  -- Strict lifecycle enforcement
  IF OLD.status != NEW.status THEN
    IF OLD.status = 'draft' AND NEW.status != 'active' THEN
      RAISE EXCEPTION 'Draft legal document version can only become active' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'active' AND NEW.status != 'superseded' THEN
      RAISE EXCEPTION 'Active legal document version can only become superseded' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'superseded' AND NEW.status != 'archived' THEN
      RAISE EXCEPTION 'Superseded legal document version can only become archived' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'archived' THEN
      RAISE EXCEPTION 'Archived legal document version status cannot be changed' USING ERRCODE = '55000';
    END IF;
  END IF;

  -- Freeze identity and integrity fields once active/superseded/archived
  IF OLD.status IN ('active', 'superseded', 'archived') THEN
    IF OLD.legal_document_id != NEW.legal_document_id OR
       OLD.version != NEW.version OR
       OLD.language != NEW.language OR
       OLD.file_name IS DISTINCT FROM NEW.file_name OR
       OLD.mime_type IS DISTINCT FROM NEW.mime_type OR
       OLD.storage_reference IS DISTINCT FROM NEW.storage_reference OR
       OLD.sha256 IS DISTINCT FROM NEW.sha256 OR
       OLD.file_size_bytes IS DISTINCT FROM NEW.file_size_bytes OR
       OLD.effective_from IS DISTINCT FROM NEW.effective_from THEN
      RAISE EXCEPTION 'Cannot modify frozen fields of an active/superseded/archived legal document version' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$body$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_legal_document_versions_frozen
BEFORE UPDATE ON legal_document_versions
FOR EACH ROW EXECUTE FUNCTION prevent_frozen_legal_document_mutation();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_frozen_legal_pack_mutation()
RETURNS TRIGGER AS $body$
BEGIN
  -- Strict lifecycle enforcement
  IF OLD.status != NEW.status THEN
    IF OLD.status = 'draft' AND NEW.status != 'active' THEN
      RAISE EXCEPTION 'Draft legal pack version can only become active' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'active' AND NEW.status != 'superseded' THEN
      RAISE EXCEPTION 'Active legal pack version can only become superseded' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'superseded' AND NEW.status != 'archived' THEN
      RAISE EXCEPTION 'Superseded legal pack version can only become archived' USING ERRCODE = '55000';
    END IF;
    IF OLD.status = 'archived' THEN
      RAISE EXCEPTION 'Archived legal pack version status cannot be changed' USING ERRCODE = '55000';
    END IF;
  END IF;

  -- Freeze identity and integrity fields once active/superseded/archived
  IF OLD.status IN ('active', 'superseded', 'archived') THEN
    IF OLD.code != NEW.code OR
       OLD.version != NEW.version OR
       OLD.language != NEW.language OR
       OLD.root_sha256 IS DISTINCT FROM NEW.root_sha256 OR
       OLD.hash_algorithm IS DISTINCT FROM NEW.hash_algorithm OR
       OLD.canonicalization_scheme IS DISTINCT FROM NEW.canonicalization_scheme OR
       OLD.manifest_json IS DISTINCT FROM NEW.manifest_json THEN
      RAISE EXCEPTION 'Cannot modify frozen fields of an active/superseded/archived legal pack version' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END;
$body$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_legal_pack_versions_frozen
BEFORE UPDATE ON legal_pack_versions
FOR EACH ROW EXECUTE FUNCTION prevent_frozen_legal_pack_mutation();
--> statement-breakpoint

CREATE OR REPLACE FUNCTION prevent_frozen_pack_membership_mutation()
RETURNS TRIGGER AS $body$
DECLARE
  old_pack_status varchar;
  new_pack_status varchar;
BEGIN
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    -- SELECT ... FOR UPDATE to lock the parent pack row and prevent concurrent activation races
    SELECT status INTO old_pack_status FROM legal_pack_versions WHERE id = OLD.legal_pack_version_id FOR UPDATE;
    IF old_pack_status IN ('active', 'superseded', 'archived') THEN
      RAISE EXCEPTION 'Cannot modify or delete membership of a frozen legal pack' USING ERRCODE = '55000';
    END IF;
  END IF;
  
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Lock the parent pack row for the new membership as well
    SELECT status INTO new_pack_status FROM legal_pack_versions WHERE id = NEW.legal_pack_version_id FOR UPDATE;
    IF new_pack_status IN ('active', 'superseded', 'archived') THEN
      RAISE EXCEPTION 'Cannot insert or move membership into a frozen legal pack' USING ERRCODE = '55000';
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$body$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER trg_legal_pack_documents_frozen
BEFORE INSERT OR UPDATE OR DELETE ON legal_pack_documents
FOR EACH ROW EXECUTE FUNCTION prevent_frozen_pack_membership_mutation();