import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import test from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";
import {
  getPortableHashes,
  isPortableHashEquivalent,
  KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
} from "../../scripts/database/runtime-migration-hashing";
import { validateAppliedMigrationPrefix } from "../../scripts/database/runtime-migration-journal";
import {
  createCanonicalRuntimeMigrationDirectory,
  cleanupCanonicalRuntimeMigrationDirectory,
} from "../../scripts/database/runtime-migration-temp-dir";
import { isLegacyDev0000Exception } from "../../scripts/database/runtime-migration-hashing";

test("PORTABILITY: 0003 migration has correct expected LF and CRLF hashes", () => {
  const p0003 = path.join(
    process.cwd(),
    "drizzle-runtime",
    "0003_prod_legacy_offer_reconciliation.sql",
  );
  const buf = fs.readFileSync(p0003);
  const hashes = getPortableHashes(buf);
  assert.strictEqual(
    hashes.lfHash,
    "9f6682f81de8bff3504eae0f9326f53908173b2f6f98a2c8b3d815444613deb8",
  );
  assert.strictEqual(
    hashes.crlfHash,
    "7a426cd044ad60bddcb22b75ce47beada8db24813e01dc071304e7fb864d048b",
  );
  assert.ok(isPortableHashEquivalent(hashes.lfHash, buf));
  assert.ok(isPortableHashEquivalent(hashes.crlfHash, buf));
});

test("PORTABILITY: 0000 legacy DEV hash is strictly not equivalent to actual file", () => {
  const p0000 = path.join(
    process.cwd(),
    "drizzle-runtime",
    "0000_production_runtime_baseline.sql",
  );
  const buf = fs.readFileSync(p0000);
  assert.strictEqual(
    isPortableHashEquivalent(KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH, buf),
    false,
  );
});

test("PORTABILITY: 0000 production historical hash is portable equivalent", () => {
  const p0000 = path.join(
    process.cwd(),
    "drizzle-runtime",
    "0000_production_runtime_baseline.sql",
  );
  const buf = fs.readFileSync(p0000);
  const prodHash =
    "4eb7982931250aa30a0a8ce801c68961eb72cbb476e83202f30637f0e8354be7";
  assert.ok(isPortableHashEquivalent(prodHash, buf));
});

test("JOURNAL: missing disk entry throws", () => {
  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "production",
        "MIGRATABLE_POST_0002",
        { entries: [] },
        [],
        [{ hash: "123", created_at: 1 }],
        () => Buffer.from(""),
      ),
    /RUNNER: BLOCKED. Journal states do not match/,
  );
});

test("JOURNAL: accepts legacy dev hash ONLY if state is MIGRATABLE_POST_0002", () => {
  validateAppliedMigrationPrefix(
    "development",
    "MIGRATABLE_POST_0002",
    {
      entries: [
        { tag: "0000", when: 1785589560000 },
        { tag: "0001", when: 1785590000000 },
        { tag: "0002", when: 1785590500000 },
      ],
    },
    [
      { folderMillis: 1785589560000, hash: "anything" },
      { folderMillis: 1785590000000, hash: "anything" },
      { folderMillis: 1785590500000, hash: "anything" },
    ],
    [
      {
        hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
        created_at: 1785589560000,
      },
      {
        hash: crypto.createHash("sha256").update("").digest("hex"),
        created_at: 1785590000000,
      },
      {
        hash: crypto.createHash("sha256").update("").digest("hex"),
        created_at: 1785590500000,
      },
    ],
    () => Buffer.from(""),
  );

  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "development",
        "PARTIAL_OR_DRIFTED",
        { entries: [{ tag: "0000", when: 1785589560000 }] },
        [{ folderMillis: 1785589560000, hash: "anything" }],
        [
          {
            hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
            created_at: 1785589560000,
          },
        ],
        () => Buffer.from("wrong sql"),
      ),
    /PARTIAL_OR_DRIFTED/,
  );

  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "production",
        "MIGRATABLE_POST_0002",
        {
          entries: [
            { tag: "0000", when: 1785589560000 },
            { tag: "0001", when: 1785590000000 },
            { tag: "0002", when: 1785590500000 },
          ],
        },
        [
          { folderMillis: 1785589560000, hash: "anything" },
          { folderMillis: 1785590000000, hash: "anything" },
          { folderMillis: 1785590500000, hash: "anything" },
        ],
        [
          {
            hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
            created_at: 1785589560000,
          },
          {
            hash: crypto.createHash("sha256").update("").digest("hex"),
            created_at: 1785590000000,
          },
          {
            hash: crypto.createHash("sha256").update("").digest("hex"),
            created_at: 1785590500000,
          },
        ],
        () => Buffer.from("wrong sql"),
      ),
    /hash mismatch/,
  );
});

