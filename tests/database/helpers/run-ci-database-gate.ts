import { spawnSync } from "node:child_process";
import { Pool } from "pg";
import { requireIsolatedE2EDatabaseUrl } from "../../../scripts/e2e/buyer-trust-fixtures";
import { verifySqlIdentityBeforeDestructiveDdl } from "./destructive-db-safety";

async function main() {
  if (process.env.GITHUB_ACTIONS !== "true" || !process.env.CI) throw new Error("BLOCKED_NOT_GITHUB_CI");
  const url = requireIsolatedE2EDatabaseUrl();
  const pool = new Pool({ connectionString: url });
  try { await verifySqlIdentityBeforeDestructiveDdl(pool); } finally { await pool.end(); }
  const secrets = Object.entries(process.env)
    .filter(([name, value]) => /TOKEN|PASSWORD|SECRET|(?:^|_)KEY$/.test(name) && value && value.length >= 8)
    .map(([, value]) => value!);
  const redact = (text: string) => {
    let result = text.replace(/postgres(?:ql)?:\/\/[^\s"'<>]+/gi, "[REDACTED_POSTGRES_URL]");
    for (const secret of [url, ...secrets]) result = result.split(secret).join("[REDACTED]");
    return result;
  };
  console.log("LM_SEC_GATE DB_CLASSIFICATION=DISPOSABLE_DEV SQL_IDENTITY=logimarket_test");
  const result = spawnSync("npm", ["run", "test:database"], {
    encoding: "utf8", timeout: 120_000, maxBuffer: 20 * 1024 * 1024, env: process.env,
  });
  process.stdout.write(redact(result.stdout ?? ""));
  process.stderr.write(redact(result.stderr ?? ""));
  if (result.error) console.error("LM_SEC_GATE SPAWN_ERROR=" + result.error.name);
  console.log("LM_SEC_GATE test:database EXIT_CODE=" + (result.status ?? 1));
  process.exitCode = result.status ?? 1;
}
main().catch(() => { console.error("BLOCKED_DATABASE_GATE_PREFLIGHT"); process.exitCode = 1; });
