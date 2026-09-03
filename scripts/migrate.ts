/**
 * Applies src/lib/db/schema.sql (idempotent DDL) to DATABASE_URL.
 * Usage: node --env-file=.env.local --import tsx scripts/migrate.ts
 *        (or `npm run migrate` with env already exported)
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  const sql = readFileSync(join(process.cwd(), "src/lib/db/schema.sql"), "utf8");
  await pool.query(sql);
  const tables = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`,
  );
  console.log(`migrate: ok — ${tables.rows.length} tables:`);
  for (const row of tables.rows) console.log(`  - ${row.tablename}`);
  await pool.end();
}

main().catch((err) => {
  console.error("migrate: FAILED");
  console.error(err);
  process.exit(1);
});
