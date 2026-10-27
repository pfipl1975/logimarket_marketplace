import { randomUUID } from "node:crypto";
import { expect } from "@playwright/test";
import { Pool } from "pg";
import { test, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";

test.describe("Draft-only soft deletion (Admin and Partner)", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  const tag = "qa-delete-" + randomUUID().slice(0, 8);
  let database: Pool | null = null;
  let categoryId = 0;
  let partnerA = 0;
  let partnerB = 0;
  let attributeId = 0;
  let multiAttributeId = 0;
  let optionId = 0;
  const offerIds: number[] = [];

  const insertOffer = async (title: string, status = "draft", published = false) => {
    if (!database) throw new Error("No isolated test database");
    const r = await database.query<{ id: string }>(
      "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, publication_status, published_at) VALUES ($1,$2,$3,'rfq','inbound',$4,CASE WHEN $5 THEN now() ELSE NULL END) RETURNING id",
      [partnerA, categoryId, title, status, published],
    );
    const id = Number(r.rows[0].id);
    offerIds.push(id);
    return id;
  };

  const getOffer = async (id: number) => {
    const r = await database!.query<{
      publication_status: string; deleted_at: Date | null; is_active: boolean;
    }>("SELECT publication_status, deleted_at, is_active FROM offers WHERE id=$1", [id]);
    return r.rows[0];
  };

  test.beforeAll(async () => {
    database = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const p = await database.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1,$2),($3,$4) RETURNING id",
      ["QA Delete A " + tag, "a-" + tag + "@example.invalid", "QA Delete B " + tag, "b-" + tag + "@example.invalid"],
    );
    [partnerA, partnerB] = p.rows.map(x => Number(x.id));
    const c = await database.query<{ id: string }>(
      "INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING id",
      ["QA Delete Category " + tag, tag],
    );
    categoryId = Number(c.rows[0].id);
    // User initially has permission only to B, never to A.
    await database.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1,$2,'active',false)",
      [partnerB, E2E_NON_ADMIN_USER_ID],
    );
    const attrs = await database.query<{ id: string }>(
      "INSERT INTO attribute_definitions (stable_key, data_type) VALUES ($1,'text'),($2,'multi_enum') RETURNING id",
      ["qa-delete-text-" + tag, "qa-delete-options-" + tag],
    );
    [attributeId, multiAttributeId] = attrs.rows.map(x => Number(x.id));
    const opt = await database.query<{ id: string }>(
      "INSERT INTO controlled_option_values (attribute_id, stable_key) VALUES ($1,$2) RETURNING id",
      [multiAttributeId, "qa-delete-option-" + tag],
    );
    optionId = Number(opt.rows[0].id);
  });

  test.afterAll(async () => {
    if (!database) return;
    try {
      for (const id of offerIds) {
        await database.query("DELETE FROM offer_attribute_option_values WHERE offer_id=$1", [id]);
        await database.query("DELETE FROM offer_attribute_values WHERE offer_id=$1", [id]);
        await database.query("DELETE FROM offer_media WHERE offer_id=$1", [id]);
        await database.query("DELETE FROM offers WHERE id=$1", [id]);
      }
      if (optionId) await database.query("DELETE FROM controlled_option_values WHERE id=$1", [optionId]);
      for (const id of [attributeId, multiAttributeId]) {
        if (id) await database.query("DELETE FROM attribute_definitions WHERE id=$1", [id]);
      }
      if (partnerA && partnerB) {
        await database.query("DELETE FROM partner_user_memberships WHERE partner_id IN ($1,$2)", [partnerA, partnerB]);
      }
      if (categoryId) await database.query("DELETE FROM categories WHERE id=$1", [categoryId]);
      if (partnerA && partnerB) await database.query("DELETE FROM partners WHERE id IN ($1,$2)", [partnerA, partnerB]);
    } finally {
      await database.end();
    }
  });

  test("Admin deletes a never-published draft while preserving media and attributes", async ({ adminPage, page }) => {
    test.setTimeout(90_000);
    const id = await insertOffer("QA Admin deleted " + tag);
    const detailUrl = "/admin/oferty/" + id;
    const response = await adminPage.goto(detailUrl);
    expect(response?.status()).toBe(200);

    // Attach records after the page read to avoid browser loading synthetic media.
    await database!.query(
      "INSERT INTO offer_media (offer_id, storage_bucket, object_path, source_type, mime_type, size_bytes, checksum_sha256) VALUES ($1,'offer-media',$2,'upload','image/jpeg',100,$3)",
      [id, "qa-delete/" + tag + "/fixture.jpg", "a".repeat(64)],
    );
    await database!.query(
      "INSERT INTO offer_attribute_values (offer_id, attribute_id, value_text) VALUES ($1,$2,$3)",
      [id, attributeId, "stored reference"],
    );
    await database!.query(
      "INSERT INTO offer_attribute_option_values (offer_id, attribute_id, option_id) VALUES ($1,$2,$3)",
      [id, multiAttributeId, optionId],
    );

    await adminPage.getByRole("button", { name: pl.draftDeletion.deleteButton, exact: true }).click();
    await expect(adminPage.getByText(pl.draftDeletion.confirmTitle)).toBeVisible();
    await adminPage.getByRole("button", { name: pl.draftDeletion.cancel }).click();
    await expect(adminPage.getByRole("button", { name: pl.draftDeletion.deleteButton })).toBeVisible();
    await adminPage.getByRole("button", { name: pl.draftDeletion.deleteButton, exact: true }).click();
    await adminPage.getByRole("button", { name: pl.draftDeletion.confirm, exact: true }).click();
    await expect(adminPage).toHaveURL("/admin/oferty");

    const row = await getOffer(id);
    expect(row.publication_status).toBe("deleted");
    expect(row.deleted_at).not.toBeNull();
    expect(row.is_active).toBe(false);

    for (const table of ["offer_media", "offer_attribute_values", "offer_attribute_option_values"]) {
      const count = await database!.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM " + table + " WHERE offer_id=$1", [id],
      );
      expect(count.rows[0].count).toBe("1");
    }
    const publicResponse = await page.goto("/oferta/" + id);
    expect(publicResponse?.status()).toBe(404);
    const filtered = await adminPage.goto("/admin/oferty?status=draft&q=" + encodeURIComponent("QA Admin deleted " + tag));
    expect(filtered?.status()).toBe(200);
    await expect(adminPage.getByText("QA Admin deleted " + tag)).toHaveCount(0);
  });

  test("Partner membership and offer ownership are required; own draft can be deleted", async ({ nonAdminPage }) => {
    test.setTimeout(90_000);
    const id = await insertOffer("QA Partner deleted " + tag);
    const url = "/partner/" + partnerA + "/oferty/" + id;
    const denied = await nonAdminPage.goto(url);
    expect(denied?.status()).toBe(404);

    await database!.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1,$2,'active',false)",
      [partnerA, E2E_NON_ADMIN_USER_ID],
    );
    expect((await nonAdminPage.goto(url))?.status()).toBe(200);
    await nonAdminPage.getByRole("button", { name: pl.draftDeletion.deleteButton, exact: true }).click();
    await nonAdminPage.getByRole("button", { name: pl.draftDeletion.confirm, exact: true }).click();
    await expect(nonAdminPage).toHaveURL("/partner/" + partnerA + "/oferty");
    expect((await getOffer(id)).publication_status).toBe("deleted");
    expect((await nonAdminPage.goto(url))?.status()).toBe(404);
  });

  test("stale view and published-history drafts cannot be deleted", async ({ adminPage }) => {
    const staleId = await insertOffer("QA stale " + tag);
    await adminPage.goto("/admin/oferty/" + staleId);
    await database!.query("UPDATE offers SET updated_at = now() + interval '1 minute' WHERE id=$1", [staleId]);
    await adminPage.getByRole("button", { name: pl.draftDeletion.deleteButton, exact: true }).click();
    await adminPage.getByRole("button", { name: pl.draftDeletion.confirm, exact: true }).click();
    await expect(adminPage.getByRole("alert")).toContainText(pl.draftDeletion.conflict);
    expect((await getOffer(staleId)).publication_status).toBe("draft");

    for (const status of ["published", "archived", "pending_review", "hidden"]) {
      const id = await insertOffer("QA blocked " + status + " " + tag, status);
      expect((await adminPage.goto("/admin/oferty/" + id))?.status()).toBe(200);
      await expect(adminPage.getByRole("button", { name: pl.draftDeletion.deleteButton })).toHaveCount(0);
      expect((await getOffer(id)).publication_status).toBe(status);
    }
    const historyId = await insertOffer("QA historical draft " + tag, "draft", true);
    expect((await adminPage.goto("/admin/oferty/" + historyId))?.status()).toBe(200);
    await expect(adminPage.getByRole("button", { name: pl.draftDeletion.deleteButton })).toHaveCount(0);
    expect((await getOffer(historyId)).publication_status).toBe("draft");
  });
});
