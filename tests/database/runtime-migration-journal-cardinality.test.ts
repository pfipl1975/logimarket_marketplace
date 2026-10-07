import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { readMigrationFiles } from "drizzle-orm/migrator";

import {
  KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
  isLegacyDev0000Exception,
} from "../../scripts/database/runtime-migration-hashing";
import { validateAppliedMigrationPrefix } from "../../scripts/database/runtime-migration-journal";

const migrationsFolder = path.join(process.cwd(), "drizzle-runtime");
const journal = JSON.parse(
  fs.readFileSync(path.join(migrationsFolder, "meta", "_journal.json"), "utf8"),
) as { entries: { idx: number; tag: string; when: number }[] };
const diskMigrations = readMigrationFiles({ migrationsFolder });
const canonicalRows = diskMigrations.map((migration) => ({
  hash: migration.hash,
  created_at: migration.folderMillis,
}));
const getMigrationBuffer = (tag: string) =>
  fs.readFileSync(path.join(migrationsFolder, `${tag}.sql`));

function validate(
  state: string,
  rows: { hash: string; created_at: string | number }[],
  target = "production",
  readMigration = getMigrationBuffer,
) {
  validateAppliedMigrationPrefix(
    target,
    state,
    journal,
    diskMigrations,
    rows,
    readMigration,
  );
}

test("CARDINALITY: canonical disk journal maps POST_0017 through POST_0023", () => {
  assert.strictEqual(journal.entries.length, 23);
  assert.strictEqual(diskMigrations.length, 23);
  assert.deepStrictEqual(
    journal.entries.slice(17).map(({ idx, tag }) => ({ idx, tag })),
    [
      { idx: 17, tag: "0017_publication_status_pending_review" },
      { idx: 18, tag: "0018_buyer_internal_trust_foundation" },
      { idx: 19, tag: "0019_legal_document_registry" },
      { idx: 20, tag: "0020_buyer_profile_and_identity_uniqueness" },
      { idx: 21, tag: "0021_buyer_invoice_snapshot" },
    ],
  );
});

test("CARDINALITY: POST_0017 accepts exactly 18 canonical rows", () => {
  assert.doesNotThrow(() =>
    validate("EXACT_EXISTING_POST_0017", canonicalRows.slice(0, 18)),
  );
});

for (const count of [17, 11, 19]) {
  test(`CARDINALITY: POST_0017 rejects ${count} rows`, () => {
    const rows =
      count <= canonicalRows.length
        ? canonicalRows.slice(0, count)
        : [...canonicalRows, canonicalRows[canonicalRows.length - 1]];
    assert.throws(
      () => validate("EXACT_EXISTING_POST_0017", rows),
      new RegExp(`schema is POST_0017 but journal has ${count} rows`),
    );
  });
}

test("CARDINALITY: POST_0018 accepts exactly 19 canonical rows", () => {
  assert.doesNotThrow(() =>
    validate("EXACT_EXISTING_POST_0018", canonicalRows.slice(0, 19)),
  );
});

for (const count of [18, 11, 20]) {
  test(`CARDINALITY: POST_0018 rejects ${count} rows`, () => {
    const rows =
      count <= canonicalRows.length
        ? canonicalRows.slice(0, count)
        : [...canonicalRows, canonicalRows[canonicalRows.length - 1]];
    assert.throws(
      () => validate("EXACT_EXISTING_POST_0018", rows),
      new RegExp(`schema is POST_0018 but journal has ${count} rows`),
    );
  });
}

test("CARDINALITY: POST_0019 accepts exactly 20 canonical rows", () => {
  assert.doesNotThrow(() =>
    validate("EXACT_EXISTING_POST_0019", canonicalRows.slice(0, 20)),
  );
});

for (const count of [19, 21, 10, 0]) {
  test(`CARDINALITY: POST_0019 rejects ${count} rows`, () => {
    const rows =
      count <= canonicalRows.length
        ? canonicalRows.slice(0, count)
        : [...canonicalRows, canonicalRows[canonicalRows.length - 1]];
    assert.throws(
      () => validate("EXACT_EXISTING_POST_0019", rows),
      new RegExp(`schema is POST_0019 but journal has ${count} rows`),
    );
  });
}

test("CARDINALITY: POST_0020 accepts exactly 21 canonical rows", () => {
  assert.doesNotThrow(() =>
    validate("EXACT_EXISTING_POST_0020", canonicalRows.slice(0, 21)),
  );
});

for (const count of [23, 20, 19, 0]) {
  test(`CARDINALITY: POST_0020 rejects ${count} rows`, () => {
    const rows = canonicalRows.slice(0, count);
    assert.throws(
      () => validate("EXACT_EXISTING_POST_0020", rows),
      new RegExp(`schema is POST_0020 but journal has ${count} rows`),
    );
  });
}

test("CARDINALITY: POST_0023 accepts exactly 23 canonical rows", () => {
  assert.doesNotThrow(() => validate("EXACT_EXISTING_POST_0023", canonicalRows));
});

for (const count of [21, 20, 0]) {
  test(`CARDINALITY: POST_0023 rejects ${count} rows`, () => {
    assert.throws(
      () => validate("EXACT_EXISTING_POST_0023", canonicalRows.slice(0, count)),
      new RegExp(`schema is POST_0023 but journal has ${count} rows`),
    );
  });
}

test("CARDINALITY: current live-style POST_0017 with 11 rows fails before hash validation", () => {
  const liveStyleRows = canonicalRows.slice(0, 11).map((row, index) =>
    index === 0
      ? { ...row, hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH }
      : row,
  );
  let migrationReadAttempted = false;

  assert.throws(
    () =>
      validate(
        "EXACT_EXISTING_POST_0017",
        liveStyleRows,
        "development",
        () => {
          migrationReadAttempted = true;
          throw new Error("hash validation must not run");
        },
      ),
    /schema is POST_0017 but journal has 11 rows/,
  );
  assert.strictEqual(migrationReadAttempted, false);
});

test("CARDINALITY: legacy DEV 0000 remains excluded from POST_0017 through POST_0023", () => {
  for (const state of [
    "EXACT_EXISTING_POST_0017",
    "EXACT_EXISTING_POST_0018",
    "EXACT_EXISTING_POST_0019",
    "EXACT_EXISTING_POST_0020",
    "EXACT_EXISTING_POST_0023",
  ]) {
    assert.strictEqual(
      isLegacyDev0000Exception(
        0,
        journal.entries[0].when,
        KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
        "development",
        state,
      ),
      false,
      state,
    );
  }

  const post0017Rows = canonicalRows.slice(0, 18).map((row, index) =>
    index === 0
      ? { ...row, hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH }
      : row,
  );
  assert.throws(
    () => validate("EXACT_EXISTING_POST_0017", post0017Rows, "development"),
    /hash mismatch.*isLegacy: false/,
  );
});
