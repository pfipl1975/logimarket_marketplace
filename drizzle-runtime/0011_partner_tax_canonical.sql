DO $$
DECLARE
  conflict_record RECORD;
BEGIN
  -- We are about to enforce canonical uniqueness for active tax identities.
  -- First, perform a fail-closed precheck for existing duplicates.
  WITH canonical_taxes AS (
    SELECT
      partner_id,
      CASE
        WHEN country_code = 'PL' THEN 'PL:NIP'
        ELSE UPPER(country_code || ':' || identifier_type)
      END AS canonical_class,
      CASE
        WHEN country_code = 'PL' THEN
          REGEXP_REPLACE(
            CASE
              WHEN identifier_type = 'vat_id' AND identifier_value ILIKE 'PL%' THEN SUBSTRING(identifier_value FROM 3)
              ELSE identifier_value
            END,
            '[\s\-]', '', 'g'
          )
        -- Non-PL: trim and uppercase only; no separator stripping (no universal normalization rule defined)
        ELSE UPPER(TRIM(identifier_value))
      END AS canonical_value
    FROM seller_tax_identifiers
    WHERE retired_at IS NULL
  )
  SELECT canonical_class, canonical_value, COUNT(DISTINCT partner_id) as partner_count
  INTO conflict_record
  FROM canonical_taxes
  GROUP BY canonical_class, canonical_value
  HAVING COUNT(DISTINCT partner_id) > 1
  LIMIT 1;

  IF FOUND THEN
    RAISE EXCEPTION 'BLOCKED_EXISTING_TAX_IDENTITY_DUPLICATES';
  END IF;
END $$;

ALTER TABLE "seller_tax_identifiers" ADD COLUMN "canonical_identity_class" varchar(50);
ALTER TABLE "seller_tax_identifiers" ADD COLUMN "canonical_identifier_value" varchar(100);

-- Backfill values using the same normalization logic as resolveCanonicalTaxIdentity:
-- PL: strip spaces/hyphens; strip 'PL' prefix from vat_id; class = PL:NIP
-- Non-PL: trim + uppercase; no separator stripping (no universal rule defined)
UPDATE "seller_tax_identifiers"
SET
  "canonical_identity_class" = CASE
    WHEN "country_code" = 'PL' THEN 'PL:NIP'
    ELSE UPPER("country_code" || ':' || "identifier_type")
  END,
  "canonical_identifier_value" = CASE
    WHEN "country_code" = 'PL' THEN
      REGEXP_REPLACE(
        CASE
          WHEN "identifier_type" = 'vat_id' AND "identifier_value" ILIKE 'PL%' THEN SUBSTRING("identifier_value" FROM 3)
          ELSE "identifier_value"
        END,
        '[\s\-]', '', 'g'
      )
    -- Non-PL: trim and uppercase only
    ELSE UPPER(TRIM("identifier_value"))
  END;

ALTER TABLE "seller_tax_identifiers" ALTER COLUMN "canonical_identity_class" SET NOT NULL;
ALTER TABLE "seller_tax_identifiers" ALTER COLUMN "canonical_identifier_value" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_seller_tax_canonical_active" ON "seller_tax_identifiers" USING btree ("canonical_identity_class","canonical_identifier_value") WHERE "retired_at" IS NULL;

CREATE OR REPLACE FUNCTION "check_canonical_tax_ownership"()
RETURNS trigger AS $$
DECLARE
  existing_partner_id bigint;
  lock_key1 int;
  lock_key2 int;
BEGIN
  IF NEW.retired_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Ensure deadlock-safe ordering for updates affecting the canonical key
  IF TG_OP = 'UPDATE' AND (OLD.canonical_identity_class <> NEW.canonical_identity_class OR OLD.canonical_identifier_value <> NEW.canonical_identifier_value) AND OLD.retired_at IS NULL THEN
    lock_key1 := hashtext(OLD.canonical_identity_class || ':' || OLD.canonical_identifier_value);
    lock_key2 := hashtext(NEW.canonical_identity_class || ':' || NEW.canonical_identifier_value);
    IF lock_key1 < lock_key2 THEN
      PERFORM pg_advisory_xact_lock(hashtext('canonical_tax_ownership'), lock_key1);
      PERFORM pg_advisory_xact_lock(hashtext('canonical_tax_ownership'), lock_key2);
    ELSE
      PERFORM pg_advisory_xact_lock(hashtext('canonical_tax_ownership'), lock_key2);
      PERFORM pg_advisory_xact_lock(hashtext('canonical_tax_ownership'), lock_key1);
    END IF;
  ELSE
    PERFORM pg_advisory_xact_lock(hashtext('canonical_tax_ownership'), hashtext(NEW.canonical_identity_class || ':' || NEW.canonical_identifier_value));
  END IF;

  SELECT partner_id INTO existing_partner_id
  FROM "seller_tax_identifiers"
  WHERE "canonical_identity_class" = NEW.canonical_identity_class
    AND "canonical_identifier_value" = NEW.canonical_identifier_value
    AND "retired_at" IS NULL
    AND (TG_OP = 'INSERT' OR "id" <> OLD.id)
  LIMIT 1;

  IF FOUND AND existing_partner_id <> NEW.partner_id THEN
    RAISE EXCEPTION 'Canonical tax identity already assigned to another partner'
      USING ERRCODE = '23505', CONSTRAINT = 'uq_seller_tax_canonical_active';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "trg_check_canonical_tax_ownership" ON "seller_tax_identifiers";
CREATE TRIGGER "trg_check_canonical_tax_ownership"
BEFORE INSERT OR UPDATE OF "canonical_identity_class", "canonical_identifier_value", "retired_at", "partner_id"
ON "seller_tax_identifiers"
FOR EACH ROW
EXECUTE FUNCTION "check_canonical_tax_ownership"();
