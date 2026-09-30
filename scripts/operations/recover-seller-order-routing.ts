import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../../src/lib/schema";
import { recoverSellerOrderRouting } from "../../src/lib/seller-order/routing-recovery";

export function parseRecoveryRequest(args: string[], env: { DATABASE_URL?: string }) {
  const flags = new Map<string, string>();
  let execute = false;
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === "--execute" && !execute) { execute = true; continue; }
    if (!["--environment", "--expected-host", "--marketplace-order-id", "--seller-order-id", "--authorization"].includes(flag) ||
        flags.has(flag) || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error("INVALID_ARGUMENTS");
    flags.set(flag, args[++index]);
  }
  const environment = flags.get("--environment");
  if (!["LOCAL", "DISPOSABLE_DEV", "SHARED_DEV", "PRODUCTION", "UNKNOWN"].includes(environment ?? "")) throw new Error("CLASSIFICATION_REQUIRED");
  const connectionString = env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL_REQUIRED");
  let hostname: string;
  try { const url = new URL(connectionString); if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new Error(); hostname = url.hostname; }
  catch { throw new Error("INVALID_DATABASE_TARGET"); }
  if (!flags.get("--expected-host") || hostname !== flags.get("--expected-host")) throw new Error("DATABASE_TARGET_MISMATCH");
  const ids = ["--marketplace-order-id", "--seller-order-id"].map(flag => {
    const value = flags.get(flag) ?? "";
    if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) throw new Error("EXACT_IDS_REQUIRED");
    return Number(value);
  });
  if (execute) {
    if (environment === "SHARED_DEV" || environment === "UNKNOWN") throw new Error("WRITES_FORBIDDEN");
    if ((environment === "LOCAL" || environment === "DISPOSABLE_DEV") && !["localhost", "127.0.0.1", "[::1]"].includes(hostname)) throw new Error("LOCAL_TARGET_REQUIRED");
    const authorization = `AUTHORIZE_E6_MARKETPLACE_ORDER_${ids[0]}_SELLER_ORDER_${ids[1]}`;
    if (flags.get("--authorization") !== authorization) throw new Error("EXACT_OWNER_AUTHORIZATION_REQUIRED");
  }
  return { connectionString, environment, marketplaceOrderId: ids[0], sellerOrderId: ids[1], execute };
}

async function main() {
  const request = parseRecoveryRequest(process.argv.slice(2), { DATABASE_URL: process.env.DATABASE_URL });
  const pool = new Pool({ connectionString: request.connectionString, connectionTimeoutMillis: 5000, max: 1 });
  try {
    const result = await recoverSellerOrderRouting(drizzle(pool, { schema }), request.marketplaceOrderId, request.sellerOrderId, request.execute);
    console.log(JSON.stringify({ mode: request.execute ? "EXECUTION_POSTCHECK" : "READ_ONLY_PRECHECK_DRY_RUN", environment: request.environment,
      marketplaceOrderId: request.marketplaceOrderId, sellerOrderId: request.sellerOrderId, ...result }));
    if (!["SAFE_TO_ROUTE", "ALREADY_ROUTED"].includes(result.status)) process.exitCode = 1;
  } finally { await pool.end(); }
}

if (require.main === module) {
  main().catch(() => { console.error("RECOVERY_ABORTED: check target, exact IDs, authorization and database availability; no credentials logged."); process.exitCode = 1; });
}
