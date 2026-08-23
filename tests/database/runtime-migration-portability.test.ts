import test from "node:test";
import assert from "node:assert";

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import { 
  getPortableHashes, 
  isPortableHashEquivalent, 
  KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH 
} from "../../scripts/database/runtime-migration-hashing";

import { validateAppliedMigrationPrefix } from "../../scripts/database/runtime-migration-journal";
import { createCanonicalRuntimeMigrationDirectory, cleanupCanonicalRuntimeMigrationDirectory } from "../../scripts/database/runtime-migration-temp-dir";

test("PORTABILITY: 0003 migration has correct expected LF and CRLF hashes", () => {
  const p0003 = path.join(process.cwd(), "drizzle-runtime", "0003_prod_legacy_offer_reconciliation.sql");
  const buf = fs.readFileSync(p0003);
  const hashes = getPortableHashes(buf);
  assert.strictEqual(hashes.lfHash, "9f6682f81de8bff3504eae0f9326f53908173b2f6f98a2c8b3d815444613deb8");
  assert.strictEqual(hashes.crlfHash, "7a426cd044ad60bddcb22b75ce47beada8db24813e01dc071304e7fb864d048b");
  assert.ok(isPortableHashEquivalent(hashes.lfHash, buf));
  assert.ok(isPortableHashEquivalent(hashes.crlfHash, buf));
});

test("PORTABILITY: 0000 legacy DEV hash is strictly not equivalent to actual file", () => {
  const p0000 = path.join(process.cwd(), "drizzle-runtime", "0000_production_runtime_baseline.sql");
  const buf = fs.readFileSync(p0000);
  assert.strictEqual(isPortableHashEquivalent(KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH, buf), false);
});

test("PORTABILITY: 0000 production historical hash is portable equivalent", () => {
  const p0000 = path.join(process.cwd(), "drizzle-runtime", "0000_production_runtime_baseline.sql");
  const buf = fs.readFileSync(p0000);
  const prodHash = "4eb7982931250aa30a0a8ce801c68961eb72cbb476e83202f30637f0e8354be7";
  assert.ok(isPortableHashEquivalent(prodHash, buf));
});

test("JOURNAL: missing disk entry throws", () => {
  assert.throws(
    () => validateAppliedMigrationPrefix("production", "MIGRATABLE_POST_0002", { entries: [] }, [], [{ hash: "123", created_at: 1 }], () => Buffer.from("")),
    /RUNNER: BLOCKED. Journal states do not match/
  );
});

test("JOURNAL: accepts legacy dev hash ONLY if state is MIGRATABLE_POST_0002", () => {
  // Pass:
  validateAppliedMigrationPrefix(
    "development", 
    "MIGRATABLE_POST_0002", 
    { entries: [{ tag: "0000", when: 1785589560000 }] }, 
    [{ folderMillis: 1785589560000, hash: "anything" }],
    [{ hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH, created_at: 1785589560000 }],
    () => Buffer.from("wrong sql") // will fail portable hash, so it relies on legacy exemption
  );

  // Fail (wrong state):
  assert.throws(
    () => validateAppliedMigrationPrefix(
      "development", 
      "PARTIAL_OR_DRIFTED", 
      { entries: [{ tag: "0000", when: 1785589560000 }] }, 
      [{ folderMillis: 1785589560000, hash: "anything" }],
      [{ hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH, created_at: 1785589560000 }],
      () => Buffer.from("wrong sql")
    ),
    /hash mismatch/
  );
  
  // Fail (wrong target):
  assert.throws(
    () => validateAppliedMigrationPrefix(
      "production", 
      "MIGRATABLE_POST_0002", 
      { entries: [{ tag: "0000", when: 1785589560000 }] }, 
      [{ folderMillis: 1785589560000, hash: "anything" }],
      [{ hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH, created_at: 1785589560000 }],
      () => Buffer.from("wrong sql")
    ),
    /hash mismatch/
  );
});

test("TEMP_DIR: creates canonical folder and cleans it up", () => {
  let tempDir = "";
  try {
    tempDir = createCanonicalRuntimeMigrationDirectory(
      { entries: [{ tag: "test", when: 123 }] },
      () => Buffer.from("SELECT 1;\r\nSELECT 2;\r\n")
    );
    assert.ok(tempDir.includes("runtime-migrations-"));
    assert.ok(!tempDir.includes(process.cwd()));
    assert.ok(tempDir.startsWith(os.tmpdir()));

    const sql = fs.readFileSync(path.join(tempDir, "test.sql"), "utf8");
    assert.strictEqual(sql, "SELECT 1;\nSELECT 2;\n", "Must normalize to LF");
  } finally {
    cleanupCanonicalRuntimeMigrationDirectory(tempDir);
    assert.ok(!fs.existsSync(tempDir));
  }
});

