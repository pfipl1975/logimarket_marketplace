import test from "node:test";
import assert from "node:assert";
import fs from "fs";
import path from "path";

test("ROUTE_CONTRACT_TEST: PL partner create route awaits params", () => {
  const routePath = path.join(__dirname, "../../src/app/(pl)/partner/[partnerId]/oferty/nowa/page.tsx");
  assert.ok(fs.existsSync(routePath));
  
  const code = fs.readFileSync(routePath, "utf-8");
  assert.ok(code.includes("params: Promise<{ partnerId: string }>"), "Must use Next.js 16 async params type");
  assert.ok(code.includes("await params"), "Must await params");
});

test("ROUTE_CONTRACT_TEST: Localized partner create route awaits params", () => {
  const routePath = path.join(__dirname, "../../src/app/(localized)/[locale]/partner/[partnerId]/offers/new/page.tsx");
  assert.ok(fs.existsSync(routePath));
  
  const code = fs.readFileSync(routePath, "utf-8");
  assert.ok(code.includes("params: Promise<{ locale: string; partnerId: string }>"), "Must use Next.js 16 async params type");
  assert.ok(code.includes("await params"), "Must await params");
  assert.ok(code.includes("locale={locale as Locale}"), "Must use awaited locale");
});
