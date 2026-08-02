import test from "node:test";
import assert from "node:assert/strict";
import { requireAdminCore } from "../../src/lib/auth/guards";
import {
  UnauthorizedError,
  ForbiddenError,
  AuthInfrastructureError,
  AuthConfigurationError,
} from "../../src/lib/auth/authorization-errors";
import type { CurrentUserResult } from "../../src/lib/auth/session";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

function authenticated(userId: string): () => Promise<CurrentUserResult> {
  return async () => ({
    status: "authenticated",
    user: { id: userId, email: null },
  });
}

const unauthenticated = async (): Promise<CurrentUserResult> => ({
  status: "unauthenticated",
  user: null,
});

const unavailable = async (): Promise<CurrentUserResult> => ({
  status: "unavailable",
  user: null,
});

test("requireAdminCore", async (t) => {
  await t.test("AUTHENTICATED_ADMIN_RETURNS_IDENTITY", async () => {
    const identity = await requireAdminCore(authenticated(UUID_A), UUID_A);
    assert.equal(identity.id, UUID_A);
    assert.equal(identity.email, null);
  });

  await t.test("AUTHENTICATED_NON_ADMIN_THROWS_FORBIDDEN", async () => {
    await assert.rejects(
      requireAdminCore(authenticated(UUID_B), UUID_A),
      (error: unknown) =>
        error instanceof ForbiddenError && error.code === "AUTH_FORBIDDEN"
    );
  });

  await t.test("UNAUTHENTICATED_THROWS_UNAUTHORIZED", async () => {
    await assert.rejects(
      requireAdminCore(unauthenticated, UUID_A),
      (error: unknown) =>
        error instanceof UnauthorizedError &&
        error.code === "AUTH_UNAUTHORIZED"
    );
  });

  await t.test("UNAVAILABLE_THROWS_AUTH_INFRASTRUCTURE", async () => {
    await assert.rejects(
      requireAdminCore(unavailable, UUID_A),
      (error: unknown) =>
        error instanceof AuthInfrastructureError &&
        error.code === "AUTH_INFRASTRUCTURE_UNAVAILABLE"
    );
  });

  await t.test("INVALID_CONFIGURATION_THROWS_AUTH_CONFIGURATION", async () => {
    await assert.rejects(
      requireAdminCore(authenticated(UUID_A), "not-a-uuid"),
      (error: unknown) =>
        error instanceof AuthConfigurationError &&
        error.code === "AUTH_CONFIGURATION_INVALID"
    );
  });

  await t.test("EMPTY_ALLOWLIST_REJECTS_EVERY_AUTHENTICATED_USER", async () => {
    await assert.rejects(
      requireAdminCore(authenticated(UUID_A), undefined),
      ForbiddenError
    );
    await assert.rejects(
      requireAdminCore(authenticated(UUID_A), ""),
      ForbiddenError
    );
  });

  await t.test("ERROR_CODES_ARE_STABLE", async () => {
    const cases: [Promise<unknown>, string][] = [
      [requireAdminCore(unauthenticated, UUID_A), "AUTH_UNAUTHORIZED"],
      [requireAdminCore(authenticated(UUID_B), UUID_A), "AUTH_FORBIDDEN"],
      [
        requireAdminCore(unavailable, UUID_A),
        "AUTH_INFRASTRUCTURE_UNAVAILABLE",
      ],
      [
        requireAdminCore(authenticated(UUID_A), "bad"),
        "AUTH_CONFIGURATION_INVALID",
      ],
    ];
    for (const [promise, code] of cases) {
      await assert.rejects(promise, (error: unknown) => {
        assert.equal(
          (error as { code?: string }).code,
          code,
          `expected stable code ${code}`
        );
        return true;
      });
    }
  });

  await t.test("ERRORS_DO_NOT_LEAK_UUIDS_OR_ENV_CONTENT", async () => {
    const secrets = [UUID_A, UUID_B, "not-a-uuid"];
    const cases: Promise<unknown>[] = [
      requireAdminCore(unauthenticated, `${UUID_A},${UUID_B}`),
      requireAdminCore(authenticated(UUID_B), UUID_A),
      requireAdminCore(unavailable, `${UUID_A},${UUID_B}`),
      requireAdminCore(authenticated(UUID_A), `${UUID_A},not-a-uuid`),
    ];
    for (const promise of cases) {
      const error = await promise.then(
        () => null,
        (caught: unknown) => caught as Error
      );
      assert.notEqual(error, null);
      const exposed = `${error.name} ${error.message} ${String(error.stack)}`;
      for (const secret of secrets) {
        assert.equal(
          exposed.includes(secret),
          false,
          `error must not contain ${secret}`
        );
      }
    }
  });
});
