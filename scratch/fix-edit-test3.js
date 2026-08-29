const fs = require('fs');

let c = fs.readFileSync('tests/offers/admin-offer-edit-core.test.ts', 'utf8');

c = c.replace(
  /validateOfferEditBusinessRules\(input, "archived"\)/g,
  'validateOfferEditBusinessRules("marketplace", "outbound", input, "archived")'
);

c = c.replace(
  /validateOfferEditBusinessRules\(input, "published"\)/g,
  'validateOfferEditBusinessRules("marketplace", "outbound", input, "published")'
);

// also fix ecommerceInput typescript error if there is one, because conversionType is missing
c = c.replace(
  /conversionType: "inbound" as const/g,
  'adminOfferType: "marketplace" as const'
);


fs.writeFileSync('tests/offers/admin-offer-edit-core.test.ts', c, 'utf8');
