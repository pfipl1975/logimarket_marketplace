/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  RegisterPartnerAgreementEvidenceSchema,
  InvalidatePartnerAgreementEvidenceSchema,
  registerPartnerAgreementExecutionEvidence,
  invalidatePartnerAgreementExecutionEvidence,
  hasRecordedPartnerAgreementExecutionEvidence,
  getActivePartnerAgreementVersion,
} from "../../src/lib/legal/partner-agreement-core";
import {
  partners,
  agreementVersions,
  partnerAgreementExecutionEvidence,
  partnerAgreementEvidenceInvalidations,
} from "../../src/lib/schema";

describe("Partner Agreement Evidence - Schema Validation", () => {
  const validSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  test("valid registration payload passes validation", () => {
    const raw = {
      partnerId: 101,
      agreementVersionId: 1,
      signedAt: "2026-03-01T12:00:00.000Z",
      signatoryName: "Jan Kowalski",
      signatoryRole: "CEO",
      signatoryEmail: "Jan.Kowalski@Company.PL",
      executionMethod: "platform_documentary_electronic",
      externalPlatform: "Autenti",
      externalTransactionId: "tx-doc-12345",
      signedPdfSha256: validSha256,
    };

    const res = RegisterPartnerAgreementEvidenceSchema.safeParse(raw);
    assert.equal(res.success, true);
    if (res.success) {
      assert.equal(res.data.partnerId, 101);
      assert.equal(res.data.signatoryEmail, "Jan.Kowalski@Company.PL");
      assert.equal(res.data.signedPdfSha256, validSha256);
      assert.equal(res.data.executionMethod, "platform_documentary_electronic");
    }
  });

  test("rejects invalid signed PDF SHA-256 (length != 64, uppercase, non-hex)", () => {
    const base = {
      partnerId: 101,
      agreementVersionId: 1,
      signedAt: "2026-03-01T12:00:00.000Z",
      signatoryName: "Jan Kowalski",
      signatoryRole: "CEO",
      signatoryEmail: "jan@company.pl",
      executionMethod: "platform_documentary_electronic",
      externalPlatform: "Autenti",
      externalTransactionId: "tx-1",
    };

    // Too short (63 chars)
    assert.equal(
      RegisterPartnerAgreementEvidenceSchema.safeParse({
        ...base,
        signedPdfSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b85",
      }).success,
      false
    );

    // Too long (65 chars)
    assert.equal(
      RegisterPartnerAgreementEvidenceSchema.safeParse({
        ...base,
        signedPdfSha256: validSha256 + "a",
      }).success,
      false
    );

    // Uppercase hex chars (must be lowercase)
    assert.equal(
      RegisterPartnerAgreementEvidenceSchema.safeParse({
        ...base,
        signedPdfSha256: validSha256.toUpperCase(),
      }).success,
      false
    );

    // Non-hex chars
    assert.equal(
      RegisterPartnerAgreementEvidenceSchema.safeParse({
        ...base,
        signedPdfSha256: "z".repeat(64),
      }).success,
      false
    );
  });

  test("rejects unknown execution method", () => {
    const raw = {
      partnerId: 101,
      agreementVersionId: 1,
      signedAt: "2026-03-01T12:00:00.000Z",
      signatoryName: "Jan Kowalski",
      signatoryRole: "CEO",
      signatoryEmail: "jan@company.pl",
      executionMethod: "handshake_verbal",
      externalPlatform: "Autenti",
      externalTransactionId: "tx-1",
      signedPdfSha256: validSha256,
    };
    assert.equal(RegisterPartnerAgreementEvidenceSchema.safeParse(raw).success, false);
  });

  test("rejects invalid invalidation reason (< 3 chars or whitespace)", () => {
    assert.equal(
      InvalidatePartnerAgreementEvidenceSchema.safeParse({
        executionEvidenceId: 1,
        reason: "no",
      }).success,
      false
    );

    assert.equal(
      InvalidatePartnerAgreementEvidenceSchema.safeParse({
        executionEvidenceId: 1,
        reason: "    ",
      }).success,
      false
    );

    assert.equal(
      InvalidatePartnerAgreementEvidenceSchema.safeParse({
        executionEvidenceId: 1,
        reason: "Valid reason for administrative correction",
      }).success,
      true
    );
  });
});

describe("Partner Agreement Evidence - Business Invariants", () => {
  const validSha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

  const createMockDb = (config: {
    partnerExists?: boolean;
    activeVersionExists?: boolean;
    versionInactive?: boolean;
    evidenceExists?: boolean;
    evidenceAlreadyInvalidated?: boolean;
    hasActiveEvidence?: boolean;
    duplicateExternalTx?: boolean;
    failOnInsert?: boolean;
  } = {}) => {
    const insertedEvidence: unknown[] = [];
    const insertedInvalidations: unknown[] = [];

    const mockDb: any = {
      select: () => {
        const query: any = {
          from: (table: unknown) => {
            query._table = table;
            return query;
          },
          innerJoin: () => query,
          leftJoin: () => query,
          where: () => query,
          limit: () => query,
          orderBy: () => query,
          then: (resolve: (val: any) => void) => {
            if (query._table === partners) {
              resolve(config.partnerExists ? [{ id: 101, companyName: "Test Partner" }] : []);
            } else if (query._table === agreementVersions) {
              if (config.activeVersionExists) {
                resolve([
                  {
                    id: 1,
                    version: "v1.0",
                    agreementType: "PARTNER_AGREEMENT_B2B",
                    canonicalTemplateHashSha256: validSha256,
                    status: config.versionInactive ? "draft" : "active",
                    effectiveFrom: new Date(),
                    publishedAt: new Date(),
                  },
                ]);
              } else {
                resolve([]);
              }
            } else if (query._table === partnerAgreementExecutionEvidence) {
              if (config.duplicateExternalTx) {
                resolve([{ id: 88 }]);
              } else if (config.evidenceExists) {
                resolve([
                  {
                    id: 1,
                    partnerId: 101,
                    agreementVersionId: 1,
                    status: "recorded",
                  },
                ]);
              } else if (config.hasActiveEvidence) {
                resolve([{ id: 1 }]);
              } else {
                resolve([]);
              }
            } else if (query._table === partnerAgreementEvidenceInvalidations) {
              resolve(
                config.evidenceAlreadyInvalidated
                  ? [
                      {
                        id: 1,
                        executionEvidenceId: 1,
                        reason: "Existing error",
                        invalidatedAt: new Date(),
                        invalidatedByAdminUserId: "admin-1",
                      },
                    ]
                  : []
              );
            } else {
              resolve([]);
            }
          },
        };
        return query;
      },
      insert: (table: unknown) => {
        const insertQuery: any = {
          values: (vals: any) => {
            insertQuery._vals = vals;
            return insertQuery;
          },
          returning: () => insertQuery,
          then: (resolve: (val: any) => void, reject: (err: any) => void) => {
            if (config.failOnInsert) {
              const err: any = new Error("unique violation");
              err.code = "23505";
              reject(err);
              return;
            }
            if (table === partnerAgreementExecutionEvidence) {
              const record = {
                id: 1,
                partnerId: insertQuery._vals.partnerId,
                agreementVersionId: insertQuery._vals.agreementVersionId,
                status: "recorded",
                recordedAt: new Date(),
              };
              insertedEvidence.push(record);
              resolve([record]);
            } else if (table === partnerAgreementEvidenceInvalidations) {
              const record = {
                id: 1,
                executionEvidenceId: insertQuery._vals.executionEvidenceId,
                reason: insertQuery._vals.reason,
                invalidatedAt: new Date(),
                invalidatedByAdminUserId: insertQuery._vals.invalidatedByAdminUserId,
              };
              insertedInvalidations.push(record);
              resolve([record]);
            } else {
              resolve([]);
            }
          },
        };
        return insertQuery;
      },
      _insertedEvidence: insertedEvidence,
      _insertedInvalidations: insertedInvalidations,
    };

    return mockDb;
  };

  test("rejects registration when admin user ID is empty", async () => {
    const db = createMockDb({ partnerExists: true, activeVersionExists: true });
    const res = await registerPartnerAgreementExecutionEvidence(
      db,
      {
        partnerId: 101,
        agreementVersionId: 1,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-1",
        signedPdfSha256: validSha256,
      },
      ""
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "UNAUTHORIZED_ADMIN");
    }
  });

  test("rejects registration when partner does not exist", async () => {
    const db = createMockDb({ partnerExists: false, activeVersionExists: true });
    const res = await registerPartnerAgreementExecutionEvidence(
      db,
      {
        partnerId: 999,
        agreementVersionId: 1,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-1",
        signedPdfSha256: validSha256,
      },
      "admin-usr"
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "PARTNER_NOT_FOUND");
    }
  });

  test("rejects registration when agreement version does not exist", async () => {
    const db = createMockDb({ partnerExists: true, activeVersionExists: false });
    const res = await registerPartnerAgreementExecutionEvidence(
      db,
      {
        partnerId: 101,
        agreementVersionId: 999,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-1",
        signedPdfSha256: validSha256,
      },
      "admin-usr"
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "AGREEMENT_VERSION_NOT_FOUND");
    }
  });

  test("rejects registration when agreement version is inactive", async () => {
    const db = createMockDb({ partnerExists: true, activeVersionExists: true, versionInactive: true });
    const res = await registerPartnerAgreementExecutionEvidence(
      db,
      {
        partnerId: 101,
        agreementVersionId: 1,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-1",
        signedPdfSha256: validSha256,
      },
      "admin-usr"
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "AGREEMENT_VERSION_NOT_ACTIVE");
    }
  });

  test("rejects registration when external transaction is already actively claimed", async () => {
    const db = createMockDb({ partnerExists: true, activeVersionExists: true, duplicateExternalTx: true });
    const res = await registerPartnerAgreementExecutionEvidence(
      db,
      {
        partnerId: 101,
        agreementVersionId: 1,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-claimed-123",
        signedPdfSha256: validSha256,
      },
      "admin-usr"
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "DUPLICATE_EXTERNAL_TRANSACTION");
    }
  });

  test("succeeds registration when partner and active version exist", async () => {
    const db = createMockDb({ partnerExists: true, activeVersionExists: true });
    const res = await registerPartnerAgreementExecutionEvidence(
      db,
      {
        partnerId: 101,
        agreementVersionId: 1,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-1",
        signedPdfSha256: validSha256,
      },
      "admin-usr"
    );
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.evidenceId, 1);
    }
  });

  test("rejects invalidation when evidence record does not exist", async () => {
    const db = createMockDb({ evidenceExists: false });
    const res = await invalidatePartnerAgreementExecutionEvidence(
      db,
      { executionEvidenceId: 999, reason: "Administrative typo" },
      "admin-usr"
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "EVIDENCE_NOT_FOUND");
    }
  });

  test("rejects invalidation when evidence is already invalidated", async () => {
    const db = createMockDb({ evidenceExists: true, evidenceAlreadyInvalidated: true });
    const res = await invalidatePartnerAgreementExecutionEvidence(
      db,
      { executionEvidenceId: 1, reason: "Second invalidation attempt" },
      "admin-usr"
    );
    assert.equal(res.ok, false);
    if (!res.ok) {
      assert.equal(res.code, "ALREADY_INVALIDATED");
    }
  });

  test("succeeds invalidation when evidence exists and has no prior invalidation", async () => {
    const db = createMockDb({ evidenceExists: true, evidenceAlreadyInvalidated: false });
    const res = await invalidatePartnerAgreementExecutionEvidence(
      db,
      { executionEvidenceId: 1, reason: "Administrative error in signatory name" },
      "admin-usr"
    );
    assert.equal(res.ok, true);
    if (res.ok) {
      assert.equal(res.data.invalidationId, 1);
    }
  });

  test("hasRecordedPartnerAgreementExecutionEvidence reports true for active, false for none/invalidated", async () => {
    const dbActive = createMockDb({ hasActiveEvidence: true });
    assert.equal(await hasRecordedPartnerAgreementExecutionEvidence(dbActive, 101), true);

    const dbNone = createMockDb({ hasActiveEvidence: false });
    assert.equal(await hasRecordedPartnerAgreementExecutionEvidence(dbNone, 101), false);
  });

  test("Partner Agreement operations do NOT touch seller_eligibility or verification status", async () => {
    const dbRegister = createMockDb({ partnerExists: true, activeVersionExists: true });

    const regRes = await registerPartnerAgreementExecutionEvidence(
      dbRegister,
      {
        partnerId: 101,
        agreementVersionId: 1,
        signedAt: "2026-03-01T12:00:00.000Z",
        signatoryName: "Jan",
        signatoryRole: "CEO",
        signatoryEmail: "jan@co.pl",
        executionMethod: "platform_documentary_electronic",
        externalPlatform: "Autenti",
        externalTransactionId: "tx-1",
        signedPdfSha256: validSha256,
      },
      "admin-usr"
    );
    assert.equal(regRes.ok, true);
    assert.equal(dbRegister._insertedEvidence.length, 1);

    const dbInvalidate = createMockDb({ evidenceExists: true });
    const invRes = await invalidatePartnerAgreementExecutionEvidence(
      dbInvalidate,
      { executionEvidenceId: 1, reason: "Admin correction" },
      "admin-usr"
    );
    assert.equal(invRes.ok, true);
    assert.equal(dbInvalidate._insertedInvalidations.length, 1);
  });

  test("getActivePartnerAgreementVersion returns active version if present and null if absent", async () => {
    const dbWithActive = createMockDb({ activeVersionExists: true });
    const active = await getActivePartnerAgreementVersion(dbWithActive as any);
    assert.ok(active);
    assert.strictEqual(active.version, "v1.0");

    const dbWithoutActive = createMockDb({ activeVersionExists: false });
    const none = await getActivePartnerAgreementVersion(dbWithoutActive as any);
    assert.strictEqual(none, null);
  });
});
