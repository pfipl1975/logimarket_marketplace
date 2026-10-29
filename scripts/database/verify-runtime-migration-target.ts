import { normalizeProjectRef } from "./runtime-migration-contract";
import {
  POST_0007_RECONCILIATION_AUTHORIZATION,
  POST_0007_RECONCILIATION_MODE,
} from "./runtime-migration-journal";

export const DEV_WRITE_AUTHORIZATION = "AUTHORIZED_DEV_BASELINE_WRITE";
export const PROD_WRITE_AUTHORIZATION = "AUTHORIZED_PROD_RUNTIME_0000_TO_0003";

export const PROD_0025_WRITE_AUTHORIZATION = "AUTHORIZED_PROD_PARTNER_APPLICATION_0025_ONLY";
export const PROD_0025_PROJECT_REF = "tpjsiutclowwaxlopemn";

export function verifyTarget(env: NodeJS.ProcessEnv): void {
  const url = env.DATABASE_URL;
  if (!url) throw new Error("Missing DATABASE_URL");

  const expectedRef = env.RUNTIME_MIGRATION_EXPECTED_PROJECT_REF;
  if (!expectedRef) throw new Error("Missing RUNTIME_MIGRATION_EXPECTED_PROJECT_REF");

  const forbiddenRef = env.RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF;
  if (!forbiddenRef) throw new Error("Missing RUNTIME_MIGRATION_FORBIDDEN_PROJECT_REF");

  if (expectedRef === forbiddenRef) throw new Error("Expected ref equals forbidden ref");

  const ref = normalizeProjectRef(url);
  if (!ref) throw new Error("Could not parse project ref from DATABASE_URL");

  if (ref === forbiddenRef) throw new Error("URL points to forbidden ref");
  if (ref !== expectedRef) throw new Error("URL does not point to expected ref");

  const target = env.RUNTIME_MIGRATION_TARGET;
  const auth = env.RUNTIME_MIGRATION_WRITE_AUTHORIZATION;
  const reconciliationMode = env.RUNTIME_MIGRATION_RECONCILIATION;
  if (!auth) throw new Error("Missing exact write authorization");

  if (target === "development") {
    if (reconciliationMode) {
      throw new Error("Reconciliation mode is production-only");
    }
    if (auth !== DEV_WRITE_AUTHORIZATION) {
      throw new Error("Invalid write authorization for development target");
    }
  } else if (target === "production") {
    if (auth === PROD_0025_WRITE_AUTHORIZATION) {
      if (reconciliationMode !== undefined) throw new Error("0025 authorization cannot use reconciliation");
      if (expectedRef !== PROD_0025_PROJECT_REF || ref !== PROD_0025_PROJECT_REF) {
        throw new Error("0025 requires the exact production project");
      }
      if (env.RUNTIME_MIGRATION_EXPECTED_PRE_STATE !== "EXACT_EXISTING_POST_0024") {
        throw new Error("0025 requires explicit EXACT_EXISTING_POST_0024 pre-state");
      }
      const parsed = new URL(url);
      const direct = parsed.hostname === `db.${PROD_0025_PROJECT_REF}.supabase.co`;
      const pooler = parsed.hostname.endsWith(".pooler.supabase.com") &&
        decodeURIComponent(parsed.username) === `postgres.${PROD_0025_PROJECT_REF}`;
      if (!["postgres:", "postgresql:"].includes(parsed.protocol) || (!direct && !pooler) ||
          parsed.pathname !== "/postgres" || !["", "5432"].includes(parsed.port) ||
          [...parsed.searchParams.keys()].some(key => !["sslmode", "sslrootcert"].includes(key) || parsed.searchParams.getAll(key).length !== 1) ||
          parsed.searchParams.get("sslmode") !== "verify-full" ||
          !parsed.searchParams.get("sslrootcert") ||
          ["ssl", "sslcert", "sslkey"].some(key => parsed.searchParams.has(key))) {
        throw new Error("0025 requires an approved production host/database and CA-backed verify-full TLS");
      }
    } else if (reconciliationMode !== undefined) {
      if (reconciliationMode !== POST_0007_RECONCILIATION_MODE) {
        throw new Error("Invalid production reconciliation mode");
      }
      if (auth !== POST_0007_RECONCILIATION_AUTHORIZATION) {
        throw new Error("Invalid write authorization for production reconciliation");
      }
    } else if (auth !== PROD_WRITE_AUTHORIZATION) {
      throw new Error("Invalid write authorization for production target");
    }
  } else {
    throw new Error(`Target is unknown or unsupported: ${target}`);
  }
}

if (require.main === module) {
  try {
    verifyTarget(process.env);
    console.log("Target verified successfully.");
  } catch (e: any) {
    console.error("Target verification failed:", e.message); // Never log secrets
    process.exit(1);
  }
}