test("TEMP: creates canonical folder and cleans it up", () => {
  let tempDir = "";
  try {
    tempDir = createCanonicalRuntimeMigrationDirectory(
      JSON.stringify({ entries: [{ tag: "test", when: 123 }] }),
      { entries: [{ tag: "test", when: 123 }] },
      () => Buffer.from("SELECT 1;\r\nSELECT 2;\r\n"),
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

test("TEMP: creates directory and writes exact journal object", () => {
  const journalText = JSON.stringify({
    entries: [{ tag: "0000", when: 1785589560000 }],
  });
  const journalObj = JSON.parse(journalText);
  let tempDir = "";
  try {
    tempDir = createCanonicalRuntimeMigrationDirectory(
      journalText,
      journalObj,
      () => Buffer.from("SELECT 1;"),
    );
    const metaPath = path.join(tempDir, "meta", "_journal.json");
    assert.strictEqual(fs.readFileSync(metaPath, "utf8"), journalText);
  } finally {
    cleanupCanonicalRuntimeMigrationDirectory(tempDir);
  }
});

test("TEMP: fails and cleans up when getMigrationBuffer throws", () => {
  const journalText = JSON.stringify({
    entries: [
      { tag: "0000", when: 1785589560000 },
      { tag: "0001", when: 1785590000000 },
    ],
  });
  const journalObj = JSON.parse(journalText);
  const getTempDirs = () =>
    fs
      .readdirSync(os.tmpdir())
      .filter((f) => f.startsWith("runtime-migrations-"));
  const beforeDirs = getTempDirs();
  try {
    createCanonicalRuntimeMigrationDirectory(journalText, journalObj, (tag) => {
      if (tag === "0001") {
        throw new Error("Synthetic failure");
      }
      return Buffer.from("SELECT 1;");
    });
    assert.fail("Should have thrown");
  } catch (err: unknown) {
    assert.strictEqual((err as Error).message, "Synthetic failure");
  }
  const afterDirs = getTempDirs();
  assert.deepStrictEqual(afterDirs, beforeDirs);
});

test("TEMP: handles secret markers by ensuring they are absent", () => {
  const journalText = JSON.stringify({
    entries: [{ tag: "0000", when: 1785589560000 }],
  });
  const journalObj = JSON.parse(journalText);
  const unrelatedEnvObj = { secret: "DO_NOT_WRITE_SECRET_9f91e5" };
  let tempDir = "";
  try {
    tempDir = createCanonicalRuntimeMigrationDirectory(
      journalText,
      journalObj,
      () => Buffer.from("SELECT 1;"),
    );
    const readAllFiles = (dir: string): string[] => {
      let results: string[] = [];
      const list = fs.readdirSync(dir);
      list.forEach((file) => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
          results = results.concat(readAllFiles(file));
        } else {
          results.push(file);
        }
      });
      return results;
    };
    const allFiles = readAllFiles(tempDir);
    for (const file of allFiles) {
      const content = fs.readFileSync(file, "utf8");
      assert.strictEqual(
        content.includes(unrelatedEnvObj.secret),
        false,
        `File ${file} should not contain secret`,
      );
    }
  } finally {
    if (tempDir) cleanupCanonicalRuntimeMigrationDirectory(tempDir);
  }
});

test("HASH: same SQL with LF vs CRLF produces different raw SHA-256", () => {
  const lf = Buffer.from("SELECT 1;\n", "utf8");
  const crlf = Buffer.from("SELECT 1;\r\n", "utf8");
  const h1 = crypto.createHash("sha256").update(lf).digest("hex");
  const h2 = crypto.createHash("sha256").update(crlf).digest("hex");
  assert.notStrictEqual(h1, h2);
});

test("HASH: portable validator treats those two representations as equivalent", () => {
  const lf = Buffer.from("SELECT 1;\n", "utf8");
  const crlf = Buffer.from("SELECT 1;\r\n", "utf8");
  const lfRawHash = crypto.createHash("sha256").update(lf).digest("hex");
  const crlfRawHash = crypto.createHash("sha256").update(crlf).digest("hex");
  assert.strictEqual(isPortableHashEquivalent(lfRawHash, lf), true);
  assert.strictEqual(isPortableHashEquivalent(lfRawHash, crlf), true);
  assert.strictEqual(isPortableHashEquivalent(crlfRawHash, lf), true);
  assert.strictEqual(isPortableHashEquivalent(crlfRawHash, crlf), true);
});

test("HASH: one actual SQL character change is rejected", () => {
  const base = Buffer.from("SELECT 1;\n", "utf8");
  const mut = Buffer.from("SELECT 2;\n", "utf8");
  const baseHash = crypto.createHash("sha256").update(base).digest("hex");
  assert.strictEqual(isPortableHashEquivalent(baseHash, mut), false);
});

test("HASH: whitespace mutation other than EOL is rejected", () => {
  const base = Buffer.from("SELECT 1;\n", "utf8");
  const space = Buffer.from("SELECT  1;\n", "utf8");
  const baseHash = crypto.createHash("sha256").update(base).digest("hex");
  assert.strictEqual(isPortableHashEquivalent(baseHash, space), false);
});

test("HASH: dev exception rejects production", () => {
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
      "production",
      "MIGRATABLE_POST_0002",
    ),
    false,
  );
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
      "production",
      "MIGRATABLE_POST_0004",
    ),
    false,
  );
});

