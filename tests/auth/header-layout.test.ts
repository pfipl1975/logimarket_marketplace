import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Header Layout Regression Tests", async (t) => {
  await t.test("SiteHeader.tsx verifies desktop auth layout separated from primary nav", async () => {
    const filePath = path.join(__dirname, "../../src/components/SiteHeader.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // 1. desktop auth links are NOT injected into primary desktopNavItems
    assert.doesNotMatch(content, /desktopNavItems\.push.*navState\.partnerUrl/);
    assert.doesNotMatch(content, /desktopNavItems\.push.*navState\.loginUrl/);
    
    // 2-4. unauthenticated/authenticated desktop controls expose appropriate links in Account Controls
    assert.match(content, /<div className="flex shrink-0 items-center gap-2 lg:gap-3 ml-auto">/);
    assert.match(content, /navState\.showLogin && navLabels\.login/);
    assert.match(content, /navState\.showPartnerPanel && navLabels\.partnerPanel/);
    assert.match(content, /navState\.showLogout && navLabels\.logout/);
    assert.match(content, /<PublicLogoutForm.*variant="desktop"/);

    // 5. mobile drawer receives auth components
    assert.match(content, /mobileAuthNode=\{/);
    assert.match(content, /<PublicLogoutForm.*variant="mobile"/);
  });

  await t.test("CatalogSearchSuggestions.tsx is responsive on desktop", async () => {
    const filePath = path.join(__dirname, "../../src/components/search/CatalogSearchSuggestions.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // 7. search desktop layout no longer uses unconditional shrink-0 fixed-width contract
    assert.doesNotMatch(content, /variant === "desktop"\s*\?\s*"hidden lg:block shrink-0 min-w-0 lg:w-48 xl:w-56 2xl:w-72 max-w-72"/);
    assert.match(content, /variant === "desktop"\s*\?\s*"hidden lg:block w-full h-full"/);
  });

  await t.test("CatalogNavigationClient.tsx renders mobileAuthNode", async () => {
    const filePath = path.join(__dirname, "../../src/components/catalog/CatalogNavigationClient.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    assert.match(content, /mobileAuthNode/);
    assert.match(content, /\{mobileAuthNode\}/);
  });
});
