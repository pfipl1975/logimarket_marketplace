import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { PUBLIC_LEGAL_DOCUMENTS, getMatchingPublicLegalDelivery, getPublicLegalDeliveryByCode, getPublicLegalDeliveryBySlug } from "@/lib/legal/public-legal-documents";

// Independent Owner fixture. Do not derive expected bytes from the delivery mapping.
const expected = [
  ["MARKETPLACE_TERMS", "regulamin-marketplace", "LogiMarket.eu_Marketplace_Regulamin_v1_0.pdf", 127639, "a5b9cde94becc8e647fc06c598d7e9e3303657e2df7ec11e20d2e08628e776b1"],
  ["COMMISSION_RULES", "cennik-i-zasady-prowizji", "LogiMarket.eu_Marketplace_Cennik_i_Zasady_Prowizji_v1_0.pdf", 110232, "80f9cdf68a9d75f71efb5716f78c8ed12da6519571e68c0551065cae5cf3ce04"],
  ["RETURNS_COMPLAINTS", "reklamacje-i-zwroty", "LogiMarket.eu_Marketplace_Zasady_Reklamacji_i_Zwrotow_v1_0.pdf", 90363, "70e13c872fac3823bed6d9c2089c2c9dbc6ebe33bd4cff591579e291701976d5"],
  ["CONTENT_MODERATION", "moderacja-tresci", "LogiMarket.eu_Marketplace_Zasady_Moderacji_Tresci_v1_0.pdf", 82685, "bd5b2d6e0ce29e2b8bcc89f36c958eafc15f3f9e20713df13bc7a83fbfbc10e1"],
  ["RESTRICTED_PRODUCTS", "produkty-zakazane-i-ograniczone", "LogiMarket.eu_Marketplace_Polityka_Produktow_Zakazanych_i_Ograniczonych_v1_0.pdf", 97303, "a3b66d7ab8146bb4815deef3e127c3c706dc056e0d1e9747c1dcb37b70122c9b"],
  ["PRIVACY_POLICY", "polityka-prywatnosci", "LogiMarket.eu_Marketplace_Polityka_Prywatnosci_v1_0.pdf", 102414, "2da0265e8f928ea05dd83b95fa615a0315b2f2b609a46e1455638e345feb86d5"],
  ["COOKIE_NOTICE", "cookies", "LogiMarket.eu_Marketplace_Informacja_o_Cookies_v1_0.pdf", 72206, "9f3f4f2b8772ebc2dbafd6598b8a42c8ede96de7120aa304085f91ef9d5987fd"],
] as const;

test("seven public PDFs are byte-exact, first-party and allowlisted", () => {
  const root = path.join(process.cwd(), "public", "legal", "core-v1");
  assert.deepEqual(fs.readdirSync(root).sort(), expected.map((item) => item[2]).sort());
  assert.equal(PUBLIC_LEGAL_DOCUMENTS.length, 7);
  expected.forEach(([code, slug, filename, bytes, hash], index) => {
    const disk = fs.readFileSync(path.join(root, filename));
    assert.equal(disk.byteLength, bytes);
    assert.equal(createHash("sha256").update(disk).digest("hex"), hash);
    assert.equal(PUBLIC_LEGAL_DOCUMENTS[index].code, code);
    assert.equal(PUBLIC_LEGAL_DOCUMENTS[index].slug, slug);
    assert.equal(PUBLIC_LEGAL_DOCUMENTS[index].pdfPath, `/legal/core-v1/${filename}`);
    assert.equal(PUBLIC_LEGAL_DOCUMENTS[index].sha256, hash);
    assert.equal(getPublicLegalDeliveryBySlug(slug)?.code, code);
    assert.equal(getMatchingPublicLegalDelivery({ code, version: "1.0", sha256: hash })?.slug, slug);
    assert.equal(getMatchingPublicLegalDelivery({ code, version: "2.0", sha256: hash }), undefined);
  });
  assert.equal(getPublicLegalDeliveryBySlug("partner-agreement"), undefined);
  assert.equal(getPublicLegalDeliveryByCode("PARTNER_AGREEMENT"), undefined);
});

test("public legal UI source contains no Drive or storage reference", () => {
  const files = [
    "src/app/(pl)/dokumenty-prawne/page.tsx",
    "src/app/(pl)/dokumenty-prawne/[slug]/page.tsx",
    "src/app/_shared/PublicLegalDocumentPage.tsx",
    "src/lib/legal/public-legal-documents.ts",
  ];
  for (const file of files) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    assert.ok(!source.includes("drive.google.com"));
    assert.ok(!source.includes("storage_reference"));
    assert.ok(!source.includes("storageReference"));
  }
});