test("HASH: dev exception rejects other states", () => {
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
      "development",
      "EMPTY",
    ),
    false,
  );
});

test("HASH: dev exception rejects other hashes", () => {
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      "wrong hash",
      "development",
      "MIGRATABLE_POST_0002",
    ),
    false,
  );
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      "wrong hash",
      "development",
      "MIGRATABLE_POST_0004",
    ),
    false,
  );
});

test("HASH: dev exception rejects wrong timestamp", () => {
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      12345,
      KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
      "development",
      "MIGRATABLE_POST_0004",
    ),
    false,
  );
});

test("HASH: dev exception accepts POST_0002 and POST_0004", () => {
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
      "development",
      "MIGRATABLE_POST_0002",
    ),
    true,
  );
  assert.strictEqual(
    isLegacyDev0000Exception(
      0,
      1785589560000,
      KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
      "development",
      "MIGRATABLE_POST_0004",
    ),
    true,
  );
});

test("JOURNAL: development POST_0004 with legacy hash passes", () => {
  validateAppliedMigrationPrefix(
    "development",
    "MIGRATABLE_POST_0004",
    {
      entries: [
        { tag: "0000", when: 1785589560000 },
        { tag: "0001", when: 1785590000000 },
        { tag: "0002", when: 1785590500000 },
        { tag: "0003", when: 1785591000000 },
        { tag: "0004", when: 1785591500000 },
      ],
    },
    [
      { folderMillis: 1785589560000, hash: "anything" },
      { folderMillis: 1785590000000, hash: "anything" },
      { folderMillis: 1785590500000, hash: "anything" },
      { folderMillis: 1785591000000, hash: "anything" },
      { folderMillis: 1785591500000, hash: "anything" },
    ],
    [
      {
        hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
        created_at: 1785589560000,
      },
      {
        hash: crypto.createHash("sha256").update("").digest("hex"),
        created_at: 1785590000000,
      },
      {
        hash: crypto.createHash("sha256").update("").digest("hex"),
        created_at: 1785590500000,
      },
      {
        hash: crypto.createHash("sha256").update("").digest("hex"),
        created_at: 1785591000000,
      },
      {
        hash: crypto.createHash("sha256").update("").digest("hex"),
        created_at: 1785591500000,
      },
    ],
    () => Buffer.from(""),
  );
});

test("JOURNAL: development POST_0004 with wrong row count fails", () => {
  assert.throws(
    () =>
      validateAppliedMigrationPrefix(
        "development",
        "MIGRATABLE_POST_0004",
        {
          entries: [
            { tag: "0000", when: 1785589560000 },
            { tag: "0001", when: 1785590000000 },
          ],
        }, // Expected array is short but state is POST_0004
        [
          { folderMillis: 1785589560000, hash: "anything" },
          { folderMillis: 1785590000000, hash: "anything" },
        ],
        [
          {
            hash: KNOWN_LEGACY_DEVELOPMENT_BASELINE_HASH,
            created_at: 1785589560000,
          },
          {
            hash: crypto.createHash("sha256").update("").digest("hex"),
            created_at: 1785590000000,
          },
        ],
        () => Buffer.from(""),
      ),
    /RUNNER: BLOCKED/,
  );
});
