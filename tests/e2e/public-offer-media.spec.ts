import { test, expect } from "@playwright/test";

test.describe("Public Offer Media Gallery", () => {
  test("Case A: Multi-image offer gallery", async ({ page }) => {
    const offerId = 880001;
    await page.goto(`/pl/oferta/${offerId}`);

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
    const srcBefore = await mainImage.getAttribute("src");
    await thumbnails.nth(1).click();
    await expect(thumbnails.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(thumbnails.nth(0)).toHaveAttribute("aria-pressed", "false");
    const srcAfter = await mainImage.getAttribute("src");
    expect(srcBefore).not.toBeNull();
    expect(srcAfter).not.toBeNull();
    expect(srcBefore).not.toBe(srcAfter);

    // Check keyboard navigation
    await thumbnails.nth(2).focus();
    await page.keyboard.press("Enter");
    await expect(thumbnails.nth(2)).toHaveAttribute("aria-pressed", "true");
  });

  test("Case B: Single-image offer", async ({ page }) => {
    const offerId = 880002;
    await page.goto(`/pl/oferta/${offerId}`);

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
    await page.goto(`/pl/oferta/${offerId}`);

    // Looking for the fallback container
    const placeholder = page.locator(".flex.aspect-\\[4\\/3\\].bg-brand-light-gray");
    await expect(placeholder).toBeVisible();
  });

  test("Case D: Storage boundary and console errors", async ({ page, request }) => {
    const errors: string[] = [];
    const badRequests: string[] = [];

    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    page.on("request", (req) => {
      if (req.url().includes("offer-media-staging") || req.url().includes("arbitrary") || req.url().includes("unknown")) {
        badRequests.push(req.url());
      }
    });

    await page.goto(`/pl/oferta/880001`);
    await expect(page.locator('section[aria-label*="E2E Multi Image Offer"]')).toBeVisible();

    // Check that we don't have errors (hydration filters removed as requested)
    expect(badRequests).toHaveLength(0);
    expect(errors).toHaveLength(0);

    // Direct mock storage boundary checks
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';

    // Known fixture path -> 200
    const validRes = await request.get(`${baseUrl}/storage/v1/object/public/offer-media/multi/1.jpg`);
    expect(validRes.status()).toBe(200);

    // Unknown offer-media path -> 404
    const unknownRes = await request.get(`${baseUrl}/storage/v1/object/public/offer-media/unknown.jpg`);
    expect(unknownRes.status()).toBe(404);

    // Staging path -> 404
    const stagingRes = await request.get(`${baseUrl}/storage/v1/object/public/offer-media-staging/test.jpg`);
    expect(stagingRes.status()).toBe(404);

    // Arbitrary bucket -> 404
    const arbitraryRes = await request.get(`${baseUrl}/storage/v1/object/public/arbitrary/test.jpg`);
    expect(arbitraryRes.status()).toBe(404);
  });

  test("Case E: Mobile 375px viewport layout", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`/pl/oferta/880001`);

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
