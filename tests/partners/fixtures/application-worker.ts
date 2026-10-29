import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@/lib/schema";
import { submitApplicationCore } from "@/lib/partner-applications/service";
const url=new URL(process.env.PARTNER_APPLICATION_TEST_URL ?? "");
if(url.hostname !== "127.0.0.1" || url.port !== "15479" || url.pathname !== "/lm_partner_application_test" || process.env.PARTNER_APPLICATION_DB_TESTS !== "LOCAL_ISOLATED_15479")throw Error("LOCAL test guard");
(async()=>{const pool=new Pool({connectionString:url.toString()});try {const result=await submitApplicationCore(drizzle(pool,{schema}),JSON.parse(process.argv[2]),null,"synthetic-local-hmac-secret-for-db-tests");process.stdout.write(result.code);}finally{await pool.end();}})().catch(()=>{process.exitCode=1});
