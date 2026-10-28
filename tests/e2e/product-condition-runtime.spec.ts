import { createHash, randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { test, E2E_NON_ADMIN_USER_ID } from "./fixtures/auth";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";
import pl from "../../src/messages/pl.json";

test.describe("Product condition: Admin and Partner -> DB -> public catalog", () => {
  test.describe.configure({ mode: "serial", retries: 0 });

  const tag = "qa-condition-" + randomUUID().slice(0, 8);
  const categoryName = "QA Product Condition " + tag;
  const titles = {
    admin: "QA Admin condition " + tag,
    partner: "QA Partner refurbished " + tag,
    unspecified: "QA Partner NULL " + tag,
    new: "QA New published " + tag,
  };
  let db: Pool | null = null;
  let partnerA = 0;
  let partnerB = 0;
  let categoryId = 0;
  const offerIds: number[] = [];
  const auditSuffix = randomUUID().replace(/-/g, "");
  const auditTable = `qa_condition_audit_${auditSuffix}`;
  const auditFunction = `qa_condition_fn_${auditSuffix}`;
  const auditTrigger = `qa_condition_trigger_${auditSuffix}`;
  let auditSetupStarted = false;

  const stored = async (id: number) => {
    const result = await db!.query<{ product_condition: string | null; publication_status: string; partner_id: string }>(
      "SELECT product_condition, publication_status, partner_id::text FROM offers WHERE id = $1",
      [id],
    );
    expect(result.rows).toHaveLength(1);
    return result.rows[0];
  };

  const createDraft = async (page: Page, path: string, title: string, condition: string, admin: boolean) => {
    expect((await page.goto(path))?.status()).toBe(200);
    if (admin) await page.locator("#partnerId").selectOption(String(partnerA));
    await page.locator('input[name="adminOfferType"][value="rfq"]').check({ force: true });
    await page.getByRole("textbox", { name: pl.adminOffers.createCategorySearchAriaLabel }).fill(categoryName);
    await page.getByRole("button", { name: new RegExp(categoryName) }).click();
    await expect(page.locator('input[name="categoryId"]')).toHaveValue(String(categoryId));
    await page.locator("#productCondition").selectOption(condition);
    await page.locator("#title").fill(title);
    await page.getByRole("button", { name: pl.adminOffers.createSave, exact: true }).click();
    const expectedPath = admin
      ? /\/admin\/oferty\/([0-9]+)\/edytuj$/
      : new RegExp("/partner/" + partnerA + "/oferty/([0-9]+)/edytuj$");
    await expect(page).toHaveURL(expectedPath);
    const match = new URL(page.url()).pathname.match(expectedPath);
    expect(match).not.toBeNull();
    const id = Number(match![1]);
    offerIds.push(id);
    return id;
  };

  test.beforeAll(async () => {
    // Fail closed unless this is the CI-controlled disposable loopback PostgreSQL.
    db = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const p = await db.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1,$2),($3,$4) RETURNING id",
      ["Condition Partner A " + tag, "condition-a-" + tag + "@example.invalid",
        "Condition Partner B " + tag, "condition-b-" + tag + "@example.invalid"],
    );
    [partnerA, partnerB] = p.rows.map(row => Number(row.id));
    const c = await db.query<{ id: string }>(
      "INSERT INTO categories (name, slug) VALUES ($1,$2) RETURNING id",
      [categoryName, tag],
    );
    categoryId = Number(c.rows[0].id);
    await db.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1,$2,'active',false)",
      [partnerB, E2E_NON_ADMIN_USER_ID],
    );
  });

  test.afterAll(async () => {
    if (!db) return;
    try {
      if (auditSetupStarted) {
        await db.query(`DROP TRIGGER IF EXISTS ${auditTrigger} ON public.offers`);
        await db.query(`DROP FUNCTION IF EXISTS public.${auditFunction}()`);
        await db.query(`DROP TABLE IF EXISTS public.${auditTable}`);
      }
      if (offerIds.length) {
        await db.query("DELETE FROM offers WHERE id = ANY($1::bigint[])", [offerIds]);
      }
      if (partnerA && partnerB) {
        await db.query("DELETE FROM partner_user_memberships WHERE partner_id IN ($1,$2)", [partnerA, partnerB]);
      }
      if (categoryId) await db.query("DELETE FROM categories WHERE id = $1", [categoryId]);
      if (partnerA && partnerB) await db.query("DELETE FROM partners WHERE id IN ($1,$2)", [partnerA, partnerB]);
    } finally {
      await db.end();
    }
  });

  test("creates and edits real drafts, rejects forged conditions, respects tenant access and filters published fixtures", async ({
    adminPage, nonAdminPage, page,
  }) => {
    test.setTimeout(180_000);
    if (!db) throw new Error("Disposable E2E database unavailable");

    const assertAdminDetailCondition = async (id: number, expectedLabel: string) => {
      expect((await adminPage.goto("/admin/oferty/" + id))?.status()).toBe(200);
      const identity = adminPage.locator("section").filter({
        has: adminPage.getByRole("heading", { name: pl.adminOfferDetail.sectionIdentity, exact: true }),
      });
      await expect(identity.getByText(pl.adminOfferEdit.productConditionLabel, { exact: true })).toBeVisible();
      await expect(identity.getByText(expectedLabel, { exact: true })).toBeVisible();
    };

    // Create via the authenticated Admin Server Action (not via fixture INSERT).
    const adminId = await createDraft(adminPage, "/admin/oferty/nowa", titles.admin, "new", true);
    expect((await stored(adminId)).product_condition).toBe("new");
    expect((await stored(adminId)).publication_status).toBe("draft");
    await assertAdminDetailCondition(adminId, pl.adminOfferEdit.productConditionNew);
    expect((await page.goto("/oferta/" + adminId))?.status()).toBe(404);

    const ownEdit = "/partner/" + partnerA + "/oferty/" + adminId + "/edytuj";
    const foreignEdit = "/partner/" + partnerB + "/oferty/" + adminId + "/edytuj";
    // Membership in B is not authorization to edit an offer belonging to A.
    expect((await nonAdminPage.goto(ownEdit))?.status()).toBe(404);
    expect((await nonAdminPage.goto(foreignEdit))?.status()).toBe(404);
    await db.query(
      "INSERT INTO partner_user_memberships (partner_id, auth_user_id, membership_status, can_accept_orders) VALUES ($1,$2,'active',false)",
      [partnerA, E2E_NON_ADMIN_USER_ID],
    );
    expect((await nonAdminPage.goto(ownEdit))?.status()).toBe(200);
    await expect(nonAdminPage.locator("#productCondition")).toHaveValue("new");

    // UI tampering must be rejected by the server and leave the persisted state unchanged.
    await nonAdminPage.locator("#productCondition").evaluate(element => {
      const select = element as HTMLSelectElement;
      const option = document.createElement("option");
      option.value = "invalid-state";
      option.textContent = "Invalid state";
      select.add(option);
      select.value = option.value;
    });
    const partnerSave = () => nonAdminPage.locator("form").filter({
      has: nonAdminPage.locator("#productCondition"),
    }).locator('button[type="submit"]');
    await partnerSave().click();
    await expect(nonAdminPage.getByText(pl.PartnerWorkspace.offerEditErrorSystem)).toBeVisible();
    expect((await stored(adminId)).product_condition).toBe("new");

    await nonAdminPage.locator("#productCondition").selectOption("used");
    await partnerSave().click();
    await expect(nonAdminPage).toHaveURL("/partner/" + partnerA + "/oferty/" + adminId);
    expect((await stored(adminId)).product_condition).toBe("used");
    expect((await stored(adminId)).publication_status).toBe("draft");
    await assertAdminDetailCondition(adminId, pl.adminOfferEdit.productConditionUsed);
    expect((await nonAdminPage.goto(foreignEdit))?.status()).toBe(404);

    // Partner create action persists refurbished, and Admin edit can clear/reassign to the same draft.
    const partnerId = await createDraft(
      nonAdminPage, "/partner/" + partnerA + "/oferty/nowa", titles.partner, "refurbished", false,
    );
    expect((await stored(partnerId)).product_condition).toBe("refurbished");
    expect((await stored(partnerId)).publication_status).toBe("draft");
    await assertAdminDetailCondition(partnerId, pl.adminOfferEdit.productConditionRefurbished);
    const adminEdit = "/admin/oferty/" + partnerId + "/edytuj";
    expect((await adminPage.goto(adminEdit))?.status()).toBe(200);
    await adminPage.locator("#productCondition").selectOption("");
    const adminForm = adminPage.locator("form").filter({ has: adminPage.locator("#productCondition") });
    const invalidControls = await adminForm.evaluate(form =>
      Array.from(form.querySelectorAll("input, select, textarea"))
        .filter(element => element instanceof HTMLInputElement ||
          element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
        .filter(element => !element.checkValidity())
        .map(element => ({ name: element.name, type: element.type, message: element.validationMessage })),
    );
    expect(invalidControls, "Admin form must be natively valid before saving condition=NULL").toEqual([]);

    // Disposable E2E DB only: count committed UPDATEs for this exact offer.
    // Never execute fixture DDL against shared or production databases.
    requireIsolatedE2EDatabaseUrl();
    auditSetupStarted = true;
    await db.query(`CREATE TABLE public.${auditTable} (offer_id bigint NOT NULL)`);
    await db.query(`CREATE FUNCTION public.${auditFunction}() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN INSERT INTO public.${auditTable} (offer_id) VALUES (NEW.id); RETURN NEW; END $$`);
    await db.query(`CREATE TRIGGER ${auditTrigger} AFTER UPDATE ON public.offers
      FOR EACH ROW WHEN (NEW.id = ${partnerId}) EXECUTE FUNCTION public.${auditFunction}()`);

    const postStatuses: number[] = [];
    const postEvidence: Array<{
      path: string; status: number; resourceType: string; navigation: boolean;
      actionFingerprint: string | null; hasRscHeader: boolean; contentType: string;
    }> = [];
    const trackPost = (response: import("@playwright/test").Response) => {
      const request = response.request();
      if (request.method() !== "POST") return;
      postStatuses.push(response.status());
      const headers = request.headers();
      postEvidence.push({
        path: new URL(request.url()).pathname.split("/").map(segment => /^\d+$/.test(segment) ? ":id" : segment).join("/"),
        status: response.status(),
        resourceType: request.resourceType(),
        navigation: request.isNavigationRequest(),
        actionFingerprint: headers["next-action"]
          ? createHash("sha256").update(headers["next-action"]).digest("hex").slice(0, 12)
          : null,
        hasRscHeader: "rsc" in headers,
        contentType: (headers["content-type"] ?? "").split(";")[0],
      });
    };
    adminPage.on("response", trackPost);
    try {
      await adminForm.locator('button[type="submit"]').click();
      await expect(adminPage.getByText(pl.adminOfferEdit.successUpdated)).toBeVisible({ timeout: 10_000 });
    } catch (error) {
      const evidence = {
        dbCondition: (await stored(partnerId)).product_condition,
        selectedCondition: await adminPage.locator("#productCondition").inputValue().catch(() => "<unavailable>"),
        postStatuses,
        conflictVisible: await adminPage.getByText(pl.adminOfferEdit.conflictTitle).isVisible().catch(() => false),
        unchangedVisible: await adminPage.getByText(pl.adminOfferEdit.successUnchanged).isVisible().catch(() => false),
        errorMessages: await adminPage.locator("form .border-red-200").allTextContents(),
      };
      throw new Error("Admin condition=NULL save diagnostic: " + JSON.stringify(evidence), { cause: error });
    } finally {
      adminPage.off("response", trackPost);
    }
    const writeResult = await db.query<{ writes: string }>(
      `SELECT COUNT(*)::text AS writes FROM public.${auditTable} WHERE offer_id = $1`, [partnerId],
    );
    const committedUpdateCount = Number(writeResult.rows[0].writes);
    const conditionAfterSave = (await stored(partnerId)).product_condition;
    // Sanitized diagnostic: no URL query, raw action IDs, headers, cookies, tokens or payloads.
    console.info("LM_PR38_SAFE_POST_DIAGNOSTIC=" + JSON.stringify({
      postEvidence, committedUpdateCount, conditionAfterSave,
    }));
    expect(committedUpdateCount, "Exactly one committed offer UPDATE during Admin save").toBe(1);
    expect(conditionAfterSave).toBeNull();
    expect(postStatuses).toEqual([200]);
    await expect(adminPage.getByRole("status").getByText(pl.adminOfferEdit.successUpdated)).toBeVisible();
    await expect(adminPage.locator("#productCondition")).toHaveCount(0);
    await assertAdminDetailCondition(partnerId, pl.adminOfferEdit.productConditionUnspecified);
    await adminPage.goto(adminEdit);
    await expect(adminPage.locator("#productCondition")).toHaveValue("");
    await adminPage.locator("#productCondition").selectOption("refurbished");
    await adminPage.locator("form").filter({ has: adminPage.locator("#productCondition") })
      .locator('button[type="submit"]').click();
    await expect(adminPage.getByText(pl.adminOfferEdit.successUpdated)).toBeVisible();
    expect((await stored(partnerId)).product_condition).toBe("refurbished");

    // A fresh edit reads the persisted version; an unchanged save is not an update.
    await adminPage.goto(adminEdit);
    await expect(adminPage.locator("#productCondition")).toHaveValue("refurbished");
    const adminSave = () => adminPage.locator("form").filter({ has: adminPage.locator("#productCondition") })
      .locator('button[type="submit"]');
    await adminSave().click();
    await expect(adminPage.getByText(pl.adminOfferEdit.successUnchanged)).toBeVisible();
    await expect(adminPage.getByText(pl.adminOfferEdit.successUpdated)).toHaveCount(0);
    expect((await stored(partnerId)).product_condition).toBe("refurbished");

    // Concurrent fixture mutation must surface a conflict, never a success receipt.
    await adminPage.goto(adminEdit);
    await expect(adminPage.locator("#productCondition")).toHaveValue("refurbished");
    await db.query("UPDATE offers SET updated_at=clock_timestamp() + interval '1 second' WHERE id=$1", [partnerId]);
    await adminPage.locator("#productCondition").selectOption("used");
    await adminSave().click();
    await expect(adminPage.getByText(pl.adminOfferEdit.conflictTitle)).toBeVisible();
    await expect(adminPage.getByText(pl.adminOfferEdit.successUpdated)).toHaveCount(0);
    await expect(adminPage.getByText(pl.adminOfferEdit.successUnchanged)).toHaveCount(0);
    expect((await stored(partnerId)).product_condition).toBe("refurbished");

    await adminPage.getByRole("button", { name: pl.adminOfferEdit.conflictReload }).click();
    await expect(adminPage.getByText(pl.adminOfferEdit.conflictTitle)).toHaveCount(0);
    await adminPage.locator("#productCondition").evaluate(element => {
      const select = element as HTMLSelectElement;
      const option = document.createElement("option");
      option.value = "invalid-admin-state";
      option.textContent = "Invalid Admin state";
      select.add(option);
      select.value = option.value;
    });
    await adminSave().click();
    await expect(adminPage.getByText(pl.adminOfferEdit.errors.OFFER_INVALID_INPUT, { exact: true })).toBeVisible();
    await expect(adminPage.getByText(pl.adminOfferEdit.successUpdated)).toHaveCount(0);
    await expect(adminPage.getByText(pl.adminOfferEdit.successUnchanged)).toHaveCount(0);
    expect((await stored(partnerId)).product_condition).toBe("refurbished");

    // An interrupted Server Action must unlock the form and must not claim a DB write.
    await adminPage.locator("#productCondition").selectOption("used");
    const saveUrl = new URL(adminEdit, adminPage.url()).toString();
    await adminPage.route(saveUrl, async route => {
      if (route.request().method() === "POST") await route.abort("failed");
      else await route.continue();
    });
    try {
      await adminSave().click();
      await expect(adminPage.getByText(pl.adminOfferEdit.errors.SYSTEM_ERROR, { exact: true })).toBeVisible();
      await expect(adminSave()).toBeEnabled();
      await expect(adminPage.getByText(pl.adminOfferEdit.successUpdated)).toHaveCount(0);
      await expect(adminPage.getByText(pl.adminOfferEdit.successUnchanged)).toHaveCount(0);
      expect((await stored(partnerId)).product_condition).toBe("refurbished");
    } finally {
      await adminPage.unroute(saveUrl);
    }

    // No implicit 'new' default for an unclassified offer created through Partner UI.
    const unspecifiedId = await createDraft(
      nonAdminPage, "/partner/" + partnerA + "/oferty/nowa", titles.unspecified, "", false,
    );
    expect((await stored(unspecifiedId)).product_condition).toBeNull();
    expect((await page.goto("/oferta/" + unspecifiedId))?.status()).toBe(404);

    // Fixture-only publication transition: does NOT exercise Admin moderation/publishing.
    await db.query(
      "UPDATE offers SET publication_status='published', is_active=true, published_at=now() WHERE id = ANY($1::bigint[])",
      [[adminId, partnerId, unspecifiedId]],
    );
    const publishedNew = await db.query<{ id: string }>(
      "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, publication_status, is_active, published_at, product_condition) VALUES ($1,$2,$3,'rfq','inbound','published',true,now(),'new') RETURNING id",
      [partnerA, categoryId, titles.new],
    );
    const newId = Number(publishedNew.rows[0].id);
    offerIds.push(newId);
    // 24 more 'used' fixtures + the Admin/Partner-created used offer = 25, triggering real pagination.
    const extraUsed = await db.query<{ id: string }>(
      "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, publication_status, is_active, published_at, product_condition) SELECT $1,$2,$3 || ' ' || n::text,'rfq','inbound','published',true,now(),'used' FROM generate_series(1,24) AS n RETURNING id",
      [partnerA, categoryId, "QA Used fixture " + tag],
    );
    offerIds.push(...extraUsed.rows.map(row => Number(row.id)));

    const categoryPath = "/katalog/c-" + tag;
    expect((await page.goto(categoryPath + "?condition=new"))?.status()).toBe(200);
    const articles = page.locator('section[aria-labelledby="category-offers-heading"] article');
    await expect(articles).toHaveCount(1);
    await expect(articles.filter({ hasText: titles.new })).toBeVisible();
    await expect(articles.getByText(pl.offers.productConditionNew, { exact: true })).toBeVisible();

    await page.getByRole("link", { name: pl.catalog.productConditionRefurbished, exact: true }).first().click();
    await expect(page).toHaveURL(/condition=refurbished/);
    await expect(articles).toHaveCount(1);
    await expect(articles.filter({ hasText: titles.partner })).toBeVisible();
    await expect(articles.getByText(pl.offers.productConditionRefurbished, { exact: true })).toBeVisible();

    // NULL retains public visibility with no misleading condition badge.
    expect((await page.goto("/oferta/" + unspecifiedId))?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: titles.unspecified, level: 1 })).toBeVisible();
    for (const label of [pl.offers.productConditionNew, pl.offers.productConditionUsed, pl.offers.productConditionRefurbished]) {
      await expect(page.locator("main span").getByText(label, { exact: true })).toHaveCount(0);
    }
    expect((await page.goto("/oferta/" + adminId))?.status()).toBe(200);
    await expect(page.locator("main span").getByText(pl.offers.productConditionUsed, { exact: true })).toBeVisible();

    // Filtered SQL results, view toggle, sort submission and page 2 preserve the condition.
    expect((await page.goto(categoryPath + "?condition=used"))?.status()).toBe(200);
    await expect(articles).toHaveCount(24);
    await page.getByRole("navigation", { name: pl.offers.viewSwitcherAria })
      .getByRole("link", { name: pl.offers.listView }).click();
    await expect(page).toHaveURL(/view=list/);
    await expect(page).toHaveURL(/condition=used/);
    await page.locator("#catalog-offer-sort").selectOption("newest");
    await page.locator("form").filter({ has: page.locator("#catalog-offer-sort") })
      .locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/sort=newest/);
    await expect(page).toHaveURL(/condition=used/);
    await page.getByRole("navigation", { name: pl.catalog.paginationLabel })
      .getByRole("link", { name: pl.catalog.paginationNext }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL(/condition=used/);
    await expect(articles).toHaveCount(1);
    await page.getByRole("link", { name: pl.catalog.filtersClearAll }).click();
    await expect(page).not.toHaveURL(/condition=/);
    await expect(page).toHaveURL(/view=list/);
    await expect(page).toHaveURL(/sort=newest/);
  });
});
