const fs = require('fs');
let code = fs.readFileSync('src/lib/admin/offer-edit-core.ts', 'utf8');

code = code.replace(
  /        offerModel,\s*conversionType,\s*outboundUrl: normalizedOutboundUrl,/g,
  `        adminOfferType: adminOfferType as import("@/lib/admin/offer-type").AdminOfferType,
        outboundUrl: normalizedOutboundUrl,`
);

fs.writeFileSync('src/lib/admin/offer-edit-core.ts', code, 'utf8');
