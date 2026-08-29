const fs = require('fs');
let c = fs.readFileSync('tests/offers/admin-offer-edit-core.test.ts', 'utf8');

c = c.replace(
  /offerModel: "marketplace",\s*conversionType: "inbound",/g,
  'adminOfferType: "marketplace",'
);
c = c.replace(
  /offerModel: "rfq",\s*conversionType: "outbound",/g,
  'adminOfferType: "external_partner",'
);
c = c.replace(
  /offerModel: "marketplace" as const,\s*conversionType: "inbound" as const,/g,
  'adminOfferType: "marketplace" as const,'
);
c = c.replace(
  /offerModel: "marketplace" as const,\s*conversionType: "outbound" as const,/g,
  'adminOfferType: "external_partner" as const,'
);

// update validateOfferEditBusinessRules(input, ...) to validateOfferEditBusinessRules("marketplace", "inbound", input, ...)
c = c.replace(
  /validateOfferEditBusinessRules\(input, "published"\)/g,
  'validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "published")'
);
c = c.replace(
  /validateOfferEditBusinessRules\(input, "draft"\)/g,
  'validateOfferEditBusinessRules(input.adminOfferType === "marketplace" ? "marketplace" : "rfq", input.adminOfferType === "external_partner" ? "outbound" : "inbound", input, "draft")'
);
c = c.replace(
  /validateOfferEditBusinessRules\(ecommerceInput, "archived"\)/g,
  'validateOfferEditBusinessRules("marketplace", "inbound", ecommerceInput, "archived")'
);
c = c.replace(
  /const p1 = \(v: unknown\) => parseAdminOfferEditInput\(\{ \.\.\.validBase\(\), offerModel: v \}\);\s*assert\.strictEqual\(p1\("rfq"\)\.ok, true\);\s*assert\.strictEqual\(p1\("marketplace"\)\.ok, true\);\s*assert\.strictEqual\(p1\("invalid"\)\.ok, false\);\s*const p2 = \(v: unknown\) => parseAdminOfferEditInput\(\{ \.\.\.validBase\(\), conversionType: v \}\);\s*assert\.strictEqual\(p2\("inbound"\)\.ok, true\);\s*assert\.strictEqual\(p2\("outbound"\)\.ok, true\);\s*assert\.strictEqual\(p2\("invalid"\)\.ok, false\);/g,
  `const p1 = (v: unknown) => parseAdminOfferEditInput({ ...validBase(), adminOfferType: v });
  assert.strictEqual(p1("rfq").ok, true);
  assert.strictEqual(p1("marketplace").ok, true);
  assert.strictEqual(p1("external_partner").ok, true);
  assert.strictEqual(p1("invalid").ok, false);`
);

fs.writeFileSync('tests/offers/admin-offer-edit-core.test.ts', c, 'utf8');
