import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("Header Layout Regression Tests", async (t) => {
  await t.test("SiteHeader.tsx verifies desktop auth layout, row capacity, and min-[1600px] breakpoint", async () => {
    const filePath = path.join(__dirname, "../../src/components/SiteHeader.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // 1. desktop auth links are NOT injected into primary desktopNavItems
    assert.doesNotMatch(content, /desktopNavItems\.push.*navState\.partnerUrl/);
    assert.doesNotMatch(content, /desktopNavItems\.push.*navState\.loginUrl/);

    // 7. second-row container no longer uses restrictive max-w-7xl contract for the navigation row
    assert.doesNotMatch(content, /<div className="border-t border-white\/10 bg-brand-navy">\s*<div className="[^"]*max-w-7xl/);
    assert.match(content, /<div className="border-t border-white\/10 bg-brand-navy">\s*<div className="[^"]*max-w-\[1600px\]/);

    // desktop search wrapper uses max-w-[420px] and rejects max-w-[500px]
    assert.match(content, /<div className="hidden lg:block flex-1 min-w-\[200px\] max-w-\[420px\]">/);
    assert.doesNotMatch(content, /max-w-\[500px\]/);

    // 3-5. desktop controls expose appropriate links aligned to >=1600 (min-[1600px]) breakpoint
    assert.match(content, /<div className="flex shrink-0 items-center gap-2 lg:gap-3 ml-auto">/);
    assert.match(content, /navState\.showLogin && navLabels\.login/);
    assert.match(content, /<Link href=\{navState\.loginUrl\} className="hidden min-\[1600px\]:flex/);
    assert.match(content, /navState\.showPartnerPanel && navLabels\.partnerPanel/);
    assert.match(content, /<Link href=\{navState\.partnerUrl\} className="hidden min-\[1600px\]:flex/);
    assert.match(content, /navState\.showLogout && navLabels\.logout/);
    assert.match(content, /<div className="hidden min-\[1600px\]:block shrink-0">\s*<PublicLogoutForm locale=\{locale\} label=\{navLabels\.logout\} variant="desktop" \/>/);

    // 6. mobile drawer receives auth components
    assert.match(content, /mobileAuthNode=\{/);
    assert.match(content, /<PublicLogoutForm.*variant="mobile"/);
  });

  await t.test("HeaderDesktopNavigation.tsx full desktop activation is >=1600", async () => {
    const filePath = path.join(__dirname, "../../src/components/HeaderDesktopNavigation.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // 1. HeaderDesktopNavigation uses min-[1600px]:flex, not xl:flex
    assert.match(content, /className="hidden min-\[1600px\]:flex/);
    assert.doesNotMatch(content, /className="hidden xl:flex/);

    // desktop navigation does not grow to consume space (caused LM-BASELINE-HEADER-LAYOUT-02 visual regression)
    assert.match(content, /shrink-0/);
    assert.doesNotMatch(content, /flex-1/);
  });

  await t.test("CatalogSearchSuggestions.tsx is responsive on desktop", async () => {
    const filePath = path.join(__dirname, "../../src/components/search/CatalogSearchSuggestions.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // 8. search desktop layout no longer uses unconditional shrink-0 fixed-width contract
    assert.doesNotMatch(content, /variant === "desktop"\s*\?\s*"hidden lg:block shrink-0 min-w-0 lg:w-48 xl:w-56 2xl:w-72 max-w-72"/);
    assert.match(content, /variant === "desktop"\s*\?\s*"hidden lg:block w-full h-full"/);
  });

  await t.test("CatalogNavigationClient.tsx hamburger is active below 1600 and hidden >=1600", async () => {
    const filePath = path.join(__dirname, "../../src/components/catalog/CatalogNavigationClient.tsx");
    const content = await fs.readFile(filePath, "utf-8");

    // 2. Hamburger uses min-[1600px]:hidden, not xl:hidden
    assert.match(content, /className="relative min-\[1600px\]:hidden"/);
    assert.doesNotMatch(content, /className="relative xl:hidden"/);
    assert.match(content, /mobileAuthNode/);
    assert.match(content, /\{mobileAuthNode\}/);
  });
});
