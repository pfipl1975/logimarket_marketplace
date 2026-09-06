import test from "node:test";
import assert from "node:assert/strict";
import { planMediaChange, changeOfferMediaCore, type ManagedMedia, type MediaManagementDependencies } from "../../src/lib/admin/offer-media-management-core";
import { createStagingReceipt, verifyStagingReceipt } from "../../src/lib/storage/staging-receipt";
import { finalizeStagedImage } from "../../src/lib/admin/offer-media-staging-core";
import { readFileSync } from "node:fs";

const rows: ManagedMedia[] = [1, 2, 3].map((id) => ({ id, offerId: 7, sortOrder: id * 10, isPrimary: id === 1, storageBucket: "offer-media", objectPath: `offers/7/${id}.jpg`, mimeType: "image/jpeg" }));
test("primary change leaves exactly one primary", () => {
  const result = planMediaChange(rows, 7, 3, "primary").rows;
  assert.deepEqual(result.filter((r) => r.isPrimary).map((r) => r.id), [3]);
});
test("invalid ownership is rejected for every operation", () => {
  for (const op of ["primary", "previous", "next", "delete"] as const) assert.throws(() => planMediaChange(rows, 8, 1, op), /MEDIA_NOT_FOUND/);
});
test("previous/next, boundaries and normalization are deterministic", () => {
  assert.deepEqual(planMediaChange(rows, 7, 2, "previous").rows.map((r) => r.id), [2, 1, 3]);
  assert.deepEqual(planMediaChange(rows, 7, 2, "next").rows.map((r) => r.id), [1, 3, 2]);
  assert.deepEqual(planMediaChange(rows, 7, 1, "previous").rows.map((r) => r.id), [1, 2, 3]);
  assert.deepEqual(planMediaChange(rows, 7, 3, "next").rows.map((r) => r.sortOrder), [0, 1, 2]);
  const tied = rows.map((r) => ({ ...r, sortOrder: 0 })).reverse();
  assert.deepEqual(planMediaChange(tied, 7, 1, "previous").rows.map((r) => r.id), [1, 2, 3]);
});
test("delete primary chooses next and normalizes order; last delete is empty", () => {
  const next = planMediaChange(rows, 7, 1, "delete").rows;
  assert.deepEqual(next.map((r) => [r.id, r.sortOrder, r.isPrimary]), [[2, 0, true], [3, 1, false]]);
  assert.deepEqual(planMediaChange([rows[0]], 7, 1, "delete").rows, []);
});
function deps(events: string[], fail?: "storage" | "apply" | "commit" | "restore"): MediaManagementDependencies {
  return {
    transaction: async (work) => {
      events.push("lock");
      try {
        const value = await work({ rows, apply: async (ordered, deleted) => {
          events.push("apply"); assert.equal(deleted, 1); assert.equal(ordered.filter((r) => r.isPrimary).length, 1);
          if (fail === "apply") throw Error("private DB error");
        } });
        if (fail === "commit" || fail === "restore") throw Error("private commit error");
        events.push("commit"); return value;
      } catch (e) { events.push("rollback"); throw e; }
    },
    storage: {
      download: async () => { events.push("backup"); return Buffer.from("image"); },
      delete: async () => { events.push("delete"); return { ok: fail !== "storage" }; },
      put: async () => { events.push("restore"); return { ok: fail !== "restore" }; },
    },
  };
}
test("delete orders backup, DB update, storage removal and commit", async () => {
  const events: string[] = [];
  assert.deepEqual(await changeOfferMediaCore(7, 1, "delete", deps(events)), { ok: true });
  assert.deepEqual(events, ["lock", "backup", "apply", "delete", "commit"]);
});
test("storage failure rolls back DB and returns a safe error", async () => {
  const events: string[] = [];
  assert.deepEqual(await changeOfferMediaCore(7, 1, "delete", deps(events, "storage")), { ok: false, code: "STORAGE_ERROR" });
  assert.deepEqual(events.slice(-2), ["rollback", "restore"]);
});
test("DB statement failure never deletes storage", async () => {
  const events: string[] = [];
  assert.deepEqual(await changeOfferMediaCore(7, 1, "delete", deps(events, "apply")), { ok: false, code: "DB_ERROR" });
  assert.equal(events.includes("delete"), false);
});
test("commit failure restores deleted bytes; restoration failure is explicit", async () => {
  for (const fail of ["commit", "restore"] as const) {
    const events: string[] = [];
    assert.deepEqual(await changeOfferMediaCore(7, 1, "delete", deps(events, fail)), { ok: false, code: fail === "commit" ? "DB_ERROR" : "DB_ERROR_CLEANUP_FAILED" });
    assert.equal(events.at(-1), "restore");
  }
});
test("ambiguous commit recovery delegates to committed-row verification", async () => {
  const events: string[] = [];
  const dependencies = deps(events, "commit");
  dependencies.restore = async (row, bytes) => {
    assert.equal(row.id, 1); assert.equal(bytes.toString(), "image");
    events.push("check-committed-row"); return { ok: true };
  };
  assert.deepEqual(await changeOfferMediaCore(7, 1, "delete", dependencies), { ok: false, code: "DB_ERROR" });
  assert.equal(events.includes("restore"), false);
  assert.equal(events.at(-1), "check-committed-row");
});
test("staging receipts bind random path, actor, offer, expiry and signature", () => {
  const first = createStagingReceipt(7, "admin-a", "test-secret", 100);
  assert.notEqual(first.path, createStagingReceipt(7, "admin-a", "test-secret", 100).path);
  assert.equal(verifyStagingReceipt(first.receipt, 7, "admin-a", "test-secret", 101), first.path);
  for (const [offer, actor, secret, now] of [[8, "admin-a", "test-secret", 101], [7, "admin-b", "test-secret", 101], [7, "admin-a", "other", 101], [7, "admin-a", "test-secret", 9_000_000]] as const) assert.throws(() => verifyStagingReceipt(first.receipt, offer, actor, secret, now), /STAGING_INVALID/);
  assert.throws(() => verifyStagingReceipt(first.receipt + "x", 7, "admin-a", "test-secret", 101));
  assert.equal(verifyStagingReceipt(first.receipt, 7, "admin-a", "test-secret", 9_000_000, true), first.path);
});
for (const failure of ["none", "download", "validation", "duplicate", "cleanup"] as const) test(`staging cleanup on ${failure}`, async () => {
  const events: string[] = [];
  const result = await finalizeStagedImage("owned-path", {
    download: async () => { events.push("download"); if (failure === "download") throw Error("secret"); return Buffer.from("image"); },
    persist: async () => { events.push("persist"); return failure === "validation" ? { ok: false, code: "INVALID_MIME_TYPE" } : failure === "duplicate" ? { ok: false, code: "DUPLICATE_CONTENT" } : { ok: true, mediaId: 1 }; },
    remove: async () => { events.push("remove"); return { ok: failure !== "cleanup" }; },
  });
  assert.equal(events.at(-1), "remove");
  assert.equal(result.ok, failure === "none");
  assert.equal(JSON.stringify(result).includes("secret"), false);
  if (failure === "cleanup") assert.deepEqual(result, { ok: false, code: "STAGING_CLEANUP_FAILED" });
});
test("every public media action authorizes before service/storage access", () => {
  const actions = readFileSync(new URL("../../src/app/actions.ts", import.meta.url), "utf8");
  for (const name of ["getAdminOfferMedia", "prepareAdminOfferMediaUpload", "finalizeAdminOfferMediaUpload", "cancelAdminOfferMediaUpload", "importAdminOfferMedia", "setAdminOfferPrimaryMedia", "moveAdminOfferMedia", "deleteAdminOfferMedia", "uploadAdminOfferMedia"]) {
    const start = actions.indexOf(`export async function ${name}(`);
    assert.ok(start >= 0, name);
    const end = actions.indexOf("export async function", start + 1);
    const body = actions.slice(start, end < 0 ? undefined : end);
    const guard = body.indexOf("await requireAdmin()");
    assert.ok(guard >= 0, name);
    for (const dependency of ["@/lib/admin/offer-media-service", "@/lib/storage/", "process.env.SUPABASE_SERVICE_ROLE_KEY"]) {
      const access = body.indexOf(dependency);
      if (access >= 0) assert.ok(access > guard, `${name}: ${dependency}`);
    }
  }
});
