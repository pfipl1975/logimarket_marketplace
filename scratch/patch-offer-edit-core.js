const fs = require('fs');

const orig = fs.readFileSync('src/lib/admin/offer-edit-core.ts', 'utf8');

let updated = orig.replace(
  /export interface AdminOfferEditInput \{([\s\S]*?)\}/,
  `export interface AdminOfferEditInput {
  offerId: number;
  expectedUpdatedAt: string | null;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceBrutto: string | null;
  priceOnRequest: boolean;
  adminOfferType: import("@/lib/admin/offer-type").AdminOfferType;
  outboundUrl: string | null;
  isFeatured: boolean;
}`
)

updated = updated.replace(
  /      offerModel,\n      conversionType,\n/,
  `      adminOfferType,\n`
)

updated = updated.replace(
  /\/\/ offerModel[\s\S]*?\/\/ outboundUrl/,
  `// adminOfferType
    if (adminOfferType !== "rfq" && adminOfferType !== "marketplace" && adminOfferType !== "external_partner") {
      return { ok: false, code: "OFFER_INVALID_INPUT" };
    }

    // outboundUrl`
)

updated = updated.replace(
  /        offerModel,\n        conversionType,\n/,
  `        adminOfferType: adminOfferType as import("@/lib/admin/offer-type").AdminOfferType,\n`
)

updated = updated.replace(
  /export function validateOfferEditBusinessRules\(\s*input: AdminOfferEditInput,\s*currentPublicationStatus: string\s*\): \{ valid: true \} \| \{ valid: false; reason: EditTargetInvalidReason \} \{[\s\S]*?return \{ valid: true \};\s*\}/,
  `export function validateOfferEditBusinessRules(
  targetOfferModel: "rfq" | "marketplace",
  targetConversionType: "inbound" | "outbound",
  input: Omit<AdminOfferEditInput, "adminOfferType">,
  currentPublicationStatus: string
): { valid: true } | { valid: false; reason: EditTargetInvalidReason } {
  const canonicalModel = resolveCanonicalOfferModel(targetOfferModel, targetConversionType);
  if (canonicalModel === "unknown") {
    return { valid: false, reason: "MODEL_UNKNOWN" };
  }

  if (currentPublicationStatus === "published") {
    if (canonicalModel === "ecommerce") {
      if (input.priceOnRequest || !input.priceBrutto) {
        return { valid: false, reason: "ECOMMERCE_PRICE_INVALID" };
      }
    }
    if (canonicalModel === "outbound") {
      if (!input.outboundUrl) {
        return { valid: false, reason: "OUTBOUND_URL_INVALID" };
      }
    }
  }

  return { valid: true };
}`
)

updated = updated.replace(
  /import \{ resolveCanonicalOfferModel \} from "@\/lib\/offers\/model";/,
  `import { resolveCanonicalOfferModel } from "@/lib/offers/model";
import { resolveTechnicalModelToAdminOfferType, deriveOfferStorageForCreate } from "@/lib/admin/offer-type";`
)

updated = updated.replace(
  /const rulesCheck = validateOfferEditBusinessRules\(input, current\.publicationStatus as string\);/,
  `const currentAdminType = resolveTechnicalModelToAdminOfferType(current.offerModel, current.conversionType);
        
        let targetOfferModel = current.offerModel as "rfq" | "marketplace";
        let targetConversionType = current.conversionType as "inbound" | "outbound";
        
        if (currentAdminType !== input.adminOfferType) {
          const derived = deriveOfferStorageForCreate(input.adminOfferType);
          targetOfferModel = derived.offerModel;
          targetConversionType = derived.conversionType;
        }

        const rulesCheck = validateOfferEditBusinessRules(targetOfferModel, targetConversionType, input, current.publicationStatus as string);`
)

updated = updated.replace(
  /current\.offerModel === input\.offerModel &&\s*current\.conversionType === input\.conversionType/,
  `current.offerModel === targetOfferModel &&
          current.conversionType === targetConversionType`
)

updated = updated.replace(
  /offerModel: input\.offerModel,\s*conversionType: input\.conversionType,/,
  `offerModel: targetOfferModel,
          conversionType: targetConversionType,`
);

fs.writeFileSync('src/lib/admin/offer-edit-core.ts', updated, 'utf8');
