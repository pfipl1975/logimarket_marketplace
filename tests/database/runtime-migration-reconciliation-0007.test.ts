import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";

import {
  POST_0007_RECONCILIATION_AUTHORIZATION,
  POST_0007_RECONCILIATION_MODE,
  validateAppliedMigrationPrefix,
} from "../../scripts/database/runtime-migration-journal";
import { verifyTarget } from "../../scripts/database/verify-runtime-migration-target";

const migrationsFolder = path.join(process.cwd(), "drizzle-runtime");
const journal = JSON.parse(
  fs.readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"),
) as { entries: { tag: string; when: number }[] };
const diskMigrations = readMigrationFiles({ migrationsFolder });
const getMigrationBuffer = (tag: string) =>
  fs.readFileSync(path.join(migrationsFolder, `${tag}.sql`));
const appliedRows = diskMigrations.map((migration) => ({
  hash: migration.hash,
  created_at: migration.folderMillis,
}));

test("POST_0007_RECONCILIATION: ordinary runner remains fail-closed for physical POST_0007 plus journal 0000-0006", () => {
  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "production",
        "EXACT_EXISTING_POST_0007",
        journal,
        diskMigrations,
        appliedRows.slice(0, 7),
        getMigrationBuffer,
      ),
    /schema is POST_0007 but journal has 7 rows/,
  );
});

test("POST_0007_RECONCILIATION: exact production drift is accepted only with the dedicated mode", () => {
  assert.doesNotThrow(() =>
    validateAppliedMigrationPrefix(
      "production",
      "EXACT_EXISTING_POST_0007",
      journal,
      diskMigrations,
      appliedRows.slice(0, 7),
      getMigrationBuffer,
      POST_0007_RECONCILIATION_MODE,
    ),
  );

  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "development",
        "EXACT_EXISTING_POST_0007",
        journal,
        diskMigrations,
        appliedRows.slice(0, 7),
        getMigrationBuffer,
        POST_0007_RECONCILIATION_MODE,
      ),
    /requires exact POST_0007 physical state/,
  );
});

test("POST_0007_RECONCILIATION: canonical 0007 hash and timestamp are mandatory", () => {
  const wrongJournal = {
    entries: journal.entries.map((entry, index) =>
      index === 7 ? { ...entry, when: entry.when + 1 } : entry,
    ),
  };
  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "production",
        "EXACT_EXISTING_POST_0007",
        wrongJournal,
        diskMigrations,
        appliedRows.slice(0, 7),
        getMigrationBuffer,
        POST_0007_RECONCILIATION_MODE,
      ),
    /exact canonical 0007 journal metadata/,
  );

  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "production",
        "EXACT_EXISTING_POST_0007",
        journal,
        diskMigrations,
        appliedRows.slice(0, 7),
        (tag) =>
          tag === "0007_marketplace_order_rls_hardening"
            ? Buffer.from("ALTER TABLE public.marketplace_orders DISABLE ROW LEVEL SECURITY;\n")
            : getMigrationBuffer(tag),
        POST_0007_RECONCILIATION_MODE,
      ),
    /exact canonical 0007 migration hash/,
  );
});

test("POST_0007_RECONCILIATION: target verifier requires exact production-only authorization", () => {
  const env: NodeJS.ProcessEnv = {
    DATABASE_URL:
      "postgres://postgres.prodref@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
    RUNTIME_MIGRATION_TARGET: "production",
    RUNTIME_MIGRATION_EXPECTED_PROJECT_REF: "prodref",
    RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF: "forbiddenref",
    RUNTIME_MIGRATION_RECONCILIATION: POST_0007_RECONCILIATION_MODE,
    RUNTIME_MIGRATION_WRITE_AUTHORIZATION:
      POST_0007_RECONCILIATION_AUTHORIZATION,
  };

  assert.doesNotThrow(() => verifyTarget(env));
  assert.throws(
    () =>
      verifyTarget({
        ...env,
        RUNTIME_MIGRATION_WRITE_AUTHORIZATION:
          "AUTHORIZED_PROD_RUNTIME_0000_TO_0003",
      }),
    /Invalid write authorization for production reconciliation/,
  );
  assert.throws(
    () =>
      verifyTarget({
        ...env,
        RUNTIME_MIGRATION_TARGET: "development",
        RUNTIME_MIGRATION_WRITE_AUTHORIZATION:
          "AUTHORIZED_DEV_BASELINE_WRITE",
      }),
    /production-only/,
  );
});
