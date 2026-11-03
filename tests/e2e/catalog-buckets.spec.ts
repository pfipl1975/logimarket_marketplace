import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../scripts/e2e/buyer-trust-fixtures";

const slugs = [
  "maszyny-i-urzadzenia",
  "osprzet-do-maszyn-budowlanych",
  "lyzki-do-koparek",
  "lyzki-do-ladowarek",
  "lyzki-skarpowe-i-profilujace",
] as const;

const stagedSql = (name: "apply" | "verify" | "rollback") =>
  readFileSync(join(process.cwd(), "scripts/sql/production",
    "lm-catalog-buckets-01-" + name + ".sql"), "utf8");

test.describe("Seventh catalog section, machinery and excavator/loader buckets", () => {
  test.describe.configure({ mode: "serial", retries: 0 });
  let db: Pool | null = null;
  let applied = false;
  const ids = new Map<string, number>();

  test.beforeAll(async () => {
    // Explicit disposable database guard; never use shared or production database.
    db = new Pool({ connectionString: requireIsolatedE2EDatabaseUrl() });
    const conflicts = await db.query<{ slug: string }>(
      "SELECT slug FROM public.categories WHERE slug = ANY($1::text[])", [[...slugs]]);
    if (conflicts.rowCount !== 0) {
      throw new Error("BLOCKED_EXISTING_CATALOG_BUCKET_FIXTURE");
    }
    await db.query(stagedSql("apply"));
    applied = true;
    // An identical re-apply must be a no-op with stable category identifiers.
    await db.query(stagedSql("apply"));
    await db.query(stagedSql("verify"));
    const rows = await db.query<{ id: string; slug: string; parent_id: string | null }>(
      "SELECT id, slug, parent_id FROM public.categories WHERE slug = ANY($1::text[])", [[...slugs]]);
    expect(rows.rowCount).toBe(5);
    for (const row of rows.rows) ids.set(row.slug, Number(row.id));
    expect(rows.rows.find(row => row.slug === slugs[0])?.parent_id).toBe(null);
    expect(Number(rows.rows.find(row => row.slug === slugs[1])?.parent_id)).toBe(ids.get(slugs[0]));
    for (const leaf of slugs.slice(2)) {
      expect(Number(rows.rows.find(row => row.slug === leaf)?.parent_id)).toBe(ids.get(slugs[1]));
    }
  });

  test.afterAll(async () => {
    if (!db) return;
    try {
      if (applied) {
        await db.query(stagedSql("rollback"));
        const left = await db.query(
          "SELECT count(*)::int AS count FROM public.categories WHERE slug = ANY($1::text[])", [[...slugs]]);
        expect(left.rows[0].count).toBe(0);
      }
    } finally {
      await db.end();
    }
  });

  test("homepage tiles, catalog hierarchy and category route work in all seven locales", async ({ page }) => {
    test.setTimeout(180_000);
    for (const locale of ["pl", "en", "de", "fr", "es", "uk", "zh"]) {
      const prefix = locale === "pl" ? "" : "/" + locale;
      const dict = JSON.parse(readFileSync(
        join(process.cwd(), "src/messages", locale + ".json"), "utf8"));
      const rootName = dict.categories.bySlug[slugs[0]];
      const count = "0 " + dict.catalog.offerCountOther;

      expect((await page.goto(prefix + "/"))?.status()).toBe(200);
      await expect(page.locator("main").getByRole("heading", { name: rootName, exact: true })).toBeVisible();
      await expect(page.getByTestId("home-category-offer-count-" + ids.get(slugs[0]))).toHaveText(count);

      expect((await page.goto(prefix + "/katalog"))?.status()).toBe(200);
      await expect(page.getByTestId("catalog-index-offer-count-" + ids.get(slugs[0]))).toHaveText(count);
      await expect(page.getByTestId("catalog-directory-group-offer-count-" + ids.get(slugs[1]))).toHaveText(count);
      for (const leaf of slugs.slice(2)) {
        await expect(page.getByTestId("catalog-directory-category-offer-count-" + ids.get(leaf))).toHaveText(count);
      }
    }
    expect((await page.goto("/katalog/c-lyzki-do-koparek"))?.status()).toBe(200);
    await expect(page.locator("main").getByText("Łyżki do koparek", { exact: true }).first()).toBeVisible();
  });
});
