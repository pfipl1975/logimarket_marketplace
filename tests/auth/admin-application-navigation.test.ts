import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const read = (path: string) => readFile(new URL("../../" + path, import.meta.url), "utf8");
test("Admin nav includes Partner application link for mobile and desktop", async () => {
  const nav = await read("src/components/admin/AdminNavigation.tsx");
  const shell = await read("src/components/admin/AdminShell.tsx");
  assert.ok(nav.includes("href={applicationsPath}"));
  assert.ok(nav.includes('aria-current={isApplicationsActive ? "page" : undefined}'));
  assert.ok(nav.indexOf("href={partnersPath}") < nav.indexOf("href={applicationsPath}"));
  assert.ok(nav.indexOf("href={applicationsPath}") < nav.indexOf("href={buyersPath}"));
  assert.ok(nav.includes("ml-4 border-l-2"));
  assert.equal(shell.split("applicationsPath={applicationsPath}").length - 1, 2);
  assert.equal(shell.split("submittedApplicationsCount={submittedApplicationsCount}").length - 1, 2);
  assert.ok(shell.includes('"/admin/partner-applications"'));
  assert.ok(shell.includes("`/${locale}/admin/partner-applications`"));
});
test("Admin-only count tracks submitted applications; sidebar degrades safely", async () => {
  const service = await read("src/lib/partner-applications/service.ts");
  const shell = await read("src/components/admin/AdminShell.tsx");
  const nav = await read("src/components/admin/AdminNavigation.tsx");
  const fn = service.slice(service.lastIndexOf("export async function countSubmittedApplications"));
  assert.ok(fn.includes("await requireAdmin()"));
  assert.ok(fn.includes("count()"));
  assert.ok(fn.includes('eq(partnerApplications.status, "submitted")'));
  assert.ok(!fn.includes(".insert(") && !fn.includes(".update(") && !fn.includes(".delete("));
  assert.ok(shell.includes("submittedApplicationsCount: number | null = null"));
  assert.ok(shell.includes("ADMIN_PARTNER_APPLICATION_COUNT_UNAVAILABLE"));
  assert.ok(nav.includes("submittedApplicationsCount !== null && submittedApplicationsCount > 0"));
  assert.ok(nav.includes("labels.submittedStatusLabel"));
});
test("All seven locales contain translated Admin applications nav labels", async () => {
  for (const locale of ["pl","en","de","fr","uk","es","zh"]) {
    const d = JSON.parse(await read("src/messages/" + locale + ".json"));
    assert.ok(typeof d.admin.partnerApplicationsNav === "string" && d.admin.partnerApplicationsNav.trim().length > 0);
  }
  const pl = JSON.parse(await read("src/messages/pl.json"));
  assert.equal(pl.admin.partnerApplicationsNav, "Zgłoszenia współpracy");
});
