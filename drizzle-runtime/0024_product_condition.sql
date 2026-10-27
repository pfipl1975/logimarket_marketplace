-- LM-OFFER-CONDITION-01: nullable condition; no backfill of historical offers.
ALTER TABLE public.offers ADD COLUMN product_condition varchar(20);
--> statement-breakpoint
ALTER TABLE public.offers ADD CONSTRAINT offers_product_condition_check CHECK (product_condition IS NULL OR product_condition IN ('new', 'used', 'refurbished'));
