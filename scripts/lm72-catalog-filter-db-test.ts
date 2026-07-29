import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/lib/schema";
import { queryFilteredCategoryOffers } from "../src/lib/catalog/filter-query-core";
import { sql } from "drizzle-orm";

async function runDbTests() {
  const connectionString = process.env.LM72_TEST_DATABASE_URL;
  if (!connectionString) {
    console.log("LM72_TEST_DATABASE_URL not set.");
    console.log("LM72_CATALOG_FILTER_DB_TEST=BLOCKED");
    return;
  }
  const url = new URL(connectionString);
  if (url.hostname !== "localhost" && url.hostname !== "127.0.0.1" && url.hostname !== "[::1]") {
    console.error("Test database must be local.");
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  try {
    // Basic test to verify it works (insert dummy data, query, rollback)
    await db.execute(sql`BEGIN`);
    
    // Insert categories
    const catId = 10001;
    const childCatId = 10002;
    await db.insert(schema.categories).values([
      { id: catId, name: "Test Cat", slug: "test-cat", parentId: null },
      { id: childCatId, name: "Child Cat", slug: "child-cat", parentId: catId }
    ]);

    // Insert attributes
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

    // Assign attributes to category
    await db.insert(schema.categoryAttributeAssignments).values([
      { categoryId: catId, attributeDefinitionId: 101, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 1 },
      { categoryId: catId, attributeDefinitionId: 102, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 2 },
      { categoryId: catId, attributeDefinitionId: 103, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 3 },
      { categoryId: catId, attributeDefinitionId: 104, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 4 },
      { categoryId: catId, attributeDefinitionId: 105, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, sortOrder: 5 },
    ]);

    // Insert partner
    await db.insert(schema.partners).values([
      { id: 301, companyName: "Partner", contactEmail: "test@example.com" }
    ]);

    // Insert offers
    await db.insert(schema.offers).values([
      { id: 401, partnerId: 301, categoryId: childCatId, title: "Offer 1", offerModel: "ecommerce", priceBrutto: "100", publicationStatus: "published", isActive: true, isFeatured: true, description: "" },
      { id: 402, partnerId: 301, categoryId: catId, title: "Offer 2", offerModel: "rfq", publicationStatus: "published", isActive: true, isFeatured: false, description: "" },
      { id: 403, partnerId: 301, categoryId: catId, title: "Offer 3", offerModel: "ecommerce", priceBrutto: "150", publicationStatus: "draft", isActive: true, isFeatured: false, description: "" },
    ]);

    // Insert attribute values for Offer 1 (matches all filters)
    await db.insert(schema.offerAttributeValues).values([
      { offerId: 401, attributeId: 101, valueNumber: "15" },
      { offerId: 401, attributeId: 102, valueYear: 2022 },
      { offerId: 401, attributeId: 103, optionId: 201 },
      { offerId: 401, attributeId: 105, valueBoolean: false },
    ]);
    await db.insert(schema.offerAttributeOptionValues).values([
      { offerId: 401, attributeId: 104, optionId: 202 }, // OptA
    ]);

    // Query 1: All filters matching Offer 1
    const res1 = await queryFilteredCategoryOffers(db, {
      categoryId: catId,
      offerModel: "ecommerce",
      featured: true,
      numbers: [{ attributeId: 101, min: 10, max: 20 }],
      years: [{ attributeId: 102, min: 2020, max: 2024 }],
      booleans: [{ attributeId: 105, value: false }],
      controlled: [
        { attributeId: 103, optionIds: [201] },
        { attributeId: 104, optionIds: [202, 203] }
      ],
      sort: "default",
      page: 1,
      pageSize: 10,
    });
    
    if (!res1.ok) throw new Error("Query 1 failed: " + JSON.stringify(res1.errors));
    if (res1.total !== 1 || res1.rows.length !== 1 || res1.rows[0].offer.id !== 401) {
      throw new Error("Query 1 result mismatch");
    }

    console.log("LM72_CATALOG_FILTER_DB_TEST=PASS");
  } finally {
    await db.execute(sql`ROLLBACK`);
    await pool.end();
  }
}

runDbTests().catch(err => {
  console.error(err);
  process.exit(1);
});
