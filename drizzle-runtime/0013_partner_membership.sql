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
CREATE TABLE "attribute_definition_translations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attribute_definition_id" bigint NOT NULL,
	"locale" varchar(10) NOT NULL,
	"name" text NOT NULL,
	"short_label" varchar(100),
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_adt_attribute_locale" UNIQUE("attribute_definition_id","locale"),
	CONSTRAINT "chk_adt_locale" CHECK ("attribute_definition_translations"."locale" IN ('pl','en','de','fr','uk','es','zh'))
);
--> statement-breakpoint
CREATE TABLE "attribute_definitions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"stable_key" text NOT NULL,
	"data_type" varchar(30) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_ad_stable_key" UNIQUE("stable_key"),
	CONSTRAINT "chk_ad_data_type" CHECK ("attribute_definitions"."data_type" IN ('text','number','boolean','date','year','enum','multi_enum'))
);
--> statement-breakpoint
CREATE TABLE "buyer_legal_context_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"tax_identifier_type" varchar(50),
	"tax_identifier_value" varchar(100),
	"registry_identifier_type" varchar(50),
	"registry_identifier_value" varchar(100),
	"business_verification_status" varchar(50) DEFAULT 'unknown' NOT NULL,
	"business_verification_method" varchar(100),
	"business_verification_source" varchar(100),
	"business_verified_at" timestamp with time zone,
	"professional_purpose_evidence" varchar(1000),
	"category_b_status" varchar(50) DEFAULT 'unknown' NOT NULL,
	"legal_context_review_state" varchar(50) DEFAULT 'no_review_needed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_buyer_identifiers_present" CHECK (((tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))),
	CONSTRAINT "chk_buyer_tax_pair" CHECK (((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))),
	CONSTRAINT "chk_buyer_registry_pair" CHECK (((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))),
	CONSTRAINT "chk_buyer_business_verification_status" CHECK (((business_verification_status)::text = ANY ((ARRAY['unknown'::character varying, 'unverified'::character varying, 'verified'::character varying, 'failed'::character varying])::text[]))),
	CONSTRAINT "chk_buyer_verification_consistency" CHECK ((((business_verification_status)::text = 'verified' AND business_verification_method IS NOT NULL AND business_verification_source IS NOT NULL AND business_verified_at IS NOT NULL) OR ((business_verification_status)::text != 'verified'))),
	CONSTRAINT "chk_buyer_category_b_status" CHECK (((category_b_status)::text = ANY ((ARRAY['unknown'::character varying, 'not_applicable'::character varying, 'applicable'::character varying, 'under_review'::character varying])::text[]))),
	CONSTRAINT "chk_buyer_legal_review_state" CHECK (((legal_context_review_state)::text = ANY ((ARRAY['no_review_needed'::character varying, 'pending_review'::character varying, 'approved_by_review'::character varying, 'rejected_by_review'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"offer_id" bigint NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" bigint,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "category_attribute_assignments" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"category_id" bigint NOT NULL,
	"attribute_definition_id" bigint NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_filterable" boolean DEFAULT false NOT NULL,
	"is_comparable" boolean DEFAULT false NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"is_visible" boolean DEFAULT true NOT NULL,
	"unit_code" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_caa_category_attribute" UNIQUE("category_id","attribute_definition_id"),
	CONSTRAINT "chk_caa_sort_order" CHECK ("category_attribute_assignments"."sort_order" >= 0)
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" integer,
	"partner_id" integer,
	"clicked_at" timestamp DEFAULT now(),
	"session_hash" varchar(64) NOT NULL,
	"ip_hash" varchar(64) NOT NULL,
	"is_unique_24h" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "controlled_option_value_translations" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"controlled_option_value_id" bigint NOT NULL,
	"locale" varchar(10) NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_covt_option_locale" UNIQUE("controlled_option_value_id","locale"),
	CONSTRAINT "chk_covt_locale" CHECK ("controlled_option_value_translations"."locale" IN ('pl','en','de','fr','uk','es','zh'))
);
--> statement-breakpoint
CREATE TABLE "controlled_option_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"attribute_id" bigint NOT NULL,
	"stable_key" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_cov_attr_option" UNIQUE("attribute_id","stable_key"),
	CONSTRAINT "uq_cov_attribute_id_pair" UNIQUE("attribute_id","id")
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
CREATE TABLE "marketplace_order_seller_disclosures" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"marketplace_order_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"seller_legal_name" varchar(255) NOT NULL,
	"registered_address" varchar(1000) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"firm_contact_email" varchar(100) NOT NULL,
	"seller_role" varchar(100) NOT NULL,
	"goods_invoice_issuer" varchar(100) NOT NULL,
	"delivery_responsible_party" varchar(100) NOT NULL,
	"complaint_responsible_party" varchar(100) NOT NULL,
	"return_responsible_party" varchar(100) NOT NULL,
	"logimarket_platform_role" varchar(100) NOT NULL,
	"tax_identifier_type" varchar(50),
	"tax_identifier_value" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mkt_order_disclosure_order_partner" UNIQUE("marketplace_order_id","partner_id"),
	CONSTRAINT "chk_disclosure_tax_pair" CHECK (((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL)))
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"buyer_legal_context_snapshot_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'intent_created' NOT NULL,
	"e2_buyer_intent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"e3_receipt_acknowledged_at" timestamp with time zone,
	"customer_po_number" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "marketplace_orders_buyer_legal_context_snapshot_id_unique" UNIQUE("buyer_legal_context_snapshot_id"),
	CONSTRAINT "chk_marketplace_orders_status" CHECK (((status)::text = ANY ((ARRAY['intent_created'::character varying, 'checkout_submitted'::character varying, 'pending_seller_review'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "migration_batches" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"status" varchar(30) DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"source_description" text NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_mb_status" CHECK ("migration_batches"."status" IN ('running','completed','rollback_in_progress','rolled_back','rollback_conflict','failed'))
);
--> statement-breakpoint
CREATE TABLE "migration_oaov_targets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"source_entry_id" bigint NOT NULL,
	"target_row_id_current" bigint,
	"target_row_id_original" bigint NOT NULL,
	"target_offer_id" bigint NOT NULL,
	"target_attribute_id" bigint NOT NULL,
	"target_option_id" bigint NOT NULL,
	"target_hash_at_creation" text NOT NULL,
	"canonical_payload_version" varchar(20) NOT NULL,
	"target_provenance" varchar(30) NOT NULL,
	"rollback_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"rollback_reason" text,
	"target_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mott_target_original" UNIQUE("target_row_id_original"),
	CONSTRAINT "uq_mott_target_current" UNIQUE("target_row_id_current"),
	CONSTRAINT "chk_mott_provenance" CHECK ("migration_oaov_targets"."target_provenance" IN ('created_by_batch', 'unknown_legacy')),
	CONSTRAINT "chk_mott_canonical_version" CHECK ("migration_oaov_targets"."canonical_payload_version" IN ('lm-source-v1', 'lm-source-v2')),
	CONSTRAINT "chk_mott_rollback_status" CHECK ("migration_oaov_targets"."rollback_status" IN ('pending','cleaned_up','rollback_conflict')),
	CONSTRAINT "chk_mott_hash_format" CHECK ("migration_oaov_targets"."target_hash_at_creation" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_mott_row_ids" CHECK ("migration_oaov_targets"."target_row_id_current" IS NULL OR "migration_oaov_targets"."target_row_id_current" = "migration_oaov_targets"."target_row_id_original"),
	CONSTRAINT "chk_mott_lifecycle" CHECK (
      (
        "migration_oaov_targets"."rollback_status" = 'pending'
        AND "migration_oaov_targets"."target_row_id_current" IS NOT NULL
        AND "migration_oaov_targets"."target_deleted_at" IS NULL
        AND "migration_oaov_targets"."rollback_reason" IS NULL
      )
      OR
      (
        "migration_oaov_targets"."rollback_status" = 'cleaned_up'
        AND "migration_oaov_targets"."target_row_id_current" IS NULL
        AND "migration_oaov_targets"."target_deleted_at" IS NOT NULL
        AND "migration_oaov_targets"."rollback_reason" = 'deleted_by_batch_rollback'
      )
      OR
      (
        "migration_oaov_targets"."rollback_status" = 'rollback_conflict'
        AND "migration_oaov_targets"."rollback_reason" IS NOT NULL
        AND "migration_oaov_targets"."target_deleted_at" IS NULL
      )
    )
);
--> statement-breakpoint
CREATE TABLE "migration_oav_targets" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"source_entry_id" bigint NOT NULL,
	"target_row_id_current" bigint,
	"target_row_id_original" bigint NOT NULL,
	"target_offer_id" bigint NOT NULL,
	"target_attribute_id" bigint NOT NULL,
	"target_option_id" bigint,
	"target_hash_at_creation" text NOT NULL,
	"canonical_payload_version" varchar(20) NOT NULL,
	"target_provenance" varchar(30) NOT NULL,
	"rollback_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"rollback_reason" text,
	"target_deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mot_target_original" UNIQUE("target_row_id_original"),
	CONSTRAINT "uq_mot_target_current" UNIQUE("target_row_id_current"),
	CONSTRAINT "chk_mot_provenance" CHECK ("migration_oav_targets"."target_provenance" IN ('created_by_batch', 'unknown_legacy')),
	CONSTRAINT "chk_mot_canonical_version" CHECK ("migration_oav_targets"."canonical_payload_version" IN ('lm-source-v1', 'lm-source-v2')),
	CONSTRAINT "chk_mot_rollback_status" CHECK ("migration_oav_targets"."rollback_status" IN ('pending','cleaned_up','rollback_conflict')),
	CONSTRAINT "chk_mot_hash_format" CHECK ("migration_oav_targets"."target_hash_at_creation" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_mot_row_ids" CHECK ("migration_oav_targets"."target_row_id_current" IS NULL OR "migration_oav_targets"."target_row_id_current" = "migration_oav_targets"."target_row_id_original"),
	CONSTRAINT "chk_mot_lifecycle" CHECK (
      (
        "migration_oav_targets"."rollback_status" = 'pending'
        AND "migration_oav_targets"."target_row_id_current" IS NOT NULL
        AND "migration_oav_targets"."target_deleted_at" IS NULL
        AND "migration_oav_targets"."rollback_reason" IS NULL
      )
      OR
      (
        "migration_oav_targets"."rollback_status" = 'cleaned_up'
        AND "migration_oav_targets"."target_row_id_current" IS NULL
        AND "migration_oav_targets"."target_deleted_at" IS NOT NULL
        AND "migration_oav_targets"."rollback_reason" = 'deleted_by_batch_rollback'
      )
      OR
      (
        "migration_oav_targets"."rollback_status" = 'rollback_conflict'
        AND "migration_oav_targets"."rollback_reason" IS NOT NULL
        AND "migration_oav_targets"."target_deleted_at" IS NULL
      )
    )
);
--> statement-breakpoint
CREATE TABLE "migration_rollback_attempts" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"attempt_number" integer NOT NULL,
	"status" varchar(30) NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"sqlstate" varchar(5),
	"constraint_name" text,
	"message" text,
	"detail" text,
	"hint" text,
	"targets_deleted_count" integer DEFAULT 0 NOT NULL,
	"targets_skipped_count" integer DEFAULT 0 NOT NULL,
	"targets_conflict_count" integer DEFAULT 0 NOT NULL,
	"initiated_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mra_batch_attempt" UNIQUE("batch_id","attempt_number"),
	CONSTRAINT "chk_mra_attempt_number" CHECK ("migration_rollback_attempts"."attempt_number" > 0),
	CONSTRAINT "chk_mra_deleted_nonnegative" CHECK ("migration_rollback_attempts"."targets_deleted_count" >= 0),
	CONSTRAINT "chk_mra_skipped_nonnegative" CHECK ("migration_rollback_attempts"."targets_skipped_count" >= 0),
	CONSTRAINT "chk_mra_conflict_nonnegative" CHECK ("migration_rollback_attempts"."targets_conflict_count" >= 0),
	CONSTRAINT "chk_mra_status_check" CHECK ("migration_rollback_attempts"."status" IN ('running', 'succeeded', 'failed', 'conflict')),
	CONSTRAINT "chk_mra_lifecycle" CHECK (
      (
        "migration_rollback_attempts"."status" = 'running'
        AND "migration_rollback_attempts"."finished_at" IS NULL
        AND "migration_rollback_attempts"."sqlstate" IS NULL
        AND "migration_rollback_attempts"."constraint_name" IS NULL
        AND "migration_rollback_attempts"."message" IS NULL
        AND "migration_rollback_attempts"."detail" IS NULL
        AND "migration_rollback_attempts"."hint" IS NULL
        AND "migration_rollback_attempts"."targets_deleted_count" = 0
        AND "migration_rollback_attempts"."targets_skipped_count" = 0
        AND "migration_rollback_attempts"."targets_conflict_count" = 0
      )
      OR
      (
        "migration_rollback_attempts"."status" = 'succeeded'
        AND "migration_rollback_attempts"."finished_at" IS NOT NULL
        AND "migration_rollback_attempts"."sqlstate" IS NULL
        AND "migration_rollback_attempts"."constraint_name" IS NULL
        AND "migration_rollback_attempts"."message" IS NULL
        AND "migration_rollback_attempts"."detail" IS NULL
        AND "migration_rollback_attempts"."hint" IS NULL
        AND "migration_rollback_attempts"."targets_deleted_count" > 0
        AND "migration_rollback_attempts"."targets_conflict_count" = 0
      )
      OR
      (
        "migration_rollback_attempts"."status" = 'failed'
        AND "migration_rollback_attempts"."finished_at" IS NOT NULL
        AND "migration_rollback_attempts"."sqlstate" IS NOT NULL
        AND char_length("migration_rollback_attempts"."sqlstate") = 5
        AND "migration_rollback_attempts"."message" IS NOT NULL
      )
      OR
      (
        "migration_rollback_attempts"."status" = 'conflict'
        AND "migration_rollback_attempts"."finished_at" IS NOT NULL
        AND "migration_rollback_attempts"."targets_conflict_count" > 0
        AND "migration_rollback_attempts"."sqlstate" IS NULL
        AND "migration_rollback_attempts"."constraint_name" IS NULL
        AND "migration_rollback_attempts"."message" IS NULL
        AND "migration_rollback_attempts"."detail" IS NULL
        AND "migration_rollback_attempts"."hint" IS NULL
      )
    ),
	CONSTRAINT "chk_mra_sqlstate" CHECK ("migration_rollback_attempts"."sqlstate" IS NULL OR char_length("migration_rollback_attempts"."sqlstate") = 5)
);
--> statement-breakpoint
CREATE TABLE "migration_source_entries" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"batch_id" bigint NOT NULL,
	"source_offer_id" bigint NOT NULL,
	"source_key" text NOT NULL,
	"raw_value" jsonb NOT NULL,
	"source_hash" text NOT NULL,
	"source_payload_version" varchar(20) NOT NULL,
	"processing_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"classification_status" varchar(30),
	"classification_reason" text,
	"expected_target_count" integer NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"approved_reason" text,
	"scope_owner" text,
	"decision_timestamp" timestamp with time zone,
	"fallback_status" text,
	"processing_error_code" varchar(64),
	"processing_error_message" text,
	"processing_failed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_mse_source_identity" UNIQUE("batch_id","source_offer_id","source_key"),
	CONSTRAINT "uq_mse_id_batch" UNIQUE("id","batch_id"),
	CONSTRAINT "chk_mse_proc_status" CHECK ("migration_source_entries"."processing_status" IN ('pending','processing','processed','failed')),
	CONSTRAINT "chk_mse_class_status" CHECK ("migration_source_entries"."classification_status" IN ('migrated','intentionally_skipped','manual_review_required','out_of_scope')),
	CONSTRAINT "chk_mse_technical_error_state_matrix" CHECK (
      (
        "migration_source_entries"."processing_status" IN ('pending', 'processing')
        AND "migration_source_entries"."classification_status" IS NULL
        AND "migration_source_entries"."processing_error_code" IS NULL
        AND "migration_source_entries"."processing_error_message" IS NULL
        AND "migration_source_entries"."processing_failed_at" IS NULL
      )
      OR
      (
        "migration_source_entries"."processing_status" = 'processed'
        AND "migration_source_entries"."classification_status" IS NOT NULL
        AND "migration_source_entries"."processing_error_code" IS NULL
        AND "migration_source_entries"."processing_error_message" IS NULL
        AND "migration_source_entries"."processing_failed_at" IS NULL
      )
      OR
      (
        "migration_source_entries"."processing_status" = 'failed'
        AND "migration_source_entries"."classification_status" IS NULL
        AND "migration_source_entries"."processing_error_code" IS NOT NULL
        AND "migration_source_entries"."processing_error_message" IS NOT NULL
        AND "migration_source_entries"."processing_failed_at" IS NOT NULL
      )
    ),
	CONSTRAINT "chk_mse_expected_nonnegative" CHECK ("migration_source_entries"."expected_target_count" >= 0),
	CONSTRAINT "chk_mse_expected_by_classification" CHECK (
      (
        "migration_source_entries"."classification_status" = 'migrated'
        AND "migration_source_entries"."expected_target_count" >= 1
      )
      OR
      (
        "migration_source_entries"."classification_status" IN ('intentionally_skipped', 'manual_review_required', 'out_of_scope')
        AND "migration_source_entries"."expected_target_count" = 0
      )
      OR
      "migration_source_entries"."classification_status" IS NULL
    ),
	CONSTRAINT "chk_mse_out_of_scope_governance" CHECK (
      "migration_source_entries"."classification_status" <> 'out_of_scope'
      OR (
        "migration_source_entries"."approved_reason" IS NOT NULL
        AND "migration_source_entries"."scope_owner" IS NOT NULL
        AND "migration_source_entries"."decision_timestamp" IS NOT NULL
        AND "migration_source_entries"."fallback_status" IS NOT NULL
        AND "migration_source_entries"."frequency" > 0
      )
    ),
	CONSTRAINT "chk_mse_source_payload_version" CHECK ("migration_source_entries"."source_payload_version" IN ('lm-source-v1', 'lm-source-v2'))
);
--> statement-breakpoint
CREATE TABLE "offer_attribute_option_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"attribute_id" bigint NOT NULL,
	"option_id" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_oaov_offer_attribute_option" UNIQUE("offer_id","attribute_id","option_id")
);
--> statement-breakpoint
CREATE TABLE "offer_attribute_values" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"attribute_id" bigint NOT NULL,
	"value_text" text,
	"value_number" numeric,
	"value_boolean" boolean,
	"value_date" timestamp with time zone,
	"value_year" integer,
	"option_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_oav_offer_attribute" UNIQUE("offer_id","attribute_id"),
	CONSTRAINT "chk_oav_value_exclusivity" CHECK (
      num_nonnulls(
        value_text,
        value_number,
        value_boolean,
        value_date,
        value_year,
        option_id
      ) = 1
    )
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
CREATE TABLE "offers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"category_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"price_brutto" numeric,
	"outbound_url" varchar(512),
	"technical_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"offer_model" varchar(20) DEFAULT 'rfq' NOT NULL,
	"description" text,
	"image_url" varchar(512),
	"price_on_request" boolean DEFAULT true NOT NULL,
	"conversion_type" varchar(20) DEFAULT 'outbound' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"publication_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"contract_model" varchar(30),
	CONSTRAINT "offers_contract_model_check" CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"offer_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" varchar(50),
	"total_price" varchar(50)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"company_name" varchar(255),
	"contact_name" varchar(255),
	"email" varchar(255),
	"phone" varchar(100),
	"message" text,
	"total_amount" varchar(50),
	"created_at" timestamp with time zone DEFAULT now()
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
	CONSTRAINT "chk_partner_agreement_evidence_status" CHECK (status = 'accepted'),
	CONSTRAINT "chk_partner_agreement_evidence_method" CHECK (execution_method IN ('platform_documentary_electronic', 'qualified_electronic_signature', 'advanced_electronic_signature')),
	CONSTRAINT "chk_partner_agreement_evidence_hash_format" CHECK (signed_pdf_sha256 ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_name" CHECK (length(btrim((signatory_name)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_role" CHECK (length(btrim((signatory_role)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_signatory_email" CHECK (length(btrim((signatory_email)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_external_platform" CHECK (length(btrim((external_platform)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_external_tx" CHECK (length(btrim((external_transaction_id)::text)) > 0),
	CONSTRAINT "chk_partner_agreement_evidence_recorded_by" CHECK (length(btrim((recorded_by_admin_user_id)::text)) > 0)
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
CREATE TABLE "partners" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"logo_url" varchar(512),
	"contact_email" varchar(100) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"website_url" varchar
);
--> statement-breakpoint
CREATE TABLE "rfq_leads" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"company_name" varchar(255),
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(100),
	"message" text,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "rfq_leads_status_check" CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "seller_acceptance_decisions" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"decision_status" varchar(50) DEFAULT 'pending_seller_review' NOT NULL,
	"decided_by_auth_user_id" uuid,
	"decision_source" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	CONSTRAINT "seller_acceptance_decisions_seller_order_id_unique" UNIQUE("seller_order_id"),
	CONSTRAINT "chk_seller_acc_dec_status" CHECK (((decision_status)::text = ANY ((ARRAY['pending_seller_review'::character varying, 'seller_accepted'::character varying, 'seller_rejected'::character varying, 'expired'::character varying])::text[]))),
	CONSTRAINT "chk_seller_acc_dec_consistency" CHECK ((((decision_status)::text = 'pending_seller_review' AND decided_by_auth_user_id IS NULL AND decision_source IS NULL AND resolved_at IS NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'seller_accepted' AND decided_by_auth_user_id IS NOT NULL AND (decision_source)::text = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NOT NULL) OR ((decision_status)::text = 'seller_rejected' AND decided_by_auth_user_id IS NOT NULL AND (decision_source)::text = 'partner_portal' AND resolved_at IS NOT NULL AND accepted_at IS NULL) OR ((decision_status)::text = 'expired' AND resolved_at IS NOT NULL AND accepted_at IS NULL)))
);
--> statement-breakpoint
CREATE TABLE "seller_eligibility" (
	"partner_id" bigint PRIMARY KEY NOT NULL,
	"eligibility_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "seller_eligibility_status_check" CHECK (((eligibility_status)::text = ANY ((ARRAY['pending'::character varying, 'eligible'::character varying, 'ineligible'::character varying, 'suspended'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "seller_legal_identities" (
	"partner_id" bigint PRIMARY KEY NOT NULL,
	"legal_name" varchar(255) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_source" varchar(100),
	"verification_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"registered_address_line1" varchar(255),
	"registered_address_line2" varchar(255),
	"registered_postal_code" varchar(32),
	"registered_city" varchar(120),
	"registered_region" varchar(120),
	"registered_country_code" varchar(2),
	"current_verification_event_id" bigint
);
--> statement-breakpoint
CREATE TABLE "seller_order_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"offer_id" bigint NOT NULL,
	"offer_title" varchar(500) NOT NULL,
	"manufacturer" varchar(255),
	"model" varchar(255),
	"technical_data_ref" varchar(255),
	"content_language" varchar(10),
	"quantity" integer NOT NULL,
	"unit_price" numeric NOT NULL,
	"currency" varchar(3) NOT NULL,
	"tax_context" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_seller_order_items_qty" CHECK ((quantity > 0)),
	CONSTRAINT "chk_seller_order_items_currency_shape" CHECK ((currency ~ '^[A-Z]{3}$'))
);
--> statement-breakpoint
CREATE TABLE "seller_order_seller_snapshots" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"seller_order_id" bigint NOT NULL,
	"seller_legal_name" varchar(255) NOT NULL,
	"seller_display_name" varchar(255) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"registered_address" varchar(1000) NOT NULL,
	"firm_contact_email" varchar(100) NOT NULL,
	"tax_identifier_type" varchar(50),
	"tax_identifier_value" varchar(100),
	"registry_identifier_type" varchar(50),
	"registry_identifier_value" varchar(100),
	"contract_model" varchar(100) NOT NULL,
	"seller_of_record_responsibility" varchar(100) NOT NULL,
	"goods_invoice_responsibility" varchar(100) NOT NULL,
	"delivery_responsibility" varchar(100) NOT NULL,
	"complaint_responsibility" varchar(100) NOT NULL,
	"return_responsibility" varchar(100) NOT NULL,
	"refund_financial_liability" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "seller_order_seller_snapshots_seller_order_id_unique" UNIQUE("seller_order_id"),
	CONSTRAINT "chk_snapshot_tax_pair" CHECK (((tax_identifier_type IS NULL AND tax_identifier_value IS NULL) OR (tax_identifier_type IS NOT NULL AND tax_identifier_value IS NOT NULL))),
	CONSTRAINT "chk_snapshot_registry_pair" CHECK (((registry_identifier_type IS NULL AND registry_identifier_value IS NULL) OR (registry_identifier_type IS NOT NULL AND registry_identifier_value IS NOT NULL))),
	CONSTRAINT "chk_snapshot_contract_model" CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "seller_orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"marketplace_order_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'submitted' NOT NULL,
	"e6_routed_to_seller_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_seller_orders_mkt_partner" UNIQUE("marketplace_order_id","partner_id"),
	CONSTRAINT "chk_seller_orders_status" CHECK (((status)::text = ANY ((ARRAY['submitted'::character varying, 'seller_accepted'::character varying, 'fulfillment_in_progress'::character varying, 'fulfilled'::character varying, 'seller_rejected'::character varying, 'cancelled'::character varying])::text[])))
);
--> statement-breakpoint
CREATE TABLE "seller_registry_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"registry_type" varchar(50) NOT NULL,
	"registry_value" varchar(100) NOT NULL,
	"jurisdiction_country" varchar(2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"verification_status" varchar(30) DEFAULT 'unverified',
	"verified_at" timestamp with time zone,
	"verification_source" varchar(100),
	"verification_reference" text,
	"current_verification_event_id" bigint,
	"retired_at" timestamp with time zone,
	CONSTRAINT "uq_seller_registry_identifier_identity" UNIQUE("partner_id","registry_type","jurisdiction_country","registry_value")
);
--> statement-breakpoint
CREATE TABLE "seller_tax_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"identifier_value" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"canonical_identity_class" varchar(50) NOT NULL,
	"canonical_identifier_value" varchar(100) NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_source" varchar(100),
	"verification_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"current_verification_event_id" bigint,
	"retired_at" timestamp with time zone,
	CONSTRAINT "uq_seller_tax_identifier_identity" UNIQUE("partner_id","identifier_type","country_code","identifier_value")
);
--> statement-breakpoint
CREATE TABLE "seller_verification_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"subject_type" varchar(50) NOT NULL,
	"legal_identity_partner_id" bigint,
	"tax_identifier_id" bigint,
	"registry_identifier_id" bigint,
	"event_type" varchar(50) NOT NULL,
	"actor_type" varchar(50) NOT NULL,
	"actor_user_id" varchar(255),
	"source_type" varchar(50) NOT NULL,
	"source_name" varchar(100),
	"source_reference" text,
	"reason_code" varchar(100),
	"subject_snapshot" jsonb NOT NULL,
	"previous_verification_status" varchar(30),
	"previous_verified_at" timestamp with time zone,
	"previous_verification_source" varchar(100),
	"previous_verification_reference" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subject_matrix_check" CHECK (
    (subject_type = 'legal_identity' AND legal_identity_partner_id IS NOT NULL AND tax_identifier_id IS NULL AND registry_identifier_id IS NULL)
    OR
    (subject_type = 'tax_identifier' AND legal_identity_partner_id IS NULL AND tax_identifier_id IS NOT NULL AND registry_identifier_id IS NULL)
    OR
    (subject_type = 'registry_identifier' AND legal_identity_partner_id IS NULL AND tax_identifier_id IS NULL AND registry_identifier_id IS NOT NULL)
  ),
	CONSTRAINT "event_type_check" CHECK (event_type IN ('verified', 'rejected', 'invalidated')),
	CONSTRAINT "actor_type_check" CHECK (actor_type IN ('admin', 'system', 'external_adapter')),
	CONSTRAINT "actor_matrix_check" CHECK (
    (actor_type = 'admin' AND actor_user_id IS NOT NULL)
    OR
    (actor_type = 'system' AND actor_user_id IS NULL)
    OR
    (actor_type = 'external_adapter' AND actor_user_id IS NULL)
  ),
	CONSTRAINT "source_type_check" CHECK (source_type IN ('admin_manual', 'public_registry_manual', 'partner_document', 'external_adapter', 'system_rule'))
);
--> statement-breakpoint
ALTER TABLE "attribute_definition_translations" ADD CONSTRAINT "fk_adt_attribute_definition" FOREIGN KEY ("attribute_definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attribute_assignments" ADD CONSTRAINT "fk_caa_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attribute_assignments" ADD CONSTRAINT "fk_caa_attribute_definition" FOREIGN KEY ("attribute_definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controlled_option_value_translations" ADD CONSTRAINT "fk_covt_controlled_option_value" FOREIGN KEY ("controlled_option_value_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controlled_option_values" ADD CONSTRAINT "fk_cov_attribute" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_buyer_contact_snapshots" ADD CONSTRAINT "marketplace_order_buyer_contact_snapshots_marketplace_order_id_marketplace_orders_id_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_seller_disclosures" ADD CONSTRAINT "marketplace_order_seller_disclosures_marketplace_order_id_marketplace_orders_id_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_seller_disclosures" ADD CONSTRAINT "marketplace_order_seller_disclosures_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_orders" ADD CONSTRAINT "marketplace_orders_buyer_legal_context_snapshot_id_buyer_legal_context_snapshots_id_fk" FOREIGN KEY ("buyer_legal_context_snapshot_id") REFERENCES "public"."buyer_legal_context_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "fk_mott_oaov_target_current" FOREIGN KEY ("target_row_id_current") REFERENCES "public"."offer_attribute_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "fk_mott_source_entry" FOREIGN KEY ("source_entry_id","batch_id") REFERENCES "public"."migration_source_entries"("id","batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oaov_targets" ADD CONSTRAINT "fk_mott_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_oav_target_current" FOREIGN KEY ("target_row_id_current") REFERENCES "public"."offer_attribute_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_option" FOREIGN KEY ("target_option_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_source_entry" FOREIGN KEY ("source_entry_id","batch_id") REFERENCES "public"."migration_source_entries"("id","batch_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_oav_targets" ADD CONSTRAINT "fk_mot_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_rollback_attempts" ADD CONSTRAINT "fk_mra_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_source_entries" ADD CONSTRAINT "fk_mse_batch" FOREIGN KEY ("batch_id") REFERENCES "public"."migration_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_offer" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_attribute" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_option" FOREIGN KEY ("option_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_option_values" ADD CONSTRAINT "fk_oaov_attribute_option_pair" FOREIGN KEY ("attribute_id","option_id") REFERENCES "public"."controlled_option_values"("attribute_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_offer" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_attribute" FOREIGN KEY ("attribute_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_option" FOREIGN KEY ("option_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_attribute_values" ADD CONSTRAINT "fk_oav_attribute_option_pair" FOREIGN KEY ("attribute_id","option_id") REFERENCES "public"."controlled_option_values"("attribute_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_evidence_invalidations" ADD CONSTRAINT "partner_agreement_evidence_invalidations_execution_evidence_id_partner_agreement_execution_evidence_id_fk" FOREIGN KEY ("execution_evidence_id") REFERENCES "public"."partner_agreement_execution_evidence"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_agreement_version_id_agreement_versions_id_fk" FOREIGN KEY ("agreement_version_id") REFERENCES "public"."agreement_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "partner_user_memberships" ADD CONSTRAINT "partner_user_memberships_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_leads" ADD CONSTRAINT "rfq_leads_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_leads" ADD CONSTRAINT "rfq_leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_acceptance_decisions" ADD CONSTRAINT "seller_acceptance_decisions_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_eligibility" ADD CONSTRAINT "seller_eligibility_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_legal_identities" ADD CONSTRAINT "seller_legal_identities_current_verification_event_id_seller_verification_events_id_fk" FOREIGN KEY ("current_verification_event_id") REFERENCES "public"."seller_verification_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_legal_identities" ADD CONSTRAINT "seller_legal_identities_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_order_items" ADD CONSTRAINT "seller_order_items_offer_id_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_order_seller_snapshots" ADD CONSTRAINT "seller_order_seller_snapshots_seller_order_id_seller_orders_id_fk" FOREIGN KEY ("seller_order_id") REFERENCES "public"."seller_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_marketplace_order_id_marketplace_orders_id_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_orders" ADD CONSTRAINT "seller_orders_partner_id_partners_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD CONSTRAINT "seller_registry_identifiers_current_verification_event_id_seller_verification_events_id_fk" FOREIGN KEY ("current_verification_event_id") REFERENCES "public"."seller_verification_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD CONSTRAINT "seller_registry_identifiers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD CONSTRAINT "seller_tax_identifiers_current_verification_event_id_seller_verification_events_id_fk" FOREIGN KEY ("current_verification_event_id") REFERENCES "public"."seller_verification_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD CONSTRAINT "seller_tax_identifiers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verification_events" ADD CONSTRAINT "seller_verification_events_legal_identity_fkey" FOREIGN KEY ("legal_identity_partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verification_events" ADD CONSTRAINT "seller_verification_events_tax_identifier_fkey" FOREIGN KEY ("tax_identifier_id") REFERENCES "public"."seller_tax_identifiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_verification_events" ADD CONSTRAINT "seller_verification_events_registry_identifier_fkey" FOREIGN KEY ("registry_identifier_id") REFERENCES "public"."seller_registry_identifiers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_caa_cat_visible_sort" ON "category_attribute_assignments" USING btree ("category_id","is_visible","sort_order");--> statement-breakpoint
CREATE INDEX "idx_caa_cat_filterable_sort" ON "category_attribute_assignments" USING btree ("category_id","is_filterable","sort_order");--> statement-breakpoint
CREATE INDEX "idx_caa_attribute" ON "category_attribute_assignments" USING btree ("attribute_definition_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_orders_session" ON "marketplace_orders" USING btree ("session_hash");--> statement-breakpoint
CREATE INDEX "idx_offer_media_offer_id" ON "offer_media" USING btree ("offer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offer_media_primary" ON "offer_media" USING btree ("offer_id") WHERE is_primary = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_offer_media_checksum" ON "offer_media" USING btree ("offer_id","checksum_sha256");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_invalidations_evidence_id" ON "partner_agreement_evidence_invalidations" USING btree ("execution_evidence_id");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_evidence_partner_id" ON "partner_agreement_execution_evidence" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_partner_agreement_evidence_version_id" ON "partner_agreement_execution_evidence" USING btree ("agreement_version_id");--> statement-breakpoint
CREATE INDEX "idx_rfq_leads_offer" ON "rfq_leads" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "idx_rfq_leads_partner" ON "rfq_leads" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_seller_order_items_seller_order" ON "seller_order_items" USING btree ("seller_order_id");--> statement-breakpoint
CREATE INDEX "idx_seller_orders_partner" ON "seller_orders" USING btree ("partner_id");--> statement-breakpoint
CREATE INDEX "idx_seller_tax_canonical_active" ON "seller_tax_identifiers" USING btree ("canonical_identity_class","canonical_identifier_value") WHERE retired_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_verification_events_legal_subject" ON "seller_verification_events" USING btree ("legal_identity_partner_id");--> statement-breakpoint
CREATE INDEX "idx_verification_events_tax_subject" ON "seller_verification_events" USING btree ("tax_identifier_id");--> statement-breakpoint
CREATE INDEX "idx_verification_events_registry_subject" ON "seller_verification_events" USING btree ("registry_identifier_id");ALTER TABLE "partner_user_memberships" ENABLE ROW LEVEL SECURITY;
