import { verifyTarget } from "./verify-runtime-migration-target";

async function main() {
  if (process.env.RUNTIME_MIGRATION_ROLLBACK_AUTHORIZATION !== "AUTHORIZED_EMPTY_DEV_BASELINE_ROLLBACK") {
    throw new Error("Unauthorized rollback");
  }
  console.log("Rollback dry-run skipped DB connection as per gate 08A constraints.");
}

if (require.main === module) {
  main().catch(e => {
    console.error(e.message);
    process.exit(1);
  });
}
