import { test } from "node:test";
import assert from "node:assert";
import {
  normalizePostgresType,
  normalizeDefaultExpression,
  normalizeConstraintDefinition,
  normalizeIndexDefinition,
} from "../../scripts/database/verify-runtime-schema-fingerprint";

test("normalizes types correctly", () => {
  assert.strictEqual(normalizePostgresType("character varying"), "varchar");
  assert.strictEqual(normalizePostgresType("character varying(255)"), "varchar(255)");
  assert.strictEqual(normalizePostgresType("integer"), "int4");
  assert.strictEqual(normalizePostgresType("bigint"), "int8");
  assert.strictEqual(normalizePostgresType("boolean"), "bool");
  assert.strictEqual(normalizePostgresType("double precision"), "float8");
  assert.strictEqual(normalizePostgresType("text"), "text");
});

test("normalizes default expressions", () => {
  assert.strictEqual(normalizeDefaultExpression(null), null);
  assert.strictEqual(normalizeDefaultExpression("  now()  "), "now()");
  assert.strictEqual(normalizeDefaultExpression("NOW()"), "now()");
  assert.strictEqual(normalizeDefaultExpression("true"), "true");
});

test("normalizes constraint definitions", () => {
  assert.strictEqual(normalizeConstraintDefinition("PRIMARY KEY (id)"), "primary key (id)");
  assert.strictEqual(normalizeConstraintDefinition("  UNIQUE  (slug)  "), "unique (slug)");
});

test("normalizes index definitions", () => {
  assert.strictEqual(normalizeIndexDefinition("  category_id  "), "category_id");
  assert.strictEqual(normalizeIndexDefinition("CATEGORY_ID"), "category_id");
});
