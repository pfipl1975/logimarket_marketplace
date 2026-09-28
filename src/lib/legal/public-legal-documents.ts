/** Explicit public Core Legal Pack v1 delivery allowlist. Never add Partner Agreement here. */
export const PUBLIC_CORE_LEGAL_EFFECTIVE_INSTANT = "2026-09-30T22:00:00.000Z";

export const PUBLIC_LEGAL_DOCUMENTS = [
  {
    code: "MARKETPLACE_TERMS",
    title: "Regulamin LogiMarket.eu Marketplace",
    slug: "regulamin-marketplace",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Regulamin_v1_0.pdf",
    sha256: "a5b9cde94becc8e647fc06c598d7e9e3303657e2df7ec11e20d2e08628e776b1",
  },
  {
    code: "COMMISSION_RULES",
    title: "Cennik i Zasady Prowizji LogiMarket.eu Marketplace",
    slug: "cennik-i-zasady-prowizji",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Cennik_i_Zasady_Prowizji_v1_0.pdf",
    sha256: "80f9cdf68a9d75f71efb5716f78c8ed12da6519571e68c0551065cae5cf3ce04",
  },
  {
    code: "RETURNS_COMPLAINTS",
    title: "Zasady Reklamacji i Zwrotów LogiMarket.eu Marketplace",
    slug: "reklamacje-i-zwroty",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Zasady_Reklamacji_i_Zwrotow_v1_0.pdf",
    sha256: "70e13c872fac3823bed6d9c2089c2c9dbc6ebe33bd4cff591579e291701976d5",
  },
  {
    code: "CONTENT_MODERATION",
    title: "Zasady Moderacji Treści LogiMarket.eu Marketplace",
    slug: "moderacja-tresci",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Zasady_Moderacji_Tresci_v1_0.pdf",
    sha256: "bd5b2d6e0ce29e2b8bcc89f36c958eafc15f3f9e20713df13bc7a83fbfbc10e1",
  },
  {
    code: "RESTRICTED_PRODUCTS",
    title: "Polityka Produktów Zakazanych i Ograniczonych LogiMarket.eu Marketplace",
    slug: "produkty-zakazane-i-ograniczone",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Polityka_Produktow_Zakazanych_i_Ograniczonych_v1_0.pdf",
    sha256: "a3b66d7ab8146bb4815deef3e127c3c706dc056e0d1e9747c1dcb37b70122c9b",
  },
  {
    code: "PRIVACY_POLICY",
    title: "Polityka Prywatności LogiMarket.eu Marketplace",
    slug: "polityka-prywatnosci",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Polityka_Prywatnosci_v1_0.pdf",
    sha256: "2da0265e8f928ea05dd83b95fa615a0315b2f2b609a46e1455638e345feb86d5",
  },
  {
    code: "COOKIE_NOTICE",
    title: "Informacja o Cookies LogiMarket.eu Marketplace",
    slug: "cookies",
    pdfPath: "/legal/core-v1/LogiMarket.eu_Marketplace_Informacja_o_Cookies_v1_0.pdf",
    sha256: "9f3f4f2b8772ebc2dbafd6598b8a42c8ede96de7120aa304085f91ef9d5987fd",
  },
] as const;

export type PublicLegalDelivery = (typeof PUBLIC_LEGAL_DOCUMENTS)[number];

export function getPublicLegalDeliveryByCode(code: string): PublicLegalDelivery | undefined {
  return PUBLIC_LEGAL_DOCUMENTS.find((document) => document.code === code);
}

export function getPublicLegalDeliveryBySlug(slug: string): PublicLegalDelivery | undefined {
  return PUBLIC_LEGAL_DOCUMENTS.find((document) => document.slug === slug);
}

/** A Registry version may link to the fixed PDF only when its bytes match that version. */
export function getMatchingPublicLegalDelivery(document: { code: string; version: string; sha256: string | null }): PublicLegalDelivery | undefined {
  const delivery = getPublicLegalDeliveryByCode(document.code);
  return delivery?.sha256 === document.sha256 && document.version === "1.0" ? delivery : undefined;
}
