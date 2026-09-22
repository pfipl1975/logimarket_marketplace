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
  const optionIds = [101, 102, 201, 202];
  const requestedAttributeIds = [11, 11, 22, 22];
  const query = sql`
    WITH requested_attributes(attribute_id, filter_kind) AS (
      SELECT * FROM unnest(${sql.param(attributeIds)}::bigint[], ${sql.param(filterKinds)}::text[])
    ), requested_options(option_id, requested_attribute_id) AS (
      SELECT * FROM unnest(${sql.param(optionIds)}::bigint[], ${sql.param(requestedAttributeIds)}::bigint[])
    )
    SELECT ra.attribute_id, ra.filter_kind, ro.option_id
    FROM requested_attributes ra
    LEFT JOIN requested_options ro ON ro.requested_attribute_id = ra.attribute_id
    ORDER BY ra.attribute_id, ro.option_id
  `;
  const result = await db.execute(query);
  const rows = result.rows as Array<{ attribute_id: string; filter_kind: string; option_id: string }>;
  if (rows.length !== 4 || rows[0]?.attribute_id !== "11" || rows[0]?.option_id !== "101" || rows[2]?.attribute_id !== "22" || rows[2]?.option_id !== "201") {
    throw new Error(`Nieoczekiwany wynik CTE: ${JSON.stringify(rows)}`);
  }
  console.log("LM47_SQL_PROOF|PASS|parameterized CTE + unnest executed");
}

main().then(() => pool.end()).catch(async (error) => { await pool.end(); throw error; });
