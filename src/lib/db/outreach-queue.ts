/**
 * Outreach queue — batch mode for the venue engine.
 *   build   → drafts for a filtered set of venues (one open row per venue)
 *   approve → operator-reviewed rows become 'approved'
 *   drain   → sends approved rows, paced (cron hourly in business hours + a
 *             "send next N" button), logs to venue_activity, bumps touch_count,
 *             sets next_touch_at; follow-ups are drafted when a touch comes due.
 */

import { query, queryOne } from "./client";
import { getVenue, listVenueContacts, addVenueActivity, type Venue } from "./venues";
import { draftForTouch, NEXT_TOUCH_DAYS } from "../outreach";
import { sendMail } from "../mail";

export type QueueRow = {
  id: number;
  venue_id: number;
  to_email: string;
  to_name: string;
  subject: string;
  body: string;
  touch: number;
  status: string;
  scheduled_for: string | null;
  sent_at: string | null;
  error: string | null;
  created_by: string;
  created_at: string;
  venue_name?: string;
  venue_city?: string;
  venue_region?: string;
  venue_score?: number;
};

const Q_SELECT = `SELECT q.*, v.name AS venue_name, v.city AS venue_city, v.region AS venue_region, v.score AS venue_score
                  FROM outreach_queue q JOIN venues v ON v.id = q.venue_id`;

export async function listQueue(status?: string, limit = 300): Promise<QueueRow[]> {
  if (status) return query<QueueRow>(`${Q_SELECT} WHERE q.status = $1 ORDER BY v.score DESC, q.id LIMIT $2`, [status, limit]);
  return query<QueueRow>(`${Q_SELECT} ORDER BY q.status, v.score DESC, q.id LIMIT $1`, [limit]);
}

export async function queueCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(`SELECT status, COUNT(*) AS count FROM outreach_queue GROUP BY status`);
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = parseInt(r.count, 10);
  return out;
}

export async function sentToday(): Promise<number> {
  const r = await queryOne<{ count: string }>(`SELECT COUNT(*) AS count FROM outreach_queue WHERE status = 'sent' AND sent_at >= date_trunc('day', now() AT TIME ZONE 'America/Chicago') AT TIME ZONE 'America/Chicago'`);
  return parseInt(r?.count ?? "0", 10);
}

/** Best address for a venue: a booker contact first, then any contact, then the venue's own. */
export async function bestRecipient(v: Venue): Promise<{ email: string; name: string } | null> {
  const contacts = await listVenueContacts(v.id);
  const pick = contacts.find((c) => c.email && c.role === "booker") ?? contacts.find((c) => c.email && c.role === "events") ?? contacts.find((c) => c.email);
  if (pick) return { email: pick.email, name: pick.name };
  if (v.email) return { email: v.email, name: "" };
  return null;
}

/** Draft rows for venues (first touch or the next due touch). Skips venues with an open row. */
export async function buildDrafts(venueIds: number[], by: string, from: string): Promise<{ drafted: number; skipped: number }> {
  let drafted = 0;
  let skipped = 0;
  for (const id of venueIds) {
    const v = await getVenue(id);
    if (!v || v.status === "booked" || v.status === "passed" || v.status === "replied") { skipped++; continue; }
    const open = await queryOne(`SELECT 1 FROM outreach_queue WHERE venue_id = $1 AND status IN ('draft','approved')`, [id]);
    if (open) { skipped++; continue; }
    const to = await bestRecipient(v);
    if (!to) { skipped++; continue; }
    const touch = Math.min(3, (v.touch_count ?? 0) + 1);
    if (touch > 3) { skipped++; continue; }
    const d = draftForTouch(touch, v, { toName: to.name, from });
    await query(
      `INSERT INTO outreach_queue (venue_id, to_email, to_name, subject, body, touch, status, scheduled_for, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'draft',CURRENT_DATE,$7)`,
      [id, to.email, to.name, d.subject, d.text, touch, by],
    );
    drafted++;
  }
  return { drafted, skipped };
}

