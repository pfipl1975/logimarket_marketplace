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
	"registered_country" varchar(2),
	"registered_city" varchar(255),
	"registered_postal_code" varchar(50),
	"registered_street" varchar(255),
	"registered_building" varchar(100),
	"registered_apartment" varchar(100)
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
	CONSTRAINT "uq_seller_registry_identifier_identity" UNIQUE("partner_id","registry_type","jurisdiction_country","registry_value")
);
--> statement-breakpoint
CREATE TABLE "seller_tax_identifiers" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"partner_id" bigint NOT NULL,
	"identifier_type" varchar(50) NOT NULL,
	"identifier_value" varchar(100) NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"verification_status" varchar(30) DEFAULT 'unverified' NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_source" varchar(100),
	"verification_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	CONSTRAINT "uq_seller_tax_identifier_identity" UNIQUE("partner_id","identifier_type","country_code","identifier_value")
);
--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "categories" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "offer_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "offer_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "partner_id" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "partner_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "clicked_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "clicked_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "clicked_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "session_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "ip_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "clicks" ALTER COLUMN "is_unique_24h" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "unit_price" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "company_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "contact_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "phone" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "session_hash" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total_amount" SET DATA TYPE varchar(50);--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "partners" ALTER COLUMN "website_url" SET DATA TYPE varchar;--> statement-breakpoint
ALTER TABLE "partners" ALTER COLUMN "created_at" SET DATA TYPE timestamp;--> statement-breakpoint
ALTER TABLE "partners" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "rfq_leads" ALTER COLUMN "company_name" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "rfq_leads" ALTER COLUMN "phone" SET DATA TYPE varchar(100);--> statement-breakpoint
ALTER TABLE "rfq_leads" ALTER COLUMN "created_at" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "offers" ADD COLUMN "contract_model" varchar(30);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "total_price" varchar(50);--> statement-breakpoint
ALTER TABLE "rfq_leads" ADD COLUMN "status" varchar(20) DEFAULT 'new' NOT NULL;--> statement-breakpoint
ALTER TABLE "seller_eligibility" ADD CONSTRAINT "seller_eligibility_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_legal_identities" ADD CONSTRAINT "seller_legal_identities_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_registry_identifiers" ADD CONSTRAINT "seller_registry_identifiers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seller_tax_identifiers" ADD CONSTRAINT "seller_tax_identifiers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."seller_legal_identities"("partner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_leads" ADD CONSTRAINT "rfq_leads_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "public"."offers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfq_leads" ADD CONSTRAINT "rfq_leads_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."partners"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rfq_leads_offer" ON "rfq_leads" USING btree ("offer_id");--> statement-breakpoint
CREATE INDEX "idx_rfq_leads_partner" ON "rfq_leads" USING btree ("partner_id");--> statement-breakpoint
ALTER TABLE "order_items" DROP COLUMN "created_at";--> statement-breakpoint
ALTER TABLE "offers" ADD CONSTRAINT "offers_contract_model_check" CHECK (((contract_model)::text = ANY ((ARRAY['partner_marketplace'::character varying, 'external_redirect'::character varying, 'logimarket_reseller'::character varying])::text[])));--> statement-breakpoint
ALTER TABLE "rfq_leads" ADD CONSTRAINT "rfq_leads_status_check" CHECK (((status)::text = ANY ((ARRAY['new'::character varying, 'in_progress'::character varying, 'responded'::character varying, 'closed'::character varying])::text[])));