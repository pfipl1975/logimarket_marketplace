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
ALTER TABLE "attribute_definition_translations" ADD CONSTRAINT "fk_adt_attribute_definition" FOREIGN KEY ("attribute_definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attribute_assignments" ADD CONSTRAINT "fk_caa_category" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_attribute_assignments" ADD CONSTRAINT "fk_caa_attribute_definition" FOREIGN KEY ("attribute_definition_id") REFERENCES "public"."attribute_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "controlled_option_value_translations" ADD CONSTRAINT "fk_covt_controlled_option_value" FOREIGN KEY ("controlled_option_value_id") REFERENCES "public"."controlled_option_values"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_caa_cat_visible_sort" ON "category_attribute_assignments" USING btree ("category_id","is_visible","sort_order");--> statement-breakpoint
CREATE INDEX "idx_caa_cat_filterable_sort" ON "category_attribute_assignments" USING btree ("category_id","is_filterable","sort_order");--> statement-breakpoint
CREATE INDEX "idx_caa_attribute" ON "category_attribute_assignments" USING btree ("attribute_definition_id");