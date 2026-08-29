const fs = require('fs');
let code = fs.readFileSync('src/lib/admin/offer-edit-core.ts', 'utf8');

code = code.replace(
  /priceOnRequest,\s*outboundUrl: normalizedOutboundUrl,/g,
  `priceOnRequest,\n      adminOfferType: adminOfferType as import("@/lib/admin/offer-type").AdminOfferType,\n      outboundUrl: normalizedOutboundUrl,`
);

fs.writeFileSync('src/lib/admin/offer-edit-core.ts', code, 'utf8');
