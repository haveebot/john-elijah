/**
 * Engagement — the mailing list. Upsert-by-email so repeat submits are harmless.
 */

import { query } from "./client";

export async function addSubscriber(email: string, source = "site"): Promise<void> {
  await query(
    `INSERT INTO subscribers (email, source) VALUES (LOWER($1), $2)
     ON CONFLICT (email) DO NOTHING`,
    [email, source],
  );
}

export async function subscriberCount(): Promise<number> {
  const rows = await query<{ count: string }>(`SELECT COUNT(*) AS count FROM subscribers`);
  return parseInt(rows[0].count, 10);
}
