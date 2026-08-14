import { normalizeProjectRef, RUNTIME_ENV_VARS } from "./runtime-migration-contract";

export const DEV_WRITE_AUTHORIZATION = "AUTHORIZED_DEV_BASELINE_WRITE";
export const PROD_WRITE_AUTHORIZATION = "AUTHORIZED_PROD_RUNTIME_0000_TO_0002";

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
  if (!auth) throw new Error("Missing exact write authorization");

  if (target === "development") {
    if (auth !== DEV_WRITE_AUTHORIZATION) {
      throw new Error("Invalid write authorization for development target");
    }
  } else if (target === "production") {
    if (auth !== PROD_WRITE_AUTHORIZATION) {
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
