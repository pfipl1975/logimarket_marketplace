import test, { describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

describe("UI Contract Tests", () => {
  test("AdminOffersTable has NO lifecycle action", () => {
    const tableSrc = fs.readFileSync("src/components/admin/AdminOffersTable.tsx", "utf8");
    assert.ok(!tableSrc.includes("AdminOfferLifecycleAction"), "Table must not import or render AdminOfferLifecycleAction");
    
    assert.ok(tableSrc.includes("draft"), "Table must include draft label");
    assert.ok(tableSrc.includes("published"), "Table must include published label");
    assert.ok(tableSrc.includes("hidden"), "Table must include hidden label");
    assert.ok(tableSrc.includes("archived"), "Table must include archived label");
    assert.ok(tableSrc.includes("deleted"), "Table must include deleted label");
  });

  test("AdminOfferDetailPage renders workspace and specific states", () => {
    const detailSrc = fs.readFileSync("src/app/_shared/AdminOfferDetailPage.tsx", "utf8");
    
    assert.ok(detailSrc.includes("sectionLifecycle"), "Must render lifecycle section");
    
    assert.ok(detailSrc.includes("import { evaluateOfferPublishEligibility }"), "Must import evaluateOfferPublishEligibility");
    assert.ok(detailSrc.includes("evaluateOfferPublishEligibility({"), "Must call evaluateOfferPublishEligibility");
    assert.ok(detailSrc.includes("isPublishEligible={eligibility.eligible}"), "Must pass eligibility.eligible to AdminOfferLifecycleAction");

    assert.ok(!detailSrc.includes("dict.statusUnknown || status;"), "Unknown status must NOT fall back to raw status");
    assert.ok(detailSrc.match(/default:\s*return\s+(dictionary\.adminOffers\.)?statusUnknown;/), "Unknown status must strictly use dictionary value without raw fallback");

    assert.ok(
      detailSrc.includes("offer.publicationStatus === \"draft\" || offer.publicationStatus === \"published\""),
      "AdminOfferLifecycleAction must only render for draft or published"
    );
    
    assert.ok(!detailSrc.includes(">Hide<"), "Must not contain Hide mutation");
    assert.ok(!detailSrc.includes(">Delete<"), "Must not contain Delete mutation");
    assert.ok(!detailSrc.includes(">Restore<"), "Must not contain Restore mutation");
    assert.ok(!detailSrc.includes(">Republish<"), "Must not contain Republish mutation");
    assert.ok(!detailSrc.includes(">Unarchive<"), "Must not contain Unarchive mutation");

    assert.ok(
      detailSrc.includes("offer.publicationStatus === \"draft\" || offer.publicationStatus === \"published\" || offer.publicationStatus === \"archived\""),
      "Edit CTA must only render for draft, published, or archived"
    );

    assert.ok(
      detailSrc.includes("offer.publicationStatus === \"hidden\" || offer.publicationStatus === \"deleted\""),
      "Must have specific read-only block for hidden/deleted"
    );
  });

  // -------------------------------------------------------------------------
  // MVP-08 — Admin RFQ Operations Workspace contracts
  // -------------------------------------------------------------------------

  test("AdminRfqTable — no PII, no inline mutation, has Detail link", () => {
    const src = fs.readFileSync("src/components/admin/AdminRfqTable.tsx", "utf8");

    // PII fields must NOT be rendered in list
    assert.ok(!src.includes("contactName"), "Table must not render contactName");
    assert.ok(!src.includes("email"), "Table must not render email");
    assert.ok(!src.includes("phone"), "Table must not render phone");
    assert.ok(!src.includes("message"), "Table must not render message (PII)");

    // Must not use inline status mutation
    assert.ok(!src.includes("AdminRfqStatusControl"), "Table must not import/render AdminRfqStatusControl");
    assert.ok(!src.includes("mutateRfqStatus"), "Table must not call mutateRfqStatus directly");

    // Must have detail link
    assert.ok(src.includes("detailPathPrefix") || src.includes("zapytania"), "Table must reference detail route path");
    assert.ok(src.includes("detailLink"), "Table must render detailLink dict key");
  });

  test("AdminRfqStatusControl — explicit Apply, no window.confirm, inline close confirm", () => {
    const src = fs.readFileSync("src/components/admin/AdminRfqStatusControl.tsx", "utf8");

    // Must have explicit Apply button
    assert.ok(src.includes("workflowApply"), "Must render workflowApply button");

    // Must NOT call mutateRfqStatus in onChange
    const onChangeIdx = src.indexOf("onChange");
    if (onChangeIdx !== -1) {
      const onChangeBlock = src.substring(onChangeIdx, onChangeIdx + 300);
      assert.ok(!onChangeBlock.includes("mutateRfqStatus"), "Must not mutate on onChange");
    }

    // Must have in-page close confirmation
    assert.ok(src.includes("closeConfirmMessage"), "Must render close confirmation message");
    assert.ok(src.includes("closeConfirmApply"), "Must render close confirmation apply button");
    assert.ok(src.includes("closeConfirmCancel"), "Must render close confirmation cancel button");

    // Must NOT use window.confirm
    assert.ok(!src.includes("window.confirm"), "Must not use window.confirm");
  });

  test("AdminRfqDetailPage — full PII rendered, no dangerouslySetInnerHTML", () => {
    const src = fs.readFileSync("src/app/_shared/AdminRfqDetailPage.tsx", "utf8");

    // Full PII contact section must exist
    assert.ok(src.includes("detailContactSection"), "Must render contact section heading");
    assert.ok(src.includes("rfq.contactName"), "Must render contactName");
    assert.ok(src.includes("rfq.email"), "Must render email");
    assert.ok(src.includes("rfq.phone"), "Must render phone");
    assert.ok(src.includes("rfq.message"), "Must render message");

    // No dangerouslySetInnerHTML
    assert.ok(!src.includes("dangerouslySetInnerHTML"), "Must not use dangerouslySetInnerHTML");

    // Must link to offer and partner admin pages
    assert.ok(src.includes("offerAdminPathPrefix") || src.includes("admin/oferty"), "Must link to offer admin");
    assert.ok(src.includes("partnerAdminPathPrefix") || src.includes("admin/partnerzy"), "Must link to partner admin");

    // Must include AdminRfqStatusControl for workflow
    assert.ok(src.includes("AdminRfqStatusControl"), "Must render AdminRfqStatusControl on detail page");
  });

  test("AdminRfqPage — status filter in form, basePath correct", () => {
    const src = fs.readFileSync("src/app/_shared/AdminRfqPage.tsx", "utf8");

    // Must have status select
    assert.ok(src.includes("statusFilterLabel"), "Must render status filter label");
    assert.ok(src.includes("statusFilterAll"), "Must render all-statuses option");
    assert.ok(src.includes('name="status"'), "Status filter must have name attribute");

    // Must pass basePath to table
    assert.ok(src.includes("basePath={basePath}"), "Must pass basePath prop to AdminRfqTable");
  });

  test("AdminRfqDetailPage — system error handling semantics", () => {
    const src = fs.readFileSync("src/app/_shared/AdminRfqDetailPage.tsx", "utf8");
    
    // Assert SYSTEM_ERROR maps to errorDescription
    assert.ok(
      src.includes('result.code === "SYSTEM_ERROR" ? "errorDescription"'),
      "Must map SYSTEM_ERROR to errorDescription"
    );

    // Assert INVALID_ID maps to detailErrorInvalidId
    assert.ok(
      src.includes('result.code === "INVALID_ID" ? "detailErrorInvalidId"'),
      "Must map INVALID_ID to detailErrorInvalidId"
    );

    // Assert fallback to detailErrorNotFound
    assert.ok(
      src.includes(': "detailErrorNotFound"'),
      "Must fallback NOT_FOUND to detailErrorNotFound"
    );
  });
});