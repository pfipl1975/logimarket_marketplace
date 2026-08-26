import { test, describe } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

describe("0004_seller_registered_address Runtime Migration", () => {
  const sqlPath = path.join(process.cwd(), "drizzle-runtime", "0004_seller_registered_address.sql");

  test("file exists", () => {
    assert.ok(fs.existsSync(sqlPath), "Migration file must exist");
  });

  test("contains exactly the intended non-destructive ADD COLUMN statements", () => {
    const sql = fs.readFileSync(sqlPath, "utf-8");

    // Must target public.seller_legal_identities
    assert.match(sql, /ALTER TABLE public\.seller_legal_identities/i);

    // Must not target any other table
    const alterTables = [...sql.matchAll(/ALTER TABLE (.*?)\s/gi)];
    assert.strictEqual(alterTables.length, 1, "Only one ALTER TABLE allowed");

    // Exact 6 columns
    assert.match(sql, /ADD COLUMN IF NOT EXISTS registered_address_line1 character varying\(255\)/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS registered_address_line2 character varying\(255\)/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS registered_postal_code character varying\(32\)/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS registered_city character varying\(120\)/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS registered_region character varying\(120\)/i);
    assert.match(sql, /ADD COLUMN IF NOT EXISTS registered_country_code character varying\(2\)/i);

    // No forbidden destructive or side-effect commands
    assert.doesNotMatch(sql, /\bINSERT\b/i);
    assert.doesNotMatch(sql, /\bUPDATE\b/i);
    assert.doesNotMatch(sql, /\bDELETE\b/i);
    assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
    assert.doesNotMatch(sql, /\bDROP\b/i);
    assert.doesNotMatch(sql, /\bCREATE TABLE\b/i);
    assert.doesNotMatch(sql, /\bCREATE INDEX\b/i);

    // No NOT NULL or DEFAULT
    assert.doesNotMatch(sql, /\bNOT NULL\b/i);
    assert.doesNotMatch(sql, /\bDEFAULT\b/i);

    // Ensure old incorrect field names are NOT present
    assert.doesNotMatch(sql, /registered_country\b/i);
    assert.doesNotMatch(sql, /registered_street\b/i);
    assert.doesNotMatch(sql, /registered_building\b/i);
    assert.doesNotMatch(sql, /registered_apartment\b/i);
  });
});
