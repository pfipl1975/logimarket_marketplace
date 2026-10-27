import { test } from "node:test";
import assert from "node:assert/strict";
import { PgDialect } from "drizzle-orm/pg-core";
import { catalogOfferOrder } from "../../src/lib/catalog/catalog-offer-order";

test("RFQ price sorting uses only visible net amount, never hidden gross", () => {
  const dialect = new PgDialect();
  for (const [sort, direction] of [["price-asc", "ASC"], ["price-desc", "DESC"]] as const) {
    const clauses = catalogOfferOrder(sort);
    const compiled = dialect.sqlToQuery(clauses[0]).sql;
    assert.match(compiled, /"offer_model"/);
    assert.match(compiled, /"conversion_type"/);
    assert.match(compiled, /"rfq_net_price_visible"/);
    assert.match(compiled, /"price_netto"/);
    assert.match(compiled, /"price_brutto"/);
    assert.match(compiled, /"price_on_request"/);
    assert.match(compiled, /THEN CASE.*rfq_net_price_visible/s);
    assert.match(compiled, /ELSE NULL/);
    assert.match(compiled, new RegExp(direction + "\\s+NULLS LAST$"));
  }
});

test("New RFQ net sorting does not alter default and newest catalog ordering", () => {
  const dialect = new PgDialect();
  const defaultSql = catalogOfferOrder("default").map((x) => dialect.sqlToQuery(x).sql).join(" ");
  const newestSql = catalogOfferOrder("newest").map((x) => dialect.sqlToQuery(x).sql).join(" ");
  assert.doesNotMatch(defaultSql, /price_netto/);
  assert.doesNotMatch(newestSql, /price_netto/);
});
