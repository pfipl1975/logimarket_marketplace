import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

let pool: Pool | null = null;
let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getPool() {
  if (pool) return pool;
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set. Please add it in Vercel Settings > Environment Variables.");
  }

  // Supabase / Neon / Vercel Postgres all require SSL
  const isSslRequired = connectionString.includes("supabase") || 
                        connectionString.includes("neon") ||
                        connectionString.includes("sslmode");

  pool = new Pool({
    connectionString,
    ssl: isSslRequired ? { rejectUnauthorized: false } : false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 3),
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 5_000,
    maxLifetimeSeconds: 60,
  });

  pool.on("error", (error) => {
    console.error("Unexpected idle PostgreSQL pool error", error);
  });

  return pool;
}

export function getDb() {
  if (dbInstance) return dbInstance;
  dbInstance = drizzle(getPool(), { schema });
  return dbInstance;
}

// Backwards-compatible direct export (lazy via Proxy)
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  },
});
