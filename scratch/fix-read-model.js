const fs = require('fs');
let code = fs.readFileSync('src/lib/admin/offer-detail-read-model-core.ts', 'utf8');

code = code.replace(
  /import \{\s*resolveCanonicalOfferModel,\s*type CanonicalOfferModelResolution,\s*\} from "@\/lib\/offers\/model";/,
  `import {
  resolveCanonicalOfferModel,
  type CanonicalOfferModelResolution,
} from "@/lib/offers/model";
import { resolveTechnicalModelToAdminOfferType, type AdminOfferType } from "@/lib/admin/offer-type";`
);

code = code.replace(
  /rawOfferModel: string;\s*rawConversionType: string;/,
  `rawOfferModel: string;
  rawConversionType: string;
  adminOfferType: AdminOfferType | null;`
);

code = code.replace(
  /rawOfferModel: offer.offerModel,\s*rawConversionType: offer.conversionType,/,
  `rawOfferModel: offer.offerModel,
      rawConversionType: offer.conversionType,
      adminOfferType: resolveTechnicalModelToAdminOfferType(offer.offerModel, offer.conversionType),`
);

fs.writeFileSync('src/lib/admin/offer-detail-read-model-core.ts', code, 'utf8');
