import { test, expect } from "@playwright/test";

test.describe("Header Layout Regression Tests", () => {
  const viewports = [
    { width: 1600, height: 900, name: "1600x900" },
    { width: 1920, height: 1080, name: "1920x1080" },
  ];

  for (const vp of viewports) {
    test(`LM-BASELINE-HEADER-LAYOUT-02 gap regression - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/pl");

      // We expect the desktop search to be visible at >=1600
      const searchWrapper = page.locator('input[role="combobox"]').locator("..").locator("..").first();
      await expect(searchWrapper).toBeVisible();

      // We expect the catalog trigger inside desktop navigation to be visible
      const catalogTrigger = page.locator('header nav a[href*="/katalog"], header nav button', { hasText: /Katalog|Katalog ofert/i }).last();
      await expect(catalogTrigger).toBeVisible();

      // The hamburger menu should be hidden
      const hamburger = page.getByLabel(/Menu|Zamknij/i).first();
      await expect(hamburger).not.toBeVisible();
      
      const searchBox = await searchWrapper.boundingBox();
      const catalogBox = await catalogTrigger.boundingBox();
      
      expect(searchBox).not.toBeNull();
      expect(catalogBox).not.toBeNull();
      
      if (searchBox && catalogBox) {
        const catalogRight = catalogBox.x + catalogBox.width;
        const searchLeft = searchBox.x;
        const gap = searchLeft - catalogRight;
        
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThanOrEqual(40);
        
        // Search width constraints
        expect(searchBox.width).toBeGreaterThanOrEqual(200);
        expect(searchBox.width).toBeLessThanOrEqual(420);
        
        // Center alignment constraints
        const outerContainer = page.locator('header > div.border-t > div.max-w-\\[1600px\\]');
        const innerContainer = outerContainer.locator('> div.max-w-7xl');
        const firstRow = page.locator('header > div.bg-brand-navy > div.max-w-7xl').first();
        
        const firstRowBox = await firstRow.boundingBox();
        const innerBox = await innerContainer.boundingBox();
        
        expect(firstRowBox).not.toBeNull();
        expect(innerBox).not.toBeNull();
        
        if (firstRowBox && innerBox) {
          const pageRailLeft = firstRowBox.x;
          const pageRailRight = firstRowBox.x + firstRowBox.width;
          
          const headerRailLeft = innerBox.x;
          const headerRailRight = innerBox.x + innerBox.width;
          
          const leftDelta = Math.abs(headerRailLeft - pageRailLeft);
          const rightDelta = Math.abs(headerRailRight - pageRailRight);
          
          expect(leftDelta).toBeLessThanOrEqual(4);
          expect(rightDelta).toBeLessThanOrEqual(4);
          
          // Verify controls stay within rails
          expect(catalogBox.x).toBeGreaterThanOrEqual(headerRailLeft - 1);
          
          // Find right-most control (cart button usually)
          const rightControls = innerContainer.locator('> div:last-child > *');
          const lastControl = rightControls.last();
          const lastControlBox = await lastControl.boundingBox();
          if (lastControlBox) {
            expect(lastControlBox.x + lastControlBox.width).toBeLessThanOrEqual(headerRailRight + 1);
          }
          
          // Verify search is inside rails
          expect(searchBox.x).toBeGreaterThanOrEqual(headerRailLeft);
          expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(headerRailRight);
        }
      }
      
      // No horizontal overflow on the page
      const htmlWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(htmlWidth).toBeLessThanOrEqual(vp.width);
    });
  }

  test("Below-1600 regression check - 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/pl");

    // Hamburger should be visible
    const hamburger = page.getByLabel(/Menu/i).first();
    await expect(hamburger).toBeVisible();

    // The desktop catalog trigger should be hidden (part of the desktop nav)
    const catalogTrigger = page.locator('header nav').locator('visible=true');
    await expect(catalogTrigger).toHaveCount(0);
    // We can just verify the hamburger menu is visible and search is visible
    
    // No horizontal overflow
    const htmlWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(htmlWidth).toBeLessThanOrEqual(1440);
  });
});
