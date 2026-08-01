import { normalizeProjectRef, RUNTIME_ENV_VARS } from "./runtime-migration-contract";

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
  
  if (ref !== expectedRef) throw new Error("URL does not point to expected ref");
  if (ref === forbiddenRef) throw new Error("URL points to forbidden ref");
  
  if (env.RUNTIME_MIGRATION_TARGET !== "development") throw new Error("Target is not development");
  if (env.RUNTIME_MIGRATION_WRITE_AUTHORIZATION !== "AUTHORIZED_DEV_BASELINE_WRITE") {
    throw new Error("Missing exact write authorization");
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
