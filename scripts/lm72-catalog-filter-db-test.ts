import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/schema";
import { queryFilteredCategoryOffers } from "../src/lib/catalog/filter-query-core";
import assert from "node:assert/strict";

async function runDbTests() {
  const connectionString = process.env.LM72_TEST_DATABASE_URL;
  if (!connectionString) {
    console.log("LM72_CATALOG_FILTER_DB_TEST=BLOCKED");
    process.exit(2);
  }

  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    console.error("Invalid LM72_TEST_DATABASE_URL.");
    process.exit(1);
  }

  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname === "[::1]";
  const isAllowed = process.env.LM72_ALLOW_DISPOSABLE_DB === "1";
  const dbName = url.pathname.slice(1);
  const isTestDb = dbName.startsWith("lm72_test_");

  if (!isLocal || !isAllowed || !isTestDb) {
    console.error(
      `DB guard failed: isLocal=${isLocal} isAllowed=${isAllowed} isTestDb=${isTestDb} dbName=${dbName}`
    );
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  const db = drizzle(client, { schema });

  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // ─── Fixtures ─────────────────────────────────────────────────────────────

    const catParentId = 10001;
    const catChildId = 10002;
    const catUnrelatedId = 10003;

    await db.insert(schema.categories).values([
      { id: catParentId, name: "Parent", slug: "lm72-parent", parentId: null },
      { id: catChildId, name: "Child", slug: "lm72-child", parentId: catParentId },
      { id: catUnrelatedId, name: "Unrelated", slug: "lm72-unrelated", parentId: null },
    ]);

    await db.insert(schema.attributeDefinitions).values([
      { id: 101, stableKey: "lm72_num", dataType: "number", isActive: true },
      { id: 102, stableKey: "lm72_year", dataType: "year", isActive: true },
      { id: 103, stableKey: "lm72_en", dataType: "enum", isActive: true },
      { id: 104, stableKey: "lm72_men", dataType: "multi_enum", isActive: true },
      { id: 105, stableKey: "lm72_bool", dataType: "boolean", isActive: true },
    ]);

    await db.insert(schema.controlledOptionValues).values([
      { id: 201, attributeId: 103, stableKey: "lm72_opt1", isActive: true },
      { id: 202, attributeId: 104, stableKey: "lm72_opta", isActive: true },
      { id: 203, attributeId: 104, stableKey: "lm72_optb", isActive: true },
    ]);

    await db.insert(schema.categoryAttributeAssignments).values([
      { categoryId: catParentId, attributeDefinitionId: 101, isFilterable: true, isComparable: false, isRequired: false, isVisible: true, sortOrder: 1 },
      { categoryId: catParentId, attributeDefinitionId: 102, isFilterable: true, isComparable: false, isRequired: false, isVisible: true, sortOrder: 2 },
      { categoryId: catParentId, attributeDefinitionId: 103, isFilterable: true, isComparable: false, isRequired: false, isVisible: true, sortOrder: 3 },
      { categoryId: catParentId, attributeDefinitionId: 104, isFilterable: true, isComparable: false, isRequired: false, isVisible: true, sortOrder: 4 },
      { categoryId: catParentId, attributeDefinitionId: 105, isFilterable: true, isComparable: false, isRequired: false, isVisible: true, sortOrder: 5 },
    ]);

    await db.insert(schema.partners).values([
      { id: 301, companyName: "TestPartner", contactEmail: "test@lm72.test" },
    ]);

    const baseOffer = {
      partnerId: 301,
      offerModel: "ecommerce" as const,
      publicationStatus: "published",
      isActive: true,
      isFeatured: false,
      description: "",
    };

    // Timestamps for tie-breaker testing
    const d1 = new Date("2020-01-01T00:00:00Z"); // older
    const d2 = new Date("2020-01-02T00:00:00Z"); // newer
    // d1_twin: same as d1 for final tie-breaker by id
    const d1_twin = new Date("2020-01-01T00:00:00Z");

    await db.insert(schema.offers).values([
      { id: 401, categoryId: catParentId,    title: "O1 parent",    priceBrutto: "100", createdAt: d1, ...baseOffer },
      { id: 402, categoryId: catChildId,     title: "O2 child",     priceBrutto: "200", createdAt: d1, ...baseOffer },
      { id: 403, categoryId: catUnrelatedId, title: "O3 unrelated", priceBrutto: "100", createdAt: d1, ...baseOffer },
      { id: 404, categoryId: catParentId,    title: "O4 no-attrs",  priceBrutto: "400", createdAt: d1, ...baseOffer },
      { id: 405, categoryId: catParentId,    title: "O5 inactive",  priceBrutto: "100", createdAt: d1, ...baseOffer, isActive: false },
      { id: 406, categoryId: catParentId,    title: "O6 draft",     priceBrutto: "100", createdAt: d1, ...baseOffer, publicationStatus: "draft" },
      { id: 407, categoryId: catParentId,    title: "O7 newer",     priceBrutto: "100", createdAt: d2, ...baseOffer }, // same price, newer
      { id: 408, categoryId: catParentId,    title: "O8 multi",     priceBrutto: "150", createdAt: d1, ...baseOffer },
      // O409: same priceBrutto as 401/407, same createdAt as 401, different id (higher → lower priority in tie)
      { id: 409, categoryId: catParentId,    title: "O9 tie",       priceBrutto: "100", createdAt: d1_twin, ...baseOffer },
    ] as any);

    // O401 attributes (parent category)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 401, attributeId: 101, valueNumber: "15" },
      { offerId: 401, attributeId: 102, valueYear: 2022 },
      { offerId: 401, attributeId: 103, optionId: 201 },
      { offerId: 401, attributeId: 105, valueBoolean: true },
    ]);
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 401, attributeId: 104, optionId: 202 }, // opta
    ]);

    // O402 attributes (child category — descendant of parent)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 402, attributeId: 101, valueNumber: "25" },
      { offerId: 402, attributeId: 102, valueYear: 2024 },
      { offerId: 402, attributeId: 103, optionId: 201 },
      { offerId: 402, attributeId: 105, valueBoolean: false },
    ]);
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 402, attributeId: 104, optionId: 203 }, // optb
    ]);

    // O403 (unrelated category — should be excluded)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 403, attributeId: 101, valueNumber: "15" },
    ]);

    // O405 (inactive)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 405, attributeId: 101, valueNumber: "15" },
    ]);

    // O406 (draft)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 406, attributeId: 101, valueNumber: "15" },
    ]);

    // O407 (newer, same price as 401 — for sort tie-breaker)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 407, attributeId: 101, valueNumber: "15" },
    ]);

    // O408 (multi-enum with both opta and optb)
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 408, attributeId: 104, optionId: 202 },
      { offerId: 408, attributeId: 104, optionId: 203 },
    ]);

    // O409 (tie: same price as 401, same createdAt as 401, higher id)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 409, attributeId: 101, valueNumber: "15" },
    ]);

    // ─── Helpers ──────────────────────────────────────────────────────────────

    const baseQuery = {
      categoryId: catParentId,
      sort: "default" as const,
      numbers: [],
      years: [],
      booleans: [],
      controlled: [],
    };

    async function q(input: Parameters<typeof queryFilteredCategoryOffers>[1]) {
      const res = await queryFilteredCategoryOffers(db, input);
      if (!res.ok) throw new Error("Query failed: " + JSON.stringify((res as any).errors));
      return res;
    }

    // ─── Tests ────────────────────────────────────────────────────────────────

    // NUMBER_MIN: only offers with valueNumber >= 20
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 20 }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [402], "NUMBER_MIN");
    }
    console.log("NUMBER_MIN=PASS");

    // NUMBER_MAX: only offers with valueNumber <= 20
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, max: 20 }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      // 401, 407, 409 all have valueNumber=15
      assert.ok(ids.includes(401) && ids.includes(407) && ids.includes(409), "NUMBER_MAX ids");
      assert.ok(!ids.includes(402), "NUMBER_MAX excludes 402");
    }
    console.log("NUMBER_MAX=PASS");

    // NUMBER_BOUNDARY: inclusive boundary at exactly 15
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 15, max: 15 }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.ok(ids.includes(401) && ids.includes(407) && ids.includes(409), "NUMBER_BOUNDARY ids");
      assert.ok(!ids.includes(402), "NUMBER_BOUNDARY excludes 402");
    }
    console.log("NUMBER_BOUNDARY=PASS");

    // YEAR_MIN: only offers with valueYear >= 2023
    {
      const res = await q({ ...baseQuery, years: [{ attributeId: 102, min: 2023 }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [402], "YEAR_MIN");
    }
    console.log("YEAR_MIN=PASS");

    // YEAR_MAX: only offers with valueYear <= 2023
    {
      const res = await q({ ...baseQuery, years: [{ attributeId: 102, max: 2023 }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [401], "YEAR_MAX");
    }
    console.log("YEAR_MAX=PASS");

    // YEAR_BOUNDARY: exact year 2022
    {
      const res = await q({ ...baseQuery, years: [{ attributeId: 102, min: 2022, max: 2022 }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [401], "YEAR_BOUNDARY");
    }
    console.log("YEAR_BOUNDARY=PASS");

    // ENUM: both offers with optionId 201 (401, 402)
    {
      const res = await q({ ...baseQuery, controlled: [{ attributeId: 103, optionIds: [201] }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [401, 402], "ENUM");
    }
    console.log("ENUM=PASS");

    // MULTI_ENUM_OR: offers with optionId 203 (optb) — 402 and 408
    {
      const res = await q({ ...baseQuery, controlled: [{ attributeId: 104, optionIds: [203] }] });
      const ids = res.rows.map((r) => r.offer.id).sort((a, b) => a - b);
      assert.deepEqual(ids, [402, 408], "MULTI_ENUM_OR");
    }
    console.log("MULTI_ENUM_OR=PASS");

    // BOOLEAN_TRUE: only offers with valueBoolean=true (401)
    {
      const res = await q({ ...baseQuery, booleans: [{ attributeId: 105, value: true }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.deepEqual(ids, [401], "BOOLEAN_TRUE");
    }
    console.log("BOOLEAN_TRUE=PASS");

    // BOOLEAN_FALSE: only offers with valueBoolean=false (402)
    {
      const res = await q({ ...baseQuery, booleans: [{ attributeId: 105, value: false }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.deepEqual(ids, [402], "BOOLEAN_FALSE");
    }
    console.log("BOOLEAN_FALSE=PASS");

    // MISSING_VALUES_EXCLUDED: offer 404 has no attribute values, should not appear when filtering
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.ok(!ids.includes(404), "MISSING_VALUES_EXCLUDED: 404 absent");
    }
    console.log("MISSING_VALUES_EXCLUDED=PASS");

    // DESCENDANT_INCLUDED: offer 402 in child category, included when querying parent
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 25 }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.ok(ids.includes(402), "DESCENDANT_INCLUDED: 402 present");
    }
    console.log("DESCENDANT_INCLUDED=PASS");

    // UNRELATED_CATEGORY_EXCLUDED: offer 403 in unrelated category excluded
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.ok(!ids.includes(403), "UNRELATED_CATEGORY_EXCLUDED: 403 absent");
    }
    console.log("UNRELATED_CATEGORY_EXCLUDED=PASS");

    // INACTIVE_OFFER_EXCLUDED: offer 405 is inactive
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.ok(!ids.includes(405), "INACTIVE_OFFER_EXCLUDED: 405 absent");
    }
    console.log("INACTIVE_OFFER_EXCLUDED=PASS");

    // UNPUBLISHED_OFFER_EXCLUDED: offer 406 is draft
    {
      const res = await q({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
      const ids = res.rows.map((r) => r.offer.id);
      assert.ok(!ids.includes(406), "UNPUBLISHED_OFFER_EXCLUDED: 406 absent");
    }
    console.log("UNPUBLISHED_OFFER_EXCLUDED=PASS");

    // COUNT_BEFORE_PAGINATION: total > page length
    {
      // 401, 407, 409 all match num=15. With pageSize=2, total=3, rows=2
      const res = await q({
        ...baseQuery,
        numbers: [{ attributeId: 101, min: 15, max: 15 }],
        page: 1,
        pageSize: 2,
      });
      assert.equal(res.total, 3, "COUNT_BEFORE_PAGINATION: total=3");
      assert.equal(res.rows.length, 2, "COUNT_BEFORE_PAGINATION: rows.length=2");
    }
    console.log("COUNT_BEFORE_PAGINATION=PASS");

    // PAGINATION: different pages give different rows
    {
      const res = await q({
        ...baseQuery,
        numbers: [{ attributeId: 101, min: 15, max: 15 }],
        page: 1,
        pageSize: 2,
      });
      assert.ok(res.total > res.rows.length, "PAGINATION: total > page rows");
    }
    console.log("PAGINATION=PASS");

    // SORT_AFTER_FILTERING + DETERMINISTIC_TIE_BREAKERS
    // Offers 401, 407, 409 all have priceBrutto=100:
    //   407: createdAt=d2 (2020-01-02) → newest → first in price-asc (newest wins createdAt DESC)
    //   401: createdAt=d1 (2020-01-01), id=401
    //   409: createdAt=d1_twin (2020-01-01), id=409
    // At equal createdAt: id DESC → 409 (higher id) before 401
    // Expected order price-asc: [407, 409, 401]
    {
      const res = await q({
        ...baseQuery,
        numbers: [{ attributeId: 101, min: 15, max: 15 }],
        sort: "price-asc",
      });
      const ids = res.rows.map((r) => r.offer.id);
      // Assert final order
      assert.deepEqual(ids, [407, 409, 401], "SORT+TIE_BREAKERS order");
      // Assert last id is 401 (lowest priority in ties)
      assert.equal(ids[ids.length - 1], 401, "DETERMINISTIC_TIE_BREAKERS: last=401");
    }
    console.log("SORT_AFTER_FILTERING=PASS");
    console.log("DETERMINISTIC_TIE_BREAKERS=PASS");

    console.log("LM72_CATALOG_FILTER_DB_TEST=PASS");
  } finally {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    client.release();
    await pool.end();
  }
}

runDbTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
