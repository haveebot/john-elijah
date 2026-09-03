/**
 * Postgres client — single shared pg.Pool, lazy-initialized, cached as a
 * module singleton so warm serverless invocations reuse connections.
 * Never import from middleware (edge runtime has no node-postgres).
 */

import { Pool, types, type QueryResultRow } from "pg";

// DATE columns come back as plain "YYYY-MM-DD" strings, not JS Dates —
// every date on this site is a calendar date, never a timestamp.
types.setTypeParser(1082, (v: string) => v);

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set.");
    }
    pool = new Pool({ connectionString });
  }
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
