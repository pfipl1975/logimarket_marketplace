import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString || !/^postgres:\/\/[^@/]+@(?:localhost|127\.0\.0\.1):\d+\//.test(connectionString)) {
  throw new Error("LM47 proof wymaga jednorazowego DATABASE_URL na localhost.");
}

const pool = new Pool({ connectionString });
const db = drizzle(pool);

async function main() {
  const attributeIds = [11, 22];
  const filterKinds = ["controlled", "number"];
  const optionPayloads = [JSON.stringify([101, 102]), JSON.stringify([])];
  const query = sql`
    WITH requested(attribute_id, filter_kind, option_ids) AS (
      SELECT *
      FROM unnest(
        ${sql.param(attributeIds)}::bigint[],
        ${sql.param(filterKinds)}::text[],
        ${sql.param(optionPayloads)}::jsonb[]
      ) AS input(attribute_id, filter_kind, option_ids)
    )
    SELECT attribute_id, filter_kind, option_ids
    FROM requested
    ORDER BY attribute_id
  `;
  const result = await db.execute(query);
  const rows = result.rows as Array<{ attribute_id: string; filter_kind: string; option_ids: number[] }>;
  if (rows.length !== 2 || rows[0]?.attribute_id !== "11" || rows[0]?.filter_kind !== "controlled") {
    throw new Error(`Nieoczekiwany wynik CTE: ${JSON.stringify(rows)}`);
  }
  console.log("LM47_SQL_PROOF|PASS|parameterized CTE + unnest executed");
}

main().then(() => pool.end()).catch(async (error) => { await pool.end(); throw error; });
