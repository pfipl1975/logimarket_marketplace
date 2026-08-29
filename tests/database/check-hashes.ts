import { Pool } from "pg";
import { readMigrationFiles } from "drizzle-orm/migrator";
import path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    const journalRes = await pool.query(
      `SELECT hash, created_at FROM drizzle_runtime.__drizzle_migrations ORDER BY created_at ASC`
    ).catch(() => ({ rows: [] }));
    
    const diskMigrations = readMigrationFiles({
      migrationsFolder: path.resolve(__dirname, "../../drizzle-runtime"),
    });
    
    console.log("DB Hashes:");
    console.log(journalRes.rows.map(r => r.hash));
    console.log("Disk Hashes:");
    console.log(diskMigrations.map(m => m.hash));
  } catch(e) {
    console.error(e);
  } finally {
    await pool.end();
  }
}
run();
