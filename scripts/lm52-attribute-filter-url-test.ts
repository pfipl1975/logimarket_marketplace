import assert from "node:assert/strict";
import { resolveAttributeFilterUrlState } from "../src/lib/catalog/attribute-filter-url";
import { buildCategoryOfferQueryHref, resolveCategoryOfferFilters } from "../src/lib/catalog/query";

const definitions = [
  { attributeId: 11, stableKey: "external_length", dataType: "number", name: "Length", shortLabel: null, description: null, unitCode: "mm", sortOrder: 10, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, options: [] },
  { attributeId: 12, stableKey: "capacity", dataType: "number", name: "Capacity", shortLabel: null, description: null, unitCode: "l", sortOrder: 40, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, options: [] },
  { attributeId: 13, stableKey: "material", dataType: "enum", name: "Material", shortLabel: null, description: null, unitCode: null, sortOrder: 50, isFilterable: true, isComparable: true, isRequired: false, isVisible: true, options: [{ optionId: 101, stableKey: "pp", label: "PP", description: null }, { optionId: 102, stableKey: "hdpe", label: "HDPE", description: null }] },
  { attributeId: 14, stableKey: "stackable", dataType: "boolean", name: "Stackable", shortLabel: null, description: null, unitCode: null, sortOrder: 80, isFilterable: false, isComparable: true, isRequired: false, isVisible: true, options: [] },
] as const;

const valid = resolveAttributeFilterUrlState(definitions as never, {
  af_external_length_min: ["500"], af_capacity_max: ["20"], af_material: ["pp"],
});
assert.deepEqual(valid.input.numbers, [{ attributeId: 11, min: 500 }, { attributeId: 12, max: 20 }]);
assert.deepEqual(valid.input.controlled, [{ attributeId: 13, optionIds: [101] }]);

const rejected = resolveAttributeFilterUrlState(definitions as never, {
  af_external_length_min: ["NaN"], af_capacity_min: ["50"], af_capacity_max: ["20"],
  af_material: ["sql-like-text"], af_stackable: ["true"], af_unknown_min: ["1"],
});
assert.deepEqual(rejected.input, { controlled: [], numbers: [] });

const parsed = resolveCategoryOfferFilters({ view: "list", af_material: ["pp"], af_capacity_max: "20" });
const href = buildCategoryOfferQueryHref("/katalog/c-test", { view: "list", filters: parsed }, { view: "grid" });
assert.equal(href, "/katalog/c-test?view=grid&af_material=pp&af_capacity_max=20");
const resetHref = buildCategoryOfferQueryHref("/katalog/c-test", { view: "list", filters: parsed }, { clearAttributeFilters: true });
assert.equal(resetHref, "/katalog/c-test?view=list");

console.log("LM52_ATTRIBUTE_FILTER_URL_TEST=PASS");
