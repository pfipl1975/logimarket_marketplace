import test from "node:test";
import assert from "node:assert/strict";
import { isProtectedRoute, getLocaleFromPath } from "../../src/lib/auth/route-classification";

test("route classification module", async (t) => {
  await t.test("isProtectedRoute", async (st) => {
    await st.test("identifies admin routes", () => {
      assert.equal(isProtectedRoute("/admin"), true);
      assert.equal(isProtectedRoute("/admin/dashboard"), true);
      assert.equal(isProtectedRoute("/en/admin"), true);
    });

    await st.test("identifies partner routes", () => {
      assert.equal(isProtectedRoute("/partner"), true);
      assert.equal(isProtectedRoute("/partner/dashboard"), true);
      assert.equal(isProtectedRoute("/de/partner/offers"), true);
      assert.equal(isProtectedRoute("/en/partner"), true);
    });

    await st.test("allows public catalog and other routes", () => {
      assert.equal(isProtectedRoute("/"), false);
      assert.equal(isProtectedRoute("/katalog/admin"), false);
      assert.equal(isProtectedRoute("/foo/admin"), false);
      assert.equal(isProtectedRoute("/pl/admin"), false); // /pl/admin is not protected because pl has no prefix in routing
      assert.equal(isProtectedRoute("/katalog"), false);
      assert.equal(isProtectedRoute("/pl/oferta/123"), false);
      assert.equal(isProtectedRoute("/en/offer/123"), false);
      assert.equal(isProtectedRoute("/login"), false);
      assert.equal(isProtectedRoute("/pl/login"), false);
      assert.equal(isProtectedRoute("/api/health"), false);
    });
  });

  await t.test("getLocaleFromPath", async (st) => {
    await st.test("extracts locale correctly", () => {
      assert.equal(getLocaleFromPath("/en/partner/123"), "en");
      assert.equal(getLocaleFromPath("/de/something"), "de");
    });

    await st.test("defaults to pl when no locale is present", () => {
      assert.equal(getLocaleFromPath("/admin"), "pl");
      assert.equal(getLocaleFromPath("/"), "pl");
      assert.equal(getLocaleFromPath("/katalog"), "pl");
      assert.equal(getLocaleFromPath("/pl/admin"), "pl");
    });
  });
});
