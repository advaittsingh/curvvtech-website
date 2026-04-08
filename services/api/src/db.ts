import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.PG_POOL_MAX || 20),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export async function dbHealth(): Promise<boolean> {
  try {
    const r = await pool.query("SELECT 1 AS ok");
    const v = r.rows[0]?.ok;
    return (r.rowCount ?? 0) > 0 && (v === 1 || v === "1");
  } catch {
    return false;
  }
}
