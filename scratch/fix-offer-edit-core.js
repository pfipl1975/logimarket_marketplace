const fs = require('fs');
let code = fs.readFileSync('src/lib/admin/offer-edit-core.ts', 'utf8');

code = code.replace(
  /const \{\s*offerId,\s*expectedUpdatedAt,\s*title,\s*description,\s*imageUrl,\s*priceBrutto,\s*priceOnRequest,\s*offerModel,\s*conversionType,\s*outboundUrl,\s*isFeatured,\s*\} = rawInput as Record<string, unknown>;/,
  `const {
    offerId,
    expectedUpdatedAt,
    title,
    description,
    imageUrl,
    priceBrutto,
    priceOnRequest,
    adminOfferType,
    outboundUrl,
    isFeatured,
  } = rawInput as Record<string, unknown>;`
);

code = code.replace(
  /return \{\s*ok: true,\s*data: \{\s*offerId: idNum,\s*expectedUpdatedAt: normalizedExpectedUpdatedAt,\s*title: normalizedTitle,\s*description: normalizedDescription,\s*imageUrl: normalizedImageUrl,\s*priceBrutto: normalizedPriceBrutto,\s*priceOnRequest,\s*adminOfferType: adminOfferType as import\("@\/lib\/admin\/offer-type"\).AdminOfferType,\s*outboundUrl: normalizedOutboundUrl,\s*isFeatured,\s*\},\s*\};/,
  `return {
    ok: true,
    data: {
      offerId: idNum,
      expectedUpdatedAt: normalizedExpectedUpdatedAt,
      title: normalizedTitle,
      description: normalizedDescription,
      imageUrl: normalizedImageUrl,
      priceBrutto: normalizedPriceBrutto,
      priceOnRequest,
      adminOfferType: adminOfferType as import("@/lib/admin/offer-type").AdminOfferType,
      outboundUrl: normalizedOutboundUrl,
      isFeatured,
    },
  };`
);

fs.writeFileSync('src/lib/admin/offer-edit-core.ts', code, 'utf8');
