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
ALTER TABLE "partner_agreement_execution_evidence" ADD COLUMN "accepted_legal_pack_version_id" integer;
--> statement-breakpoint
ALTER TABLE "partner_agreement_execution_evidence" ADD COLUMN "accepted_pack_root_sha256" varchar(64);
--> statement-breakpoint
DO $body$ BEGIN
 ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_legal_document_id_legal_documents_id_fk" FOREIGN KEY ("legal_document_id") REFERENCES "public"."legal_documents"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;
--> statement-breakpoint

DO $body$ BEGIN
 ALTER TABLE "legal_pack_documents" ADD CONSTRAINT "legal_pack_documents_legal_pack_version_id_legal_pack_versions_id_fk" FOREIGN KEY ("legal_pack_version_id") REFERENCES "public"."legal_pack_versions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;
--> statement-breakpoint

DO $body$ BEGIN
 ALTER TABLE "legal_pack_documents" ADD CONSTRAINT "legal_pack_documents_legal_document_version_id_legal_document_versions_id_fk" FOREIGN KEY ("legal_document_version_id") REFERENCES "public"."legal_document_versions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;
--> statement-breakpoint

DO $body$ BEGIN
 ALTER TABLE "partner_agreement_execution_evidence" ADD CONSTRAINT "partner_agreement_execution_evidence_accepted_legal_pack_version_id_legal_pack_versions_id_fk" FOREIGN KEY ("accepted_legal_pack_version_id") REFERENCES "public"."legal_pack_versions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $body$;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_legal_doc_versions_active" ON "legal_document_versions" USING btree ("legal_document_id","language") WHERE status = 'active';--> statement-breakpoint
CREATE UNIQUE INDEX "uq_legal_pack_versions_active" ON "legal_pack_versions" USING btree ("code","language") WHERE status = 'active';--> statement-breakpoint
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
