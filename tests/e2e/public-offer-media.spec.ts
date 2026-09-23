import { test, expect } from "@playwright/test";

test.describe("Public Offer Media Gallery", () => {
  test("Case A: Multi-image offer gallery", async ({ page }) => {
    const offerId = 880001;
    await page.goto(`/pl/go/${offerId}`);

    // Wait for the gallery to appear
    const gallery = page.locator('section[aria-label*="E2E Multi Image Offer"]');
    await expect(gallery).toBeVisible();

    // Check main image
    const mainImage = gallery.locator("div.relative.aspect-\\[4\\/3\\] img");
    await expect(mainImage).toBeVisible();
    await expect(mainImage).toHaveAttribute("alt", /E2E Multi Image Offer/);

    // Check thumbnails
    const thumbnails = gallery.locator("button[aria-pressed]");
    await expect(thumbnails).toHaveCount(3);

    // Check first thumbnail is selected
    await expect(thumbnails.nth(0)).toHaveAttribute("aria-pressed", "true");
    
    // Check changing image via thumbnail
    await thumbnails.nth(1).click();
    await expect(thumbnails.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(thumbnails.nth(0)).toHaveAttribute("aria-pressed", "false");

    // Check keyboard navigation
    await thumbnails.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(thumbnails.nth(2)).toHaveAttribute("aria-pressed", "true");
  });

  test("Case B: Single-image offer", async ({ page }) => {
    const offerId = 880002;
    await page.goto(`/pl/go/${offerId}`);

    const gallery = page.locator('section[aria-label*="E2E Single Image Offer"]');
    await expect(gallery).toBeVisible();

    const mainImage = gallery.locator("div.relative.aspect-\\[4\\/3\\] img");
    await expect(mainImage).toBeVisible();

    // No thumbnails
    const thumbnails = gallery.locator("button[aria-pressed]");
    await expect(thumbnails).toHaveCount(0);
  });

  test("Case C: Zero-image offer fallback", async ({ page }) => {
    const offerId = 880003;
    await page.goto(`/pl/go/${offerId}`);

    // Looking for the fallback container
    const placeholder = page.locator(".flex.aspect-\\[4\\/3\\].bg-brand-light-gray");
    await expect(placeholder).toBeVisible();
  });

  test("Case D: Storage boundary and console errors", async ({ page }) => {
    const errors: string[] = [];
    const badRequests: string[] = [];

    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    page.on("request", (req) => {
      if (req.url().includes("offer-media-staging") || req.url().includes("arbitrary")) {
        badRequests.push(req.url());
      }
    });

    await page.goto(`/pl/go/880001`);
    await expect(page.locator('section[aria-label*="E2E Multi Image Offer"]')).toBeVisible();

    // Check that we don't have errors
    expect(badRequests).toHaveLength(0);
    expect(errors.filter(e => !e.includes("hydration"))).toHaveLength(0);
  });

  test("Case E: Mobile 375px viewport layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/pl/go/880001`);

    const innerWidth = await page.evaluate(() => window.innerWidth);
    expect(innerWidth).toBe(375);

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);

    const gallery = page.locator('section[aria-label*="E2E Multi Image Offer"]');
    await expect(gallery).toBeVisible();

    const thumbnails = gallery.locator("button[aria-pressed]");
    await expect(thumbnails).toHaveCount(3);
    await expect(thumbnails.nth(0)).toBeVisible();
  });
});
