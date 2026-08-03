import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getAdminPath,
  getAdminLoginRedirectPath,
  requireAdminPageAccessCore,
} from "../../src/lib/auth/admin-page-access";
import {
  UnauthorizedError,
  ForbiddenError,
  AuthInfrastructureError,
  AuthConfigurationError,
} from "../../src/lib/auth/authorization-errors";
import type { Locale } from "../../src/lib/i18n/config";

const TEST_ADMIN_ID = "11111111-1111-4111-8111-111111111111";

describe("getAdminPath", () => {
  test("getAdminPath returns /admin for pl", () => {
    assert.equal(getAdminPath("pl"), "/admin");
  });

  test("getAdminPath returns /en/admin for en", () => {
    assert.equal(getAdminPath("en"), "/en/admin");
  });

  test("getAdminPath returns correct path for all locales", () => {
    const locales: Locale[] = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    for (const locale of locales) {
      if (locale === "pl") {
        assert.equal(getAdminPath(locale), "/admin");
      } else {
        assert.equal(getAdminPath(locale), `/${locale}/admin`);
      }
    }
  });
});

describe("getAdminLoginRedirectPath", () => {
  test("login redirect pl is correct", () => {
    assert.equal(getAdminLoginRedirectPath("pl"), "/login?next=%2Fadmin");
  });

  test("login redirect en is correct", () => {
    assert.equal(getAdminLoginRedirectPath("en"), "/en/login?next=%2Fen%2Fadmin");
  });

  test("login redirect is correct for all locales", () => {
    const locales: Locale[] = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    for (const locale of locales) {
      const loginPath = locale === "pl" ? "/login" : `/${locale}/login`;
      const adminPath = locale === "pl" ? "/admin" : `/${locale}/admin`;
      const expected = `${loginPath}?next=${encodeURIComponent(adminPath)}`;
      assert.equal(getAdminLoginRedirectPath(locale), expected);
    }
  });

  test("query next decodes exactly to admin path", () => {
    const locales: Locale[] = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    for (const locale of locales) {
      const redirectPath = getAdminLoginRedirectPath(locale);
      const url = new URL(`http://localhost${redirectPath}`);
      const nextParam = url.searchParams.get("next");
      assert.equal(nextParam, getAdminPath(locale));
    }
  });

  test("no redirect path is an absolute URL", () => {
    const locales: Locale[] = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    for (const locale of locales) {
      const path = getAdminLoginRedirectPath(locale);
      assert.equal(path.startsWith("http://"), false);
      assert.equal(path.startsWith("https://"), false);
    }
  });

  test("no redirect path contains backslash", () => {
    const locales: Locale[] = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    for (const locale of locales) {
      const path = getAdminLoginRedirectPath(locale);
      assert.equal(path.includes("\\"), false);
    }
  });

  test("no redirect path contains host or protocol", () => {
    const locales: Locale[] = ["pl", "en", "de", "fr", "uk", "es", "zh"];
    for (const locale of locales) {
      const path = getAdminLoginRedirectPath(locale);
      // Validating it's purely a pathname + search
      assert.equal(path.startsWith("/"), true);
      assert.equal(path.includes("localhost"), false);
      assert.equal(path.includes("logimarket.com"), false);
    }
  });
});

describe("requireAdminPageAccessCore", () => {
  test("core returns administrator identity on success", async () => {
    const mockRequireAdmin = async () => ({
      id: TEST_ADMIN_ID,
      email: "admin@logimarket.local",
    });

    const result = await requireAdminPageAccessCore(mockRequireAdmin);
    assert.equal(result.id, TEST_ADMIN_ID);
    assert.equal(result.email, "admin@logimarket.local");
  });

  test("core propagates UnauthorizedError", async () => {
    const mockRequireAdmin = async () => {
      throw new UnauthorizedError();
    };

    await assert.rejects(
      async () => await requireAdminPageAccessCore(mockRequireAdmin),
      (err) => err instanceof UnauthorizedError
    );
  });

  test("core propagates ForbiddenError", async () => {
    const mockRequireAdmin = async () => {
      throw new ForbiddenError();
    };

    await assert.rejects(
      async () => await requireAdminPageAccessCore(mockRequireAdmin),
      (err) => err instanceof ForbiddenError
    );
  });

  test("core propagates AuthInfrastructureError", async () => {
    const mockRequireAdmin = async () => {
      throw new AuthInfrastructureError();
    };

    await assert.rejects(
      async () => await requireAdminPageAccessCore(mockRequireAdmin),
      (err) => err instanceof AuthInfrastructureError
    );
  });

  test("core propagates AuthConfigurationError", async () => {
    const mockRequireAdmin = async () => {
      throw new AuthConfigurationError();
    };

    await assert.rejects(
      async () => await requireAdminPageAccessCore(mockRequireAdmin),
      (err) => err instanceof AuthConfigurationError
    );
  });

  test("core propagates unknown Error", async () => {
    const mockRequireAdmin = async () => {
      throw new Error("Unknown database crash");
    };

    await assert.rejects(
      async () => await requireAdminPageAccessCore(mockRequireAdmin),
      (err: unknown) => (err as Error).message === "Unknown database crash"
    );
  });
});
