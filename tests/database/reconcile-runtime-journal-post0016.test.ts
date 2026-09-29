import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { RUNTIME_MIGRATIONS_FOLDER } from "../../scripts/database/runtime-migration-contract";
import {
  POST_0016_RECOVERY_HISTORY,
  validateCanonicalDiskChain,
} from "../../scripts/database/reconcile-runtime-journal-post0016";

const folder = path.join(process.cwd(), RUNTIME_MIGRATIONS_FOLDER);
const journal = JSON.parse(fs.readFileSync(path.join(folder, "meta", "_journal.json"), "utf8")) as {
  entries: { idx: number; tag: string; when: number }[];
};
const migrations = readMigrationFiles({ migrationsFolder: folder });
const getBuffer = (tag: string) => fs.readFileSync(path.join(folder, `${tag}.sql`));
const prefixLength = POST_0016_RECOVERY_HISTORY.length;

test("POST0016 accepts a canonical disk chain with appended migrations", () => {
  assert.equal(prefixLength, 17);
  assert.ok(journal.entries.length > prefixLength);
  assert.doesNotThrow(() => validateCanonicalDiskChain(journal, migrations, getBuffer));
});

test("POST0016 rejects a disk journal/file count mismatch", () => {
  assert.throws(
    () => validateCanonicalDiskChain({ entries: journal.entries.slice(0, -1) }, migrations, getBuffer),
    /BLOCKED_DISK_CHAIN_LENGTH/,
  );
});

test("POST0016 rejects a canonical disk chain shorter than its recovery prefix", () => {
  const entries = journal.entries.slice(0, prefixLength - 1);
  assert.throws(
    () => validateCanonicalDiskChain({ entries }, migrations.slice(0, entries.length), getBuffer),
    /BLOCKED_DISK_CHAIN_LENGTH/,
  );
});

test("POST0016 rejects a changed tag inside the recovery prefix", () => {
  const entries = journal.entries.map((entry) => ({ ...entry }));
  entries[0].tag = "0000_changed_runtime_baseline";
  const renamedBuffer = (tag: string) =>
    getBuffer(tag === entries[0].tag ? journal.entries[0].tag : tag);
  assert.throws(
    () => validateCanonicalDiskChain({ entries }, migrations, renamedBuffer),
    /BLOCKED_DISK_PREFIX_INVALID/,
  );
});
