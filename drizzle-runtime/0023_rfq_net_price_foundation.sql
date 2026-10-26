-- LM-B2B-NET-PRICE-01B: additive RFQ net-price storage foundation.
-- Existing price_brutto and all historical values are left untouched.
-- No changes to RFQ routing, checkout, or order snapshots in this migration.
-- Visibility defaults to false so no existing offer gains a public net-price label.
ALTER TABLE public.offers ADD COLUMN price_netto numeric(18,2);
--> statement-breakpoint
ALTER TABLE public.offers ADD COLUMN rfq_net_price_visible boolean NOT NULL DEFAULT false;
