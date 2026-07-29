import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/schema";
import { queryFilteredCategoryOffers } from "../src/lib/catalog/filter-query-core";
import { sql } from "drizzle-orm";
import assert from "node:assert/strict";

async function runDbTests() {
  const connectionString = process.env.LM72_TEST_DATABASE_URL;
  if (!connectionString) {
    console.log("LM72_CATALOG_FILTER_DB_TEST=BLOCKED");
    process.exit(2);
  }

  let url;
  try {
    url = new URL(connectionString);
  } catch (e) {
    console.error("Invalid database URL.");
    process.exit(1);
  }

  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  const isAllowed = process.env.LM72_ALLOW_DISPOSABLE_DB === "1";
  const dbName = url.pathname.slice(1);
  const isTestDb = dbName.startsWith("lm72_test_");

  if (!isLocal || !isAllowed || !isTestDb) {
    console.error("Database guard failed. Refusing to run tests on this database.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  const db = drizzle(client, { schema });

  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    // Fixtures
    const catParentId = 10001;
    const catChildId = 10002;
    const catUnrelatedId = 10003;

    await db.insert(schema.categories).values([
      { id: catParentId, name: "Parent", slug: "parent", parentId: null },
      { id: catChildId, name: "Child", slug: "child", parentId: catParentId },
      { id: catUnrelatedId, name: "Unrelated", slug: "unrelated", parentId: null },
    ]);

    await db.insert(schema.attributeDefinitions).values([
      { id: 101, stableKey: "num", dataType: "number", isActive: true },
      { id: 102, stableKey: "year", dataType: "year", isActive: true },
      { id: 103, stableKey: "en", dataType: "enum", isActive: true },
      { id: 104, stableKey: "men", dataType: "multi_enum", isActive: true },
      { id: 105, stableKey: "bool", dataType: "boolean", isActive: true },
    ]);

    await db.insert(schema.controlledOptionValues).values([
      { id: 201, attributeId: 103, stableKey: "opt1", isActive: true },
      { id: 202, attributeId: 104, stableKey: "opta", isActive: true },
      { id: 203, attributeId: 104, stableKey: "optb", isActive: true },
    ]);

    await db.insert(schema.categoryAttributeAssignments).values([
      { categoryId: catParentId, attributeDefinitionId: 101, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 1 },
      { categoryId: catParentId, attributeDefinitionId: 102, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 2 },
      { categoryId: catParentId, attributeDefinitionId: 103, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 3 },
      { categoryId: catParentId, attributeDefinitionId: 104, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 4 },
      { categoryId: catParentId, attributeDefinitionId: 105, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 5 },
    ]);

    await db.insert(schema.partners).values([
      { id: 301, companyName: "Partner", contactEmail: "test@example.com" }
    ]);

    const baseOffer = {
      partnerId: 301,
      offerModel: "ecommerce" as const,
      publicationStatus: "published",
      isActive: true,
      isFeatured: false,
      description: ""
    };

    const d1 = new Date("2020-01-01T00:00:00Z");
    const d2 = new Date("2020-01-02T00:00:00Z");

    await db.insert(schema.offers).values([
      { id: 401, categoryId: catParentId, title: "O1", priceBrutto: "100", createdAt: d1, ...baseOffer },
      { id: 402, categoryId: catChildId, title: "O2", priceBrutto: "200", createdAt: d1, ...baseOffer },
      { id: 403, categoryId: catUnrelatedId, title: "O3", priceBrutto: "300", createdAt: d1, ...baseOffer },
      { id: 404, categoryId: catParentId, title: "O4 (no attrs)", priceBrutto: "400", createdAt: d1, ...baseOffer },
      { id: 405, categoryId: catParentId, title: "O5 (inactive)", priceBrutto: "500", createdAt: d1, ...baseOffer, isActive: false },
      { id: 406, categoryId: catParentId, title: "O6 (draft)", priceBrutto: "600", createdAt: d1, ...baseOffer, publicationStatus: "draft" },
      { id: 407, categoryId: catParentId, title: "O7", priceBrutto: "100", createdAt: d2, ...baseOffer }, // same price, different date
      { id: 408, categoryId: catParentId, title: "O8", priceBrutto: "150", createdAt: d1, ...baseOffer },
    ] as any);

    // O1
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 401, attributeId: 101, valueNumber: "15" },
      { offerId: 401, attributeId: 102, valueYear: 2022 },
      { offerId: 401, attributeId: 103, optionId: 201 },
      { offerId: 401, attributeId: 105, valueBoolean: true },
    ]);
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 401, attributeId: 104, optionId: 202 }, // OptA
    ]);

    // O2
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 402, attributeId: 101, valueNumber: "25" },
      { offerId: 402, attributeId: 102, valueYear: 2024 },
      { offerId: 402, attributeId: 103, optionId: 201 },
      { offerId: 402, attributeId: 105, valueBoolean: false },
    ]);
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 402, attributeId: 104, optionId: 203 }, // OptB
    ]);

    // O3 (Unrelated)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 403, attributeId: 101, valueNumber: "15" },
    ]);

    // O5 (Inactive)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 405, attributeId: 101, valueNumber: "15" },
    ]);

    // O6 (Draft)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 406, attributeId: 101, valueNumber: "15" },
    ]);

    // O7 (tie-breaker)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 407, attributeId: 101, valueNumber: "15" },
    ]);
    
    // O8 (multi-enum with both)
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 408, attributeId: 104, optionId: 202 },
      { offerId: 408, attributeId: 104, optionId: 203 },
    ]);

    const baseQuery = { categoryId: catParentId, sort: "default" as const, numbers: [], years: [], booleans: [], controlled: [] };
    
    // Assertions
    async function query(input: any) {
      const res = await queryFilteredCategoryOffers(db, input);
      if (!res.ok) throw new Error("Query failed");
      return res;
    }

    // NUMBER_MIN
    let res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 20 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [402]);
    console.log("NUMBER_MIN=PASS");

    // NUMBER_MAX
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, max: 20 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id).sort(), [401, 407]);
    console.log("NUMBER_MAX=PASS");

    // NUMBER_BOUNDARY
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 15, max: 15 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id).sort(), [401, 407]);
    console.log("NUMBER_BOUNDARY=PASS");

    // YEAR_MIN
    res = await query({ ...baseQuery, years: [{ attributeId: 102, min: 2023 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [402]);
    console.log("YEAR_MIN=PASS");

    // YEAR_MAX
    res = await query({ ...baseQuery, years: [{ attributeId: 102, max: 2023 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [401]);
    console.log("YEAR_MAX=PASS");

    // YEAR_BOUNDARY
    res = await query({ ...baseQuery, years: [{ attributeId: 102, min: 2022, max: 2022 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [401]);
    console.log("YEAR_BOUNDARY=PASS");

    // ENUM
    res = await query({ ...baseQuery, controlled: [{ attributeId: 103, optionIds: [201] }] });
    assert.deepEqual(res.rows.map(r => r.offer.id).sort(), [401, 402]);
    console.log("ENUM=PASS");

    // MULTI_ENUM_OR
    res = await query({ ...baseQuery, controlled: [{ attributeId: 104, optionIds: [203] }] });
    assert.deepEqual(res.rows.map(r => r.offer.id).sort(), [402, 408]);
    console.log("MULTI_ENUM_OR=PASS");

    // BOOLEAN_TRUE
    res = await query({ ...baseQuery, booleans: [{ attributeId: 105, value: true }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [401]);
    console.log("BOOLEAN_TRUE=PASS");

    // BOOLEAN_FALSE
    res = await query({ ...baseQuery, booleans: [{ attributeId: 105, value: false }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [402]);
    console.log("BOOLEAN_FALSE=PASS");

    // MISSING_VALUES_EXCLUDED
    // offer 404 has no values, so requesting number=10 will exclude it
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
    assert.ok(!res.rows.map(r => r.offer.id).includes(404));
    console.log("MISSING_VALUES_EXCLUDED=PASS");

    // DESCENDANT_INCLUDED
    // offer 402 is in child category, should be included when querying parent
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 25 }] });
    assert.deepEqual(res.rows.map(r => r.offer.id), [402]);
    console.log("DESCENDANT_INCLUDED=PASS");

    // UNRELATED_CATEGORY_EXCLUDED
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
    assert.ok(!res.rows.map(r => r.offer.id).includes(403));
    console.log("UNRELATED_CATEGORY_EXCLUDED=PASS");

    // INACTIVE_OFFER_EXCLUDED
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
    assert.ok(!res.rows.map(r => r.offer.id).includes(405));
    console.log("INACTIVE_OFFER_EXCLUDED=PASS");

    // UNPUBLISHED_OFFER_EXCLUDED
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 0 }] });
    assert.ok(!res.rows.map(r => r.offer.id).includes(406));
    console.log("UNPUBLISHED_OFFER_EXCLUDED=PASS");

    // COUNT_BEFORE_PAGINATION
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 10, max: 20 }], page: 1, pageSize: 1 });
    assert.equal(res.total, 2); // 401 and 407 match
    console.log("COUNT_BEFORE_PAGINATION=PASS");

    // PAGINATION
    assert.ok(res.total > res.rows.length); // total 2 > length 1
    console.log("PAGINATION=PASS");

    // SORT_AFTER_FILTERING & DETERMINISTIC_TIE_BREAKERS
    res = await query({ ...baseQuery, numbers: [{ attributeId: 101, min: 10, max: 20 }], sort: "price-asc" });
    // Both 401 and 407 have price 100.
    // 407 is newer than 401. So tie-breaker (createdAt DESC) should put 407 first.
    assert.deepEqual(res.rows.map(r => r.offer.id), [407, 401]);
    console.log("SORT_AFTER_FILTERING=PASS");
    console.log("DETERMINISTIC_TIE_BREAKERS=PASS");

  } finally {
    if (transactionStarted) {
      await client.query("ROLLBACK");
    }
    client.release();
    pool.end();
  }
}

runDbTests().catch(e => {
  console.error(e);
  process.exit(1);
});
