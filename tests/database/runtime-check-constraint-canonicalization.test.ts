/**
 * runtime-check-constraint-canonicalization.test.ts
 *
 * Tests for CHECK constraint semantic canonicalization.
 *
 * Verifies that:
 *   1. All 8 real constraint pairs (contract form ↔ pg_get_constraintdef form)
 *      are accepted as equivalent.
 *   2. Real semantic drift (different literals, operators, columns, extra/missing
 *      values, argument counts) is still detected as a mismatch.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCheckConstraintDefinition,
} from "../../scripts/database/verify-runtime-schema-fingerprint";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function equivalent(a: string, b: string): boolean {
  return normalizeCheckConstraintDefinition(a) === normalizeCheckConstraintDefinition(b);
}

// ---------------------------------------------------------------------------
// 1. All 8 real constraint pairs — contract form vs pg_get_constraintdef form
// ---------------------------------------------------------------------------

test("chk_ad_data_type — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK (((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying, 'boolean'::character varying, 'date'::character varying, 'year'::character varying, 'enum'::character varying, 'multi_enum'::character varying])::text[])))";
  const pgForm =
    "CHECK (data_type::text = ANY (ARRAY['text'::character varying::text, 'number'::character varying::text, 'boolean'::character varying::text, 'date'::character varying::text, 'year'::character varying::text, 'enum'::character varying::text, 'multi_enum'::character varying::text]))";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("chk_adt_locale — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK (((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[])))";
  const pgForm =
    "CHECK (locale::text = ANY (ARRAY['pl'::character varying::text, 'en'::character varying::text, 'de'::character varying::text, 'fr'::character varying::text, 'uk'::character varying::text, 'es'::character varying::text, 'zh'::character varying::text]))";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("chk_caa_sort_order — contract form equals pg_get_constraintdef form", () => {
  // This one uses redundant outer double-parens in contract form
  const contractForm = "CHECK ((sort_order >= 0))";
  const pgForm = "CHECK (sort_order >= 0)";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("chk_covt_locale — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK (((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[])))";
  const pgForm =
    "CHECK (locale::text = ANY (ARRAY['pl'::character varying::text, 'en'::character varying::text, 'de'::character varying::text, 'fr'::character varying::text, 'uk'::character varying::text, 'es'::character varying::text, 'zh'::character varying::text]))";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("chk_oav_value_exclusivity — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK ((num_nonnulls(value_text, (value_number)::text, (value_boolean)::text, (value_date)::text, (value_year)::text, (option_id)::text) = 1))";
  const pgForm =
    "CHECK (num_nonnulls(value_text, value_number::text, value_boolean::text, value_date::text, value_year::text, option_id::text) = 1)";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("offers_conversion_type_check — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK (((conversion_type)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))";
  const pgForm =
    "CHECK (conversion_type::text = ANY (ARRAY['inbound'::character varying::text, 'outbound'::character varying::text]))";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("offers_offer_model_check — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK (((offer_model)::text = ANY ((ARRAY['rfq'::character varying, 'marketplace'::character varying])::text[])))";
  const pgForm =
    "CHECK (offer_model::text = ANY (ARRAY['rfq'::character varying::text, 'marketplace'::character varying::text]))";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

test("offers_publication_status_check — contract form equals pg_get_constraintdef form", () => {
  const contractForm =
    "CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))";
  const pgForm =
    "CHECK (publication_status::text = ANY (ARRAY['draft'::character varying::text, 'published'::character varying::text, 'archived'::character varying::text]))";
  assert.ok(
    equivalent(contractForm, pgForm),
    `Expected equivalent:\n  contract: ${normalizeCheckConstraintDefinition(contractForm)}\n  pg:       ${normalizeCheckConstraintDefinition(pgForm)}`
  );
});

// ---------------------------------------------------------------------------
// 2. Negative drift tests — real semantic differences MUST be detected
// ---------------------------------------------------------------------------

test("DRIFT: wrong literal value in ARRAY ('import' instead of 'inbound')", () => {
  const contract =
    "CHECK (((conversion_type)::text = ANY ((ARRAY['inbound'::character varying, 'outbound'::character varying])::text[])))";
  const drifted =
    "CHECK (conversion_type::text = ANY (ARRAY['import'::character varying::text, 'outbound'::character varying::text]))";
  assert.ok(
    !equivalent(contract, drifted),
    "Should detect drift when a literal value differs"
  );
});

test("DRIFT: extra value in ARRAY ('pending' added to publication_status)", () => {
  const contract =
    "CHECK (((publication_status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))";
  const drifted =
    "CHECK (publication_status::text = ANY (ARRAY['draft'::character varying::text, 'published'::character varying::text, 'archived'::character varying::text, 'pending'::character varying::text]))";
  assert.ok(
    !equivalent(contract, drifted),
    "Should detect drift when extra value is added to ARRAY"
  );
});

test("DRIFT: wrong operator >= changed to > in sort_order check", () => {
  const contract = "CHECK ((sort_order >= 0))";
  const drifted = "CHECK (sort_order > 0)";
  assert.ok(
    !equivalent(contract, drifted),
    "Should detect drift when >= is changed to >"
  );
});

test("DRIFT: num_nonnulls expected count changed from 1 to 2", () => {
  const contract =
    "CHECK ((num_nonnulls(value_text, (value_number)::text, (value_boolean)::text, (value_date)::text, (value_year)::text, (option_id)::text) = 1))";
  const drifted =
    "CHECK (num_nonnulls(value_text, value_number::text, value_boolean::text, value_date::text, value_year::text, option_id::text) = 2)";
  assert.ok(
    !equivalent(contract, drifted),
    "Should detect drift when = 1 is changed to = 2"
  );
});

test("DRIFT: missing value in locale ARRAY ('de' removed)", () => {
  const contract =
    "CHECK (((locale)::text = ANY ((ARRAY['pl'::character varying, 'en'::character varying, 'de'::character varying, 'fr'::character varying, 'uk'::character varying, 'es'::character varying, 'zh'::character varying])::text[])))";
  const drifted =
    "CHECK (locale::text = ANY (ARRAY['pl'::character varying::text, 'en'::character varying::text, 'fr'::character varying::text, 'uk'::character varying::text, 'es'::character varying::text, 'zh'::character varying::text]))";
  assert.ok(
    !equivalent(contract, drifted),
    "Should detect drift when a value is removed from ARRAY"
  );
});

test("DRIFT: different column name (data_type changed to field_type)", () => {
  const contract =
    "CHECK (((data_type)::text = ANY ((ARRAY['text'::character varying, 'number'::character varying])::text[])))";
  const drifted =
    "CHECK (field_type::text = ANY (ARRAY['text'::character varying::text, 'number'::character varying::text]))";
  assert.ok(
    !equivalent(contract, drifted),
    "Should detect drift when column name differs"
  );
});

// ---------------------------------------------------------------------------
// 3. Additional whitespace/formatting equivalences
// ---------------------------------------------------------------------------

test("extra whitespace between tokens is ignored", () => {
  const a = "CHECK  (  sort_order  >=  0  )";
  const b = "CHECK (sort_order >= 0)";
  assert.ok(equivalent(a, b), "Extra whitespace should be ignored");
});

test("case differences are ignored", () => {
  const a = "CHECK (SORT_ORDER >= 0)";
  const b = "CHECK (sort_order >= 0)";
  assert.ok(equivalent(a, b), "Case differences should be ignored");
});
