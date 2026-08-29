const fs = require('fs');

let c = fs.readFileSync('tests/offers/admin-offer-create-draft.test.ts', 'utf8');

c = c.replace(/offerModel: "rfq", conversionType: "outbound"/g, 'adminOfferType: "external_partner"');
c = c.replace(/offerModel: "marketplace", conversionType: "inbound"/g, 'adminOfferType: "marketplace"');
c = c.replace(/offerModel: "marketplace", conversionType: "outbound"/g, 'adminOfferType: "external_partner"');
c = c.replace(/offerModel: "invalid", conversionType: "inbound"/g, 'adminOfferType: "invalid"');
c = c.replace(/offerModel: "rfq", conversionType: "invalid"/g, 'adminOfferType: "invalid"');

fs.writeFileSync('tests/offers/admin-offer-create-draft.test.ts', c, 'utf8');
