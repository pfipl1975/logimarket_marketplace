CREATE TABLE IF NOT EXISTS "offer_media" (
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
	CONSTRAINT "offer_media_object_path_unique" UNIQUE("object_path")
);
--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "offers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_offer_media_offer_id" ON "offer_media" ("offer_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_offer_media_primary" ON "offer_media" ("offer_id") WHERE is_primary = true;
--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_source_type_check" CHECK (((source_type)::text = ANY ((ARRAY['upload'::character varying, 'remote_import'::character varying])::text[])));
--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_size_bytes_check" CHECK (size_bytes > 0);
--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_sort_order_check" CHECK (sort_order >= 0);
--> statement-breakpoint
ALTER TABLE "offer_media" ADD CONSTRAINT "offer_media_checksum_format_check" CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$');
--> statement-breakpoint
ALTER TABLE "offer_media" ENABLE ROW LEVEL SECURITY;

--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_offer_media_checksum" ON "offer_media" ("offer_id", "checksum_sha256");
