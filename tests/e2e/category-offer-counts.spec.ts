import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";

test.describe("Published category count aggregation on homepage and catalog", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  const tag = randomUUID().slice(0, 8);
  const nodes = [
    { slug: "qa-count-root-" + tag, name: "QA Count Root " + tag, parent: -1 },
    { slug: "qa-count-group-" + tag, name: "QA Count Group " + tag, parent: 0 },
    { slug: "qa-count-leaf-a-" + tag, name: "QA Count Leaf A " + tag, parent: 1 },
    { slug: "qa-count-leaf-b-" + tag, name: "QA Count Leaf B " + tag, parent: 1 },
    { slug: "qa-count-empty-" + tag, name: "QA Count Empty " + tag, parent: -1 },
  ];
  const ids: number[] = [];
  const offerIds: number[] = [];
  let db: Pool | null = null;
  let partnerId = 0;

  test.beforeAll(async () => {
    db = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const partner = await db.query<{ id: string }>(
      "INSERT INTO partners (company_name, contact_email) VALUES ($1,$2) RETURNING id",
      ["QA category counter " + tag, "qa-count-" + tag + "@example.invalid"],
    );
    partnerId = Number(partner.rows[0].id);
    for (const node of nodes) {
      const parentId = node.parent < 0 ? null : ids[node.parent];
      const row = await db.query<{ id: string }>(
        "INSERT INTO categories (name, slug, parent_id) VALUES ($1,$2,$3) RETURNING id",
        [node.name, node.slug, parentId],
      );
      ids.push(Number(row.rows[0].id));
    }
    // Five active published offers: one root, one group, two leaf A, one leaf B.
    // Draft and inactive-published offers are excluded by the bulk SQL predicate.
    for (const [categoryIndex, status, active] of [
      [0, "published", true], [1, "published", true],
      [2, "published", true], [2, "published", true],
      [3, "published", true], [2, "draft", true],
      [3, "published", false],
    ] as const) {
      const row = await db.query<{ id: string }>(
        "INSERT INTO offers (partner_id, category_id, title, offer_model, conversion_type, publication_status, is_active, published_at) VALUES ($1,$2,$3,'rfq','inbound',$4,$5,$6) RETURNING id",
        [partnerId, ids[categoryIndex], "QA counted offer " + tag, status, active, status === "published" ? new Date() : null],
      );
      offerIds.push(Number(row.rows[0].id));
    }
  });

  test.afterAll(async () => {
    if (!db) return;
    try {
      if (offerIds.length) await db.query("DELETE FROM offers WHERE id = ANY($1::bigint[])", [offerIds]);
      for (const id of [...ids].reverse()) await db.query("DELETE FROM categories WHERE id=$1", [id]);
      if (partnerId) await db.query("DELETE FROM partners WHERE id=$1", [partnerId]);
    } finally {
      await db.end();
    }
  });

  test("tiles, index, groups and leaves show exact public totals in seven locales", async ({ page }) => {
    test.setTimeout(180_000);
    for (const locale of ["pl", "en", "de", "fr", "es", "uk", "zh"]) {
      const prefix = locale === "pl" ? "" : "/" + locale;
      const labels = JSON.parse(readFileSync(join(process.cwd(), "src", "messages", locale + ".json"), "utf8")).catalog;
      const count = (value: number) => value + " " + (value === 1 ? labels.offerCountOne : labels.offerCountOther);
      expect((await page.goto(prefix + "/"))?.status()).toBe(200);
      await expect(page.getByTestId("home-category-offer-count-" + ids[0])).toHaveText(count(5));
      await expect(page.getByTestId("home-category-offer-count-" + ids[4])).toHaveText(count(0));

      expect((await page.goto(prefix + "/katalog"))?.status()).toBe(200);
      await expect(page.getByTestId("catalog-index-offer-count-" + ids[0])).toHaveText(count(5));
      await expect(page.getByTestId("catalog-index-offer-count-" + ids[4])).toHaveText(count(0));
      await expect(page.getByTestId("catalog-directory-group-offer-count-" + ids[1])).toHaveText(count(4));
      await expect(page.getByTestId("catalog-directory-category-offer-count-" + ids[2])).toHaveText(count(2));
      await expect(page.getByTestId("catalog-directory-category-offer-count-" + ids[3])).toHaveText(count(1));
    }
  });
});
