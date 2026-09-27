import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PUBLIC_CORE_LEGAL_PACK_CODE,
  selectPublicLegalCenter,
  type LegalDocumentRow,
  type LegalPackRow,
} from "@/lib/legal/public-legal-center";

const now = new Date("2026-09-27T12:00:00.000Z");
const past = new Date("2026-09-01T00:00:00.000Z");
const older = new Date("2026-08-01T00:00:00.000Z");
const future = new Date("2026-10-01T00:00:00.000Z");
const documentHash = "a".repeat(64);
const packRoot = "b".repeat(64);

const documentBase: LegalDocumentRow = {
  code: "PUBLIC_TERMS",
  title: "Warunki korzystania",
  documentType: "public_legal",
  version: "v2",
  language: "pl",
  status: "active",
  effectiveFrom: past,
  effectiveUntil: null,
  sha256: documentHash,
};

const packBase: LegalPackRow = {
  code: PUBLIC_CORE_LEGAL_PACK_CODE,
  version: "2026-09",
  language: "pl",
  status: "active",
  effectiveFrom: past,
  effectiveUntil: null,
  rootSha256: packRoot,
  hashAlgorithm: "sha256",
  canonicalizationScheme: "RFC8785-JCS",
};

test("public legal center includes only effective public documents and separates history", () => {
  const rows: LegalDocumentRow[] = [
    { ...documentBase, code: "Z_CURRENT" },
    { ...documentBase, code: "A_CURRENT", title: "Regulamin" },
    { ...documentBase, code: "DRAFT", status: "draft" },
    { ...documentBase, code: "FUTURE", effectiveFrom: future },
    { ...documentBase, code: "EXPIRED", effectiveUntil: older },
    { ...documentBase, code: "PARTNER", documentType: "partner_legal_pack" },
    { ...documentBase, code: "INFO", documentType: "informational" },
    { ...documentBase, code: "HISTORY_OLD", status: "archived", effectiveFrom: older, version: "v1" },
    { ...documentBase, code: "HISTORY_NEW", status: "superseded", version: "v1.5" },
    { ...documentBase, code: "HISTORY_FUTURE", status: "superseded", effectiveFrom: future },
  ];

  const result = selectPublicLegalCenter(rows, [], now);
  assert.deepEqual(result.currentDocuments.map((item) => item.title), ["Regulamin", "Warunki korzystania"]);
  assert.deepEqual(result.history.map((item) => item.version), ["v1.5", "v1"]);
  assert.equal(result.currentDocuments[0].sha256, documentHash);
  assert.equal(result.history[0].sha256, documentHash);
  assert.deepEqual(selectPublicLegalCenter([...rows].reverse(), [], now), result);
});

test("public Core pack uses the Owner-approved code and current lifecycle", () => {
  assert.equal(PUBLIC_CORE_LEGAL_PACK_CODE, "CORE_PARTNER_LEGAL_PACK");
  const rows: LegalPackRow[] = [
    { ...packBase, code: "OTHER_PACK", rootSha256: "c".repeat(64) },
    { ...packBase, status: "draft" },
    { ...packBase, status: "superseded" },
    { ...packBase, effectiveFrom: future },
    { ...packBase, effectiveUntil: older },
    { ...packBase, rootSha256: null },
    packBase,
  ];

  const result = selectPublicLegalCenter([], rows, now);
  assert.deepEqual(result.packs, [{
    version: packBase.version,
    language: packBase.language,
    effectiveFrom: past,
    rootSha256: packRoot,
    hashAlgorithm: "sha256",
    canonicalizationScheme: "RFC8785-JCS",
  }]);
  assert.deepEqual(selectPublicLegalCenter([], [...rows].reverse(), now), result);
});

test("missing publications are safe and internal fields never enter the public result", () => {
  const empty = selectPublicLegalCenter([], [], now);
  assert.deepEqual(empty, { currentDocuments: [], history: [], packs: [] });

  const internalDocument = { ...documentBase, storageReference: "s3://private-bucket/internal.pdf", id: 123 };
  const internalPack = { ...packBase, manifestJson: { privateKey: "secret" }, id: 456 };
  const result = selectPublicLegalCenter([internalDocument], [internalPack], now);
  const serialized = JSON.stringify(result);
  assert.ok(!serialized.includes("storageReference"));
  assert.ok(!serialized.includes("manifestJson"));
  assert.ok(!serialized.includes("private-bucket"));
  assert.ok(!serialized.includes("secret"));
  assert.ok(!serialized.includes('"id"'));
});
