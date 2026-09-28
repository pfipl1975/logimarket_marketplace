import manifest from "./core-legal-pack-v1-manifest.json";
import { PUBLIC_CORE_LEGAL_PACK_CODE } from "../../src/lib/legal/public-legal-center";

export const CORE_LEGAL_PACK_V1_EFFECTIVE_FROM = "2026-09-30T22:00:00.000Z";
export const CORE_LEGAL_PACK_V1_ROOT_SHA256 = "32a1df03f55ed0e2d9c4b189f6ec231b6adb524ef1b92e6f3d4a75924195c77c";
export const CORE_LEGAL_PACK_V1_REGISTRY_CODE = PUBLIC_CORE_LEGAL_PACK_CODE;
export const CORE_LEGAL_PACK_V1_MANIFEST = manifest;

// Explicit, Owner-supplied mapping. These internal references are never sent to the Legal Center.
export const CORE_LEGAL_PACK_V1_DOCUMENTS = [
  { code: "PARTNER_AGREEMENT", slug: "partner-agreement", documentType: "partner_legal_pack", storageReference: "https://drive.google.com/file/d/130j1gVzNixEOML-TqGwq91OaIVqy5UPi/view?usp=drivesdk" },
  { code: "MARKETPLACE_TERMS", slug: "marketplace-terms", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1y7e-h3REZzFnAbMhx1CuuYGBE9-PAtfs/view?usp=drivesdk" },
  { code: "COMMISSION_RULES", slug: "commission-rules", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1hGAdmkb-1FepCS2GzKGyEyOcPgGwjFgb/view?usp=drivesdk" },
  { code: "RETURNS_COMPLAINTS", slug: "returns-complaints", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1F0dB11W0Hx7GPOURzFdueXAlDcsGx0Vy/view?usp=drivesdk" },
  { code: "CONTENT_MODERATION", slug: "content-moderation", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1SdLSC210v3bx6MvfdtJ3N-hb5xvtNMNg/view?usp=drivesdk" },
  { code: "RESTRICTED_PRODUCTS", slug: "restricted-products", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1pQgJuy52orQpsjAkmnHujep35J_5a0Yn/view?usp=drivesdk" },
  { code: "PRIVACY_POLICY", slug: "privacy-policy", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1pnSlhTHYTLmzhdYHahtAhTwP_v7fDnb8/view?usp=drivesdk" },
  { code: "COOKIE_NOTICE", slug: "cookie-notice", documentType: "public_legal", storageReference: "https://drive.google.com/file/d/1itIwfDwGHh75k2o3IzeBR1T-nh1qyV-X/view?usp=drivesdk" },
] as const;
