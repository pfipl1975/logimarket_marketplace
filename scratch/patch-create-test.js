const fs = require('fs');

let c = fs.readFileSync('tests/offers/admin-offer-create-draft.test.ts', 'utf8');

c = c.replace(/offerModel: "[^"]+", conversionType: "[^"]+"/g, 'adminOfferType: "rfq"');
c = c.replace(/offerModel: "invalid", conversionType: "inbound"/g, 'adminOfferType: "invalid"');
c = c.replace(/offerModel: "rfq", conversionType: "invalid"/g, 'adminOfferType: "invalid"');
c = c.replace(/offerModel: "invalid_model" as unknown as "rfq",\s*conversionType: "inbound" as unknown as "inbound"/, 'adminOfferType: "invalid" as any');

fs.writeFileSync('tests/offers/admin-offer-create-draft.test.ts', c, 'utf8');
