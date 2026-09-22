export const E2E_ADMIN_USER_ID = "00000000-0000-0000-0000-000000000000";
export const E2E_BUYER_USER_ID = "11111111-1111-1111-1111-111111111111";

export type E2EBuyerFixture = {
  organizationId: number;
  membershipId: number;
  taxIdentifierId: number;
  registryIdentifierId: number;
  initialVerificationEventId: number | null;
  legalName: string;
  nip: string;
  registryValue: string;
  initialStatus: "pending" | "verified";
};

export const E2E_BUYER_FIXTURES = {
  verify: {
    organizationId: 990001,
    membershipId: 994001,
    taxIdentifierId: 991001,
    registryIdentifierId: 992001,
    initialVerificationEventId: null,
    legalName: "E2E Synthetic Buyer Verify Sp. z o.o.",
    nip: "0000000017",
    registryValue: "E2E-VERIFY-REG-001",
    initialStatus: "pending",
  },
  reject: {
    organizationId: 990002,
    membershipId: 994002,
    taxIdentifierId: 991002,
    registryIdentifierId: 992002,
    initialVerificationEventId: null,
    legalName: "E2E Synthetic Buyer Reject Sp. z o.o.",
    nip: "0000000023",
    registryValue: "E2E-REJECT-REG-002",
    initialStatus: "pending",
  },
  revoke: {
    organizationId: 990003,
    membershipId: 994003,
    taxIdentifierId: 991003,
    registryIdentifierId: 992003,
    initialVerificationEventId: 993003,
    legalName: "E2E Synthetic Buyer Revoke Sp. z o.o.",
    nip: "0000000046",
    registryValue: "E2E-REVOKE-REG-003",
    initialStatus: "verified",
  },
  detail: {
    organizationId: 990004,
    membershipId: 994004,
    taxIdentifierId: 991004,
    registryIdentifierId: 992004,
    initialVerificationEventId: 993004,
    legalName: "E2E Synthetic Buyer Detail Sp. z o.o.",
    nip: "0000000052",
    registryValue: "E2E-DETAIL-REG-004",
    initialStatus: "verified",
  },
} as const satisfies Record<string, E2EBuyerFixture>;

export function requireIsolatedE2EDatabaseUrl(): string {
  if (process.env.E2E_DB_CLASSIFICATION !== "ISOLATED_DISPOSABLE_TEST") {
    throw new Error("BLOCKED_DATABASE_GUARD: E2E_DB_CLASSIFICATION must be ISOLATED_DISPOSABLE_TEST");
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("BLOCKED_DATABASE_GUARD: DATABASE_URL is required for E2E fixtures");
  }

  let target: URL;
  try {
    target = new URL(connectionString);
  } catch {
    throw new Error("BLOCKED_DATABASE_GUARD: DATABASE_URL must be a valid PostgreSQL URL");
  }

  const isPostgres = target.protocol === "postgres:" || target.protocol === "postgresql:";
  const isLoopback = target.hostname === "localhost" || target.hostname === "127.0.0.1";
  const isExpectedPort = target.port === "5432";
  const isExpectedDatabase = target.pathname === "/logimarket_test";

  if (!isPostgres || !isLoopback || !isExpectedPort || !isExpectedDatabase) {
    throw new Error(
      "BLOCKED_DATABASE_GUARD: E2E fixtures require local PostgreSQL at localhost:5432/logimarket_test",
    );
  }

  return connectionString;
}
