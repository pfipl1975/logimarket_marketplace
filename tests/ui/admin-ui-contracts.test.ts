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
    assert.ok(!src.includes("<AdminRfqStatusControl"), "Table must not import/render AdminRfqStatusControl component");
    assert.ok(!src.includes("mutateRfqStatus"), "Table must not call mutateRfqStatus directly");

    // Must have detail link
    assert.ok(src.includes("detailPathPrefix") || src.includes("zapytania"), "Table must reference detail route path");
    assert.ok(src.includes("detailLink"), "Table must render detailLink dict key");
    assert.ok(!src.includes("?? item.status"), "Table must not fallback to raw item.status");
    assert.ok(src.includes("getRfqStatusLabel(item.status, dict)"), "Table must use typed helper for status label");
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
    
    // NO raw fallback
    assert.ok(!src.includes("?? currentStatus"), "Must not fallback to raw currentStatus");
    assert.ok(!src.includes("?? status"), "Must not fallback to raw status in options");
    assert.ok(src.includes("getRfqStatusLabel(currentStatus, dict)"), "Must use typed helper");
    assert.ok(src.includes("getRfqStatusLabel(status, dict)"), "Must use typed helper for options");
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
    
    // Status fallback check
    assert.ok(!src.includes("default: return status"), "Detail page must not have default raw return");
    assert.ok(src.includes("getRfqStatusLabel(rfq.status, dict)"), "Detail page must use imported typed helper");

    // Offer publication status
    assert.ok(src.includes("getOfferPublicationLabel(rfq.offerPublicationStatus)"), "Must use offer publication label helper");
    assert.ok(!src.includes("|| \"-\""), "Must not use raw string fallback");
    assert.ok(!src.includes("|| '-'"), "Must not use raw string fallback");
    assert.ok(src.includes("default: return adminOffersDict.statusUnknown;"), "Must map unexpected offer status to unknown, not raw DB value");

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

  test("Server/Client Component Boundary - rfq-status-label", () => {
    const statusControlSrc = fs.readFileSync("src/components/admin/AdminRfqStatusControl.tsx", "utf8");
    assert.ok(statusControlSrc.includes('"use client"'), "AdminRfqStatusControl must be a client component");

    const pureHelperSrc = fs.readFileSync("src/lib/admin/rfq-status-label.ts", "utf8");
    assert.ok(!pureHelperSrc.includes('"use client"'), "pure rfq-status-label must not be a client component");

    const tableSrc = fs.readFileSync("src/components/admin/AdminRfqTable.tsx", "utf8");
    assert.ok(
      tableSrc.includes('import { getRfqStatusLabel') && tableSrc.includes('@/lib/admin/rfq-status-label'),
      "AdminRfqTable must import getRfqStatusLabel from pure lib module"
    );
    assert.ok(!tableSrc.includes('<AdminRfqStatusControl'), "AdminRfqTable must not import AdminRfqStatusControl at all");

    const detailSrc = fs.readFileSync("src/app/_shared/AdminRfqDetailPage.tsx", "utf8");
    assert.ok(
      detailSrc.includes('import { getRfqStatusLabel') && detailSrc.includes('@/lib/admin/rfq-status-label'),
      "AdminRfqDetailPage must import getRfqStatusLabel from pure lib module"
    );
    assert.ok(
      !detailSrc.includes('import { AdminRfqStatusControl, getRfqStatusLabel } from "@/components/admin/AdminRfqStatusControl"'),
      "AdminRfqDetailPage must not import getRfqStatusLabel from AdminRfqStatusControl"
    );
  });

  test("AdminDashboardPage respects PII boundaries and layout", () => {
    const dashboardSrc = fs.readFileSync("src/app/_shared/AdminDashboardPage.tsx", "utf8");
    
    assert.ok(!dashboardSrc.includes("contactEmail"), "Must not leak contactEmail in dashboard");
    assert.ok(!dashboardSrc.includes("contactName"), "Must not leak contactName in dashboard");
    assert.ok(!dashboardSrc.includes("phone"), "Must not leak phone in dashboard");
    assert.ok(!dashboardSrc.includes("message"), "Must not leak message in dashboard");
    
    // Check links
    assert.ok(dashboardSrc.includes("href={//admin/partners}"), "Must link to partners");
    assert.ok(dashboardSrc.includes("href={//admin/offers}"), "Must link to offers");
    assert.ok(dashboardSrc.includes("href={//admin/rfq}"), "Must link to rfq");
    assert.ok(dashboardSrc.includes("href={//admin/rfq/}"), "Must link to rfq detail");
    
    // Check missing charts
    assert.ok(!dashboardSrc.includes("Chart"), "Must not contain Charts");
    assert.ok(!dashboardSrc.includes("analytics"), "Must not contain analytics");
    assert.ok(!dashboardSrc.includes("GMV"), "Must not contain GMV");
    assert.ok(!dashboardSrc.includes("Revenue"), "Must not contain Revenue");
  });

  test("actions.ts correctly implements getAdminDashboardPage", () => {
    const actionsSrc = fs.readFileSync("src/app/actions.ts", "utf8");
    
    assert.ok(actionsSrc.includes("export async function getAdminDashboardPage"), "Must export getAdminDashboardPage");
    
    // Auth boundary
    const getDashboardFn = actionsSrc.split("export async function getAdminDashboardPage")[1].split("}")[0];
    assert.ok(getDashboardFn.includes("await requireAdmin();"), "Dashboard must require admin auth BEFORE db query");
  });

});
