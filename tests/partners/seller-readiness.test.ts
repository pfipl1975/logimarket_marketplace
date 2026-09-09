import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { evaluateSellerReadiness, type SellerReadinessSnapshot } from "../../src/lib/partners/seller-readiness-core";

describe("Canonical Seller Readiness Domain Evaluator", () => {
  const getBaseSnapshot = (): SellerReadinessSnapshot => ({
    partnerExists: true,
    legalIdentity: { exists: true, isComplete: true, verificationStatus: "verified" },
    activeTaxIdentifiers: [{ verificationStatus: "verified" }],
    activeRegistryIdentifiers: [{ verificationStatus: "verified" }],
    eligibility: { status: "eligible" },
    activeAgreementVersions: [{ id: 10, agreementType: "partner_agreement_b2b" }],
    agreementExecutionEvidence: [{ agreementVersionId: 10, isInvalidated: false }],
  });

  test("A. full valid snapshot -> READY", () => {
    const snap = getBaseSnapshot();
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "ready");
    assert.equal(res.blockers.length, 0);
  });

  test("B. partner missing -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.partnerExists = false;
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("missing_partner"));
  });

  test("C. legal identity missing -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.legalIdentity.exists = false;
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("missing_legal_identity"));
  });

  test("D. legal identity incomplete -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.legalIdentity.isComplete = false;
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("incomplete_legal_identity"));
  });

  test("E. tax identifier missing -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.activeTaxIdentifiers = [];
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("missing_tax_identity"));
  });

  test("F. legal verification unverified/failed -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.legalIdentity.verificationStatus = "unverified";
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("verification_not_valid"));
  });

  test("G. active tax identifier unverified/failed -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.activeTaxIdentifiers[0].verificationStatus = "failed";
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("verification_not_valid"));
  });

  test("H. optional active registry identifier unverified -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.activeRegistryIdentifiers[0].verificationStatus = "unverified";
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("verification_not_valid"));
  });

  test("I. eligibility pending -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.eligibility.status = "pending";
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("eligibility_not_eligible"));
  });

  test("J. eligibility ineligible -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.eligibility.status = "ineligible";
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("eligibility_not_eligible"));
  });

  test("K. eligibility suspended -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.eligibility.status = "suspended";
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("eligibility_not_eligible"));
  });

  test("L. active agreement missing -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.activeAgreementVersions = [];
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("active_agreement_missing"));
  });

  test("M. agreement evidence missing -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.agreementExecutionEvidence = [];
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("agreement_execution_missing"));
  });

  test("N. agreement evidence is for old/non-current version -> NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.agreementExecutionEvidence[0].agreementVersionId = 999;
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("agreement_execution_missing"));
  });

  test("O. current agreement evidence invalidated -> NOT_READY and blocker agreement_execution_invalidated", () => {
    const snap = getBaseSnapshot();
    snap.agreementExecutionEvidence[0].isInvalidated = true;
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("agreement_execution_invalidated"));
    assert.ok(!res.blockers.includes("agreement_execution_missing"));
  });

  test("P. current valid execution evidence -> PASS", () => {
    // This is basically identical to test A, which checks happy path.
    const snap = getBaseSnapshot();
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "ready");
  });

  test("Q. multiple/inconsistent active agreement snapshot -> fail-closed NOT_READY", () => {
    const snap = getBaseSnapshot();
    snap.activeAgreementVersions.push({ id: 11, agreementType: "partner_agreement_b2b" });
    const res = evaluateSellerReadiness(snap);
    assert.equal(res.status, "not_ready");
    assert.ok(res.blockers.includes("active_agreement_ambiguous"));
  });

  test("R. blocker ordering is deterministic", () => {
    const snap = getBaseSnapshot();
    snap.legalIdentity.exists = false;
    snap.activeTaxIdentifiers = [];
    snap.eligibility.status = "pending";
    const res = evaluateSellerReadiness(snap);
    const expected = ["missing_legal_identity", "missing_tax_identity", "eligibility_not_eligible"];
    assert.deepEqual(res.blockers, expected);
  });

  test("S. duplicate blocker generation cannot produce duplicates", () => {
    const snap = getBaseSnapshot();
    // Simulate multiple unverified taxes to see if it generates verification_not_valid multiple times
    snap.activeTaxIdentifiers = [
      { verificationStatus: "unverified" },
      { verificationStatus: "failed" },
    ];
    snap.legalIdentity.verificationStatus = "failed";
    const res = evaluateSellerReadiness(snap);
    
    // verification_not_valid should only appear once
    const count = res.blockers.filter(b => b === "verification_not_valid").length;
    assert.equal(count, 1);
  });
});
