import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { ForbiddenError } from "@/lib/auth/authorization-errors";
import {
  evaluateDraftDeletion,
  executeDraftDeletion,
  parseDraftDeletionInput,
  type DraftDeletionTx,
} from "@/lib/offers/draft-delete-core";

const input = { offerId: 9, partnerId: null, expectedUpdatedAt: "2026-10-27T10:00:00.000Z" };
const draft = {
  publicationStatus: "draft",
  publishedAt: null,
  deletedAt: null,
  updatedAt: new Date(input.expectedUpdatedAt),
};

describe("strict draft deletion input", () => {
  test("parses admin input without trusting a supplied partner identifier", () => {
    assert.deepEqual(parseDraftDeletionInput({
      offerId: "9", partnerId: "55", expectedUpdatedAt: input.expectedUpdatedAt,
    }, false), input);
    assert.deepEqual(parseDraftDeletionInput({
      offerId: "9", partnerId: "55", expectedUpdatedAt: null,
    }, true), { offerId: 9, partnerId: 55, expectedUpdatedAt: null });
  });

  test("rejects invalid ids, missing version and malformed timestamps", () => {
    for (const value of ["0", "09", "-1", "1e2", "9007199254740992", 9, null]) {
      assert.equal(parseDraftDeletionInput({ offerId: value, expectedUpdatedAt: null }, false), null);
    }
    assert.equal(parseDraftDeletionInput({ offerId: "9" }, false), null);
    assert.equal(parseDraftDeletionInput({ offerId: "9", expectedUpdatedAt: "yesterday" }, false), null);
    assert.equal(parseDraftDeletionInput({ offerId: "9", expectedUpdatedAt: null }, true), null);
  });
});

describe("never-published draft deletion", () => {
  test("allows only a genuinely never-published draft at current version", () => {
    assert.equal(evaluateDraftDeletion(draft, input.expectedUpdatedAt), "READY");
    assert.equal(evaluateDraftDeletion({ ...draft, updatedAt: null }, null), "READY");
    assert.equal(evaluateDraftDeletion(draft, null), "OFFER_CONFLICT");
    assert.equal(evaluateDraftDeletion(draft, "2026-10-27T10:01:00.000Z"), "OFFER_CONFLICT");
  });

  test("denies all other statuses and historical publication, even when status is draft", () => {
    for (const status of ["published", "archived", "hidden", "deleted", "pending_review"]) {
      assert.equal(evaluateDraftDeletion({ ...draft, publicationStatus: status }, input.expectedUpdatedAt), "OFFER_NOT_DELETABLE");
    }
    assert.equal(evaluateDraftDeletion({ ...draft, publishedAt: new Date("2026-10-26T08:00:00Z") }, input.expectedUpdatedAt), "OFFER_NOT_DELETABLE");
    assert.equal(evaluateDraftDeletion({ ...draft, deletedAt: new Date() }, input.expectedUpdatedAt), "OFFER_NOT_DELETABLE");
  });
});

type Row = typeof draft | null;

function fakeDatabase(row: Row, updates: Record<string, unknown>[], trace: string[], changed = true) {
  const tx = {
    select: () => ({
      from: () => ({
        where: () => ({
          for: (lock: string) => {
            trace.push("lock:" + lock);
            return { limit: async () => row ? [row] : [] };
          },
        }),
      }),
    }),
    update: () => ({
      set: (patch: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            updates.push(patch);
            return changed ? [{ id: 9 }] : [];
          },
        }),
      }),
    }),
  };
  const db = {
    transaction: async (callback: (inner: DraftDeletionTx) => Promise<unknown>) => callback(tx as unknown as DraftDeletionTx),
  };
  return db as unknown as NodePgDatabase<typeof schema>;
}

describe("transactional deletion executor", () => {
  test("updates only the offer row, under row lock, without touching references", async () => {
    const patches: Record<string, unknown>[] = [], trace: string[] = [];
    const db = fakeDatabase(draft, patches, trace);
    assert.deepEqual(await executeDraftDeletion(db, input), { ok: true, code: "DRAFT_DELETED" });
    assert.deepEqual(trace, ["lock:update"]);
    assert.equal(patches.length, 1);
    assert.equal(patches[0].publicationStatus, "deleted");
    assert.equal(patches[0].isActive, false);
    assert.ok(patches[0].deletedAt);
    assert.ok(patches[0].updatedAt);
    assert.deepEqual(Object.keys(patches[0]).sort(), ["deletedAt", "isActive", "publicationStatus", "updatedAt"].sort());
  });

  test("rejects foreign / missing offer or conflicting status without update", async () => {
    for (const row of [null, { ...draft, publicationStatus: "published" }, { ...draft, publishedAt: new Date() }]) {
      const patches: Record<string, unknown>[] = [];
      const db = fakeDatabase(row, patches, []);
      const result = await executeDraftDeletion(db, input);
      assert.equal(result.ok, false);
      assert.deepEqual(patches, []);
    }
  });

  test("Partner requires authorization inside transaction before the offer lock", async () => {
    const patches: Record<string, unknown>[] = [], trace: string[] = [];
    const db = fakeDatabase(draft, patches, trace);
    const scopedInput = { ...input, partnerId: 15 };
    assert.deepEqual(await executeDraftDeletion(db, scopedInput), { ok: false, code: "UNAUTHORIZED" });
    assert.deepEqual(patches, []);
    assert.deepEqual(await executeDraftDeletion(db, scopedInput, async (_, partnerId) => {
      trace.push("authorize:" + partnerId);
    }), { ok: true, code: "DRAFT_DELETED" });
    assert.deepEqual(trace, ["authorize:15", "lock:update"]);
  });

  test("refuses unauthorized Partner and a lost concurrent update", async () => {
    const patches: Record<string, unknown>[] = [], trace: string[] = [];
    const db = fakeDatabase(draft, patches, trace, false);
    assert.deepEqual(await executeDraftDeletion(db, { ...input, partnerId: 42 }, async () => {
      throw new ForbiddenError();
    }), { ok: false, code: "UNAUTHORIZED" });
    assert.deepEqual(patches, []);

    assert.deepEqual(await executeDraftDeletion(db, input), { ok: false, code: "OFFER_CONFLICT" });
  });
});
