import { test } from "node:test";
import assert from "node:assert";
import { validateAppliedMigrationPrefix } from "../../scripts/database/runtime-migration-journal";

const MOCK_DISK_JOURNAL = {
  entries: [
    { tag: "0000_production_runtime_baseline", when: 1785589560000 },
    { tag: "0001_rfq_workflow_hardening", when: 1785590000000 },
    { tag: "0002_seller_identity_56b1", when: 1785590500000 },
    { tag: "0003_prod_legacy_offer_reconciliation", when: 1785591000000 },
    { tag: "0004_seller_registered_address", when: 1785591500000 },
  ],
};

// Creating fake buffers that hash exactly to what the journal expects,
// or just rely on the fallback legacy rules for 0000, and mocking the buffer behavior.
// Since isPortableHashEquivalent takes the hash and the buffer, we can just mock getMigrationBuffer
// to return a dummy buffer. But wait, isPortableHashEquivalent computes SHA256 of the buffer.
// Let's just construct valid hashes.
import crypto from "crypto";

function getFakeHash(buffer: Buffer) {
  const hash = crypto.createHash("sha256");
  hash.update(buffer);
  return hash.digest("hex");
}

const fakeBuffers = {
  "0000_production_runtime_baseline": Buffer.from("0000"),
  "0001_rfq_workflow_hardening": Buffer.from("0001"),
  "0002_seller_identity_56b1": Buffer.from("0002"),
  "0003_prod_legacy_offer_reconciliation": Buffer.from("0003"),
  "0004_seller_registered_address": Buffer.from("0004"),
};

const fakeHashes = {
  "0000_production_runtime_baseline": getFakeHash(fakeBuffers["0000_production_runtime_baseline"]),
  "0001_rfq_workflow_hardening": getFakeHash(fakeBuffers["0001_rfq_workflow_hardening"]),
  "0002_seller_identity_56b1": getFakeHash(fakeBuffers["0002_seller_identity_56b1"]),
  "0003_prod_legacy_offer_reconciliation": getFakeHash(fakeBuffers["0003_prod_legacy_offer_reconciliation"]),
  "0004_seller_registered_address": getFakeHash(fakeBuffers["0004_seller_registered_address"]),
};

const MOCK_DISK_MIGRATIONS = MOCK_DISK_JOURNAL.entries.map((e) => ({
  folderMillis: e.when,
  hash: fakeHashes[e.tag as keyof typeof fakeHashes],
}));

const getMigrationBuffer = (tag: string) => fakeBuffers[tag as keyof typeof fakeBuffers];

const createAppliedRows = (count: number) => {
  return MOCK_DISK_JOURNAL.entries.slice(0, count).map((e) => ({
    hash: fakeHashes[e.tag as keyof typeof fakeHashes],
    created_at: e.when,
  }));
};

test("MIGRATABLE_POST_0003 validates with exactly 4 rows", () => {
  assert.doesNotThrow(() => {
    validateAppliedMigrationPrefix(
      "MIGRATABLE_POST_0003",
      "MIGRATABLE_POST_0003",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      createAppliedRows(4),
      getMigrationBuffer
    );
  });
});

test("MIGRATABLE_POST_0003 blocks with 3 rows", () => {
  assert.throws(() => {
    validateAppliedMigrationPrefix(
      "MIGRATABLE_POST_0003",
      "MIGRATABLE_POST_0003",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      createAppliedRows(3),
      getMigrationBuffer
    );
  }, /schema is POST_0003 but journal has 3 rows/);
});

test("MIGRATABLE_POST_0003 blocks with 5 rows", () => {
  assert.throws(() => {
    validateAppliedMigrationPrefix(
      "MIGRATABLE_POST_0003",
      "MIGRATABLE_POST_0003",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      createAppliedRows(5),
      getMigrationBuffer
    );
  }, /schema is POST_0003 but journal has 5 rows/);
});

test("EXACT_EXISTING_POST_0004 validates with exactly 5 rows", () => {
  assert.doesNotThrow(() => {
    validateAppliedMigrationPrefix(
      "EXACT_EXISTING_POST_0004",
      "EXACT_EXISTING_POST_0004",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      createAppliedRows(5),
      getMigrationBuffer
    );
  });
});

test("EXACT_EXISTING_POST_0004 blocks with 4 rows", () => {
  assert.throws(() => {
    validateAppliedMigrationPrefix(
      "EXACT_EXISTING_POST_0004",
      "EXACT_EXISTING_POST_0004",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      createAppliedRows(4),
      getMigrationBuffer
    );
  }, /schema is EXACT_EXISTING but journal has 4 rows/);
});

test("EXACT_EXISTING_POST_0004 blocks with 6 rows", () => {
  assert.throws(() => {
    validateAppliedMigrationPrefix(
      "EXACT_EXISTING_POST_0004",
      "EXACT_EXISTING_POST_0004",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      // create 6th fake row
      [...createAppliedRows(5), { hash: "fake", created_at: 12345 }],
      getMigrationBuffer
    );
  }, /schema is EXACT_EXISTING but journal has 6 rows/);
});

test("Blocks on hash mismatch", () => {
  const rows = createAppliedRows(5);
  rows[4].hash = "wronghash";
  assert.throws(() => {
    validateAppliedMigrationPrefix(
      "EXACT_EXISTING_POST_0004",
      "EXACT_EXISTING_POST_0004",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      rows,
      getMigrationBuffer
    );
  }, /hash mismatch/);
});

test("Blocks on timestamp mismatch", () => {
  const rows = createAppliedRows(5);
  rows[4].created_at = 99999999;
  assert.throws(() => {
    validateAppliedMigrationPrefix(
      "EXACT_EXISTING_POST_0004",
      "EXACT_EXISTING_POST_0004",
      MOCK_DISK_JOURNAL,
      MOCK_DISK_MIGRATIONS,
      rows,
      getMigrationBuffer
    );
  }, /timestamp mismatch/);
});
