import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";

test("Admin Buyer Trust Manual Verification Contract", async (t) => {
  await t.test("Routes exist and are protected", async () => {
    const pageRoute = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminBuyersPage.tsx"), "utf-8");
    const detailRoute = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminBuyerDetailPage.tsx"), "utf-8");

    assert.match(pageRoute, /requireAdminPageAccessCore\(/);
    assert.match(detailRoute, /requireAdminPageAccessCore\(/);
  });

  await t.test("Server Actions use requireAdmin and executeBuyerTrustTransition", async () => {
    const actions = await fs.readFile(path.join(process.cwd(), "src/lib/buyer-trust/admin-actions.ts"), "utf-8");

    assert.match(actions, /await requireAdmin\(\)/);
    assert.match(actions, /executeBuyerTrustTransition/);
    assert.match(actions, /sourceType:\s*"admin_manual"/);
    assert.match(actions, /actorType:\s*"admin"/);
    assert.match(actions, /actorUserId:\s*adminUser\.id/);
  });

  await t.test("Admin Data Layer implementation", async () => {
    const serviceCore = await fs.readFile(path.join(process.cwd(), "src/lib/buyer-trust/admin-service-core.ts"), "utf-8");

    assert.match(serviceCore, /export async function listAdminBuyerOrganizations/);
    assert.match(serviceCore, /export async function getAdminBuyerOrganizationDetail/);
    assert.doesNotMatch(serviceCore, /requireBuyerOrganizationMember/); // Admin query bypasses buyer membership
  });

  await t.test("No client-side authoritative state changes", async () => {
    const controls = await fs.readFile(path.join(process.cwd(), "src/app/_shared/BuyerVerificationControls.tsx"), "utf-8");

    // Actions are imported
    assert.match(controls, /import\s+\{.*verifyBuyerOrganizationFromAnyStatusAction/);
    // Component calls the action directly without passing an actor UUID
    assert.doesNotMatch(controls, /actorUserId/);
    assert.doesNotMatch(controls, /admin_manual/);
  });

  await t.test("UI Considerations", async () => {
    const page = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminBuyersPage.tsx"), "utf-8");
    const detail = await fs.readFile(path.join(process.cwd(), "src/app/_shared/AdminBuyerDetailPage.tsx"), "utf-8");

    // Has links to details
    assert.match(page, /<Link/);
    assert.match(page, /t\.table\.details/);

    // Shows verification statuses
    assert.match(page, /t\.status\[buyer\.verificationStatus\]/);
    // Detail shows VerificationControls
    assert.match(detail, /BuyerVerificationControls/);
  });
});

test("Primary Buyer contact is deterministic and excludes inactive memberships", async () => {
  const { selectPrimaryBuyerContact } = await import("../../src/lib/buyer-trust/admin-service-core");
  const membership = (id: number, role: "organization_admin" | "authorized_buyer", status: "active" | "inactive" | "revoked", createdAt: string, firstName: string | null) => ({
    id, buyerOrganizationId: 1, role, status, createdAt, firstName, lastName: firstName ? "Contact" : null,
    contactEmail: firstName ? `${firstName.toLowerCase()}@example.invalid` : null, phone: null,
  });
  const members = [
    membership(4, "organization_admin", "inactive", "2023-01-01", "Inactive"),
    membership(3, "authorized_buyer", "active", "2023-01-01", "Buyer"),
    membership(2, "organization_admin", "active", "2024-01-01", "Later"),
    membership(1, "organization_admin", "active", "2024-01-01", "First"),
  ];
  assert.deepStrictEqual(selectPrimaryBuyerContact(members), { name: "First Contact", email: "first@example.invalid" });
  assert.deepStrictEqual(selectPrimaryBuyerContact(members.filter((m) => m.role !== "organization_admin")), { name: "Buyer Contact", email: "buyer@example.invalid" });
  assert.deepStrictEqual(selectPrimaryBuyerContact([membership(1, "organization_admin", "active", "2024-01-01", null)]), { name: null, email: null });
  assert.deepStrictEqual(selectPrimaryBuyerContact([membership(1, "organization_admin", "revoked", "2024-01-01", "Revoked")]), { name: null, email: null });
});
