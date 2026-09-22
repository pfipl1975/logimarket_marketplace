-- TEST-ONLY LEGACY SCHEMA FIXTURE
-- GENERATED FROM COMMIT:
-- 77b98aff6a2042e04513830a7dba6bc0c838883b
-- DO NOT APPLY TO PRODUCTION

CREATE TABLE "cart_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"session_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"parent_id" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "clicks" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"clicked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"session_hash" varchar(64),
	"ip_hash" varchar(64),
	"is_unique_24h" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"category_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"image_url" varchar(512),
	"price_brutto" numeric,
	"price_on_request" boolean DEFAULT true NOT NULL,
	"conversion_type" varchar(20) DEFAULT 'outbound' NOT NULL,
	"offer_model" varchar(20) DEFAULT 'rfq' NOT NULL,
	"outbound_url" varchar(512),
	"is_featured" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"publication_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"archived_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"technical_attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"order_id" bigint NOT NULL,
	"offer_id" bigint NOT NULL,
	"title" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"message" text,
	"session_hash" varchar(64),
	"total_amount" numeric,
	"status" varchar(20) DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "partners" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"logo_url" varchar(512),
	"website_url" varchar(512),
	"contact_email" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfq_leads" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"offer_id" bigint NOT NULL,
	"partner_id" bigint NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
