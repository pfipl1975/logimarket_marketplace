import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { RUNTIME_MIGRATIONS_FOLDER } from "../../scripts/database/runtime-migration-contract";

test("RFQ_MIGRATION: contains mandatory prechecks", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0001_rfq_workflow_hardening.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8").toLowerCase();
  
  assert.ok(sql.includes("raise exception"), "Must use RAISE EXCEPTION for prechecks");
  assert.ok(sql.includes("invalid status"), "Must precheck invalid status");
  assert.ok(sql.includes("orphan"), "Must precheck orphans");
});

test("RFQ_MIGRATION: does not use ADD CONSTRAINT IF NOT EXISTS", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0001_rfq_workflow_hardening.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8").toLowerCase();
  
  assert.ok(!sql.includes("add constraint if not exists"), "PostgreSQL does not support ADD CONSTRAINT IF NOT EXISTS");
});

test("RFQ_MIGRATION: uses DO block for catalog constraints", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0001_rfq_workflow_hardening.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8").toLowerCase();
  
  assert.ok(sql.includes("from pg_constraint"), "Must query pg_constraint in DO block");
  assert.ok(sql.includes("add constraint rfq_leads_status_check"), "Must add constraint explicitly");
});

test("RFQ_MIGRATION: does not use CONCURRENTLY for indexes", () => {
  const sqlPath = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER, "0001_rfq_workflow_hardening.sql");
  const sql = fs.readFileSync(sqlPath, "utf-8").toLowerCase();
  
  assert.ok(sql.includes("create index if not exists"), "Must create index if not exists");
  assert.ok(!sql.includes("concurrently"), "Must NOT use CONCURRENTLY in transactional migrations");
});
