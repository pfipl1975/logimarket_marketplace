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
        ELSE UPPER(REGEXP_REPLACE(identifier_value, '[\s\-]', '', 'g'))
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

-- Backfill values
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
    ELSE UPPER(REGEXP_REPLACE("identifier_value", '[\s\-]', '', 'g'))
  END;

ALTER TABLE "seller_tax_identifiers" ALTER COLUMN "canonical_identity_class" SET NOT NULL;
ALTER TABLE "seller_tax_identifiers" ALTER COLUMN "canonical_identifier_value" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uq_seller_tax_canonical_active" ON "seller_tax_identifiers" USING btree ("canonical_identity_class","canonical_identifier_value") WHERE "retired_at" IS NULL;