/** Venues whose next touch is due (contacted, follow-up date passed, under 3 touches, no open row). */
export async function dueVenueIds(limit = 50): Promise<number[]> {
  const rows = await query<{ id: number }>(
    `SELECT v.id FROM venues v
     WHERE v.status = 'contacted' AND v.next_touch_at IS NOT NULL AND v.next_touch_at <= CURRENT_DATE AND v.touch_count < 3
       AND NOT EXISTS (SELECT 1 FROM outreach_queue q WHERE q.venue_id = v.id AND q.status IN ('draft','approved'))
     ORDER BY v.score DESC LIMIT $1`, [limit]);
  return rows.map((r) => r.id);
}

export async function updateQueueRow(id: number, patch: { subject?: string; body?: string; to_email?: string; status?: string; scheduled_for?: string | null }): Promise<void> {
  const row = await queryOne<QueueRow>(`SELECT * FROM outreach_queue WHERE id = $1`, [id]);
  if (!row) return;
  const n = { ...row, ...patch };
  await query(`UPDATE outreach_queue SET subject=$2, body=$3, to_email=$4, status=$5, scheduled_for=$6 WHERE id=$1`, [id, n.subject, n.body, n.to_email, n.status, n.scheduled_for]);
}

export async function setQueueStatus(ids: number[], status: string): Promise<void> {
  if (ids.length === 0) return;
  await query(`UPDATE outreach_queue SET status = $2 WHERE id = ANY($1) AND status IN ('draft','approved')`, [ids, status]);
}

/** Send up to `max` approved rows, oldest first. Returns per-row outcome. */
export async function drain(max: number, by: string): Promise<{ sent: number; failed: number; details: string[] }> {
  const rows = await query<QueueRow>(
    `SELECT * FROM outreach_queue WHERE status = 'approved' AND (scheduled_for IS NULL OR scheduled_for <= CURRENT_DATE) ORDER BY id LIMIT $1`, [max]);
  let sent = 0;
  let failed = 0;
  const details: string[] = [];
  for (const r of rows) {
    const v = await getVenue(r.venue_id);
    if (!v) continue;
    // guard: only addresses on file for this venue
    const contacts = await listVenueContacts(v.id);
    const allowed = contacts.some((c) => c.email === r.to_email) || v.email === r.to_email;
    if (!allowed) {
      await query(`UPDATE outreach_queue SET status='failed', error='address not on file' WHERE id=$1`, [r.id]);
      failed++; details.push(`✗ ${v.name}: address not on file`); continue;
    }
    const res = await sendMail({ to: r.to_email, subject: r.subject, text: r.body, replyTo: "booking@johnelijahmusic.com" });
    if (res.sent) {
      const days = NEXT_TOUCH_DAYS[r.touch] ?? 0;
      await query(`UPDATE outreach_queue SET status='sent', sent_at=now() WHERE id=$1`, [r.id]);
      await query(
        `UPDATE venues SET status = CASE WHEN status IN ('new','researched') THEN 'contacted' ELSE status END,
           touch_count = GREATEST(touch_count, $2), last_contacted_at = now(),
           next_touch_at = CASE WHEN $3 > 0 THEN CURRENT_DATE + $3 ELSE NULL END, updated_at = now() WHERE id = $1`,
        [v.id, r.touch, days]);
      await addVenueActivity(v.id, "email", `Touch ${r.touch} sent to ${r.to_email}: "${r.subject}"\n\n${r.body}`, by);
      sent++; details.push(`✓ ${v.name} (touch ${r.touch})`);
    } else {
      await query(`UPDATE outreach_queue SET status='failed', error=$2 WHERE id=$1`, [r.id, res.error ?? "send failed"]);
      await addVenueActivity(v.id, "email", `Touch ${r.touch} FAILED to ${r.to_email} (${res.error})`, by);
      failed++; details.push(`✗ ${v.name}: ${res.error}`);
    }
    await new Promise((res2) => setTimeout(res2, 1500)); // pace the SMTP session
  }
  return { sent, failed, details };
}
