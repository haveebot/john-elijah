/**
 * Bookings — the HQ operating pipeline.
 * inquiry → quoted → hold → confirmed → deposit_paid → played  (or passed / cancelled)
 *
 * A confirmed booking can be promoted to a public `show` row (see shows.ts).
 */

import { query, queryOne } from "./client";

export const BOOKING_STATUSES = [
  "inquiry",
  "quoted",
  "hold",
  "confirmed",
  "deposit_paid",
  "played",
  "passed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const EVENT_KINDS = ["venue", "private", "wedding", "corporate", "festival", "other"] as const;

export const STATUS_LABELS: Record<BookingStatus, string> = {
  inquiry: "Inquiry",
  quoted: "Quoted",
  hold: "On hold",
  confirmed: "Confirmed",
  deposit_paid: "Deposit paid",
  played: "Played",
  passed: "Passed",
  cancelled: "Cancelled",
};

export type Booking = {
  id: number;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  event_kind: string;
  event_date: string | null;
  start_time: string;
  hours: string | null;
  venue_name: string;
  city: string;
  configuration: string | null;
  guests: number | null;
  budget_cents: number | null;
  quote_cents: number | null;
  deposit_cents: number | null;
  status: BookingStatus;
  details: string;
  notes: string;
  source: string;
  travel_band: string | null;
  estimate_cents: number | null;
  deposit_paid_at: string | null;
  deposit_session_id: string | null;
  run_id?: number | null;
  paid_cents?: number;
  created_at: string;
  updated_at: string;
};

export type TravelBand = { key: string; label: string; fee_cents: number; sort: number };

export async function listTravelBands(): Promise<TravelBand[]> {
  return query<TravelBand>(`SELECT * FROM travel_bands ORDER BY sort, key`);
}

export async function upsertTravelBand(b: TravelBand): Promise<void> {
  await query(
    `INSERT INTO travel_bands (key, label, fee_cents, sort) VALUES ($1,$2,$3,$4)
     ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, sort=EXCLUDED.sort`,
    [b.key, b.label, b.fee_cents, b.sort],
  );
}

export async function setTravelBandFee(key: string, feeCents: number): Promise<void> {
  await query(`UPDATE travel_bands SET fee_cents = $2 WHERE key = $1`, [key, feeCents]);
}

export type BookingEvent = {
  id: number;
  booking_id: number;
  kind: string;
  body: string;
  created_at: string;
};

export type Configuration = {
  key: string;
  label: string;
  lineup: string;
  base_cents: number;
  notes: string;
  sort: number;
  is_public: boolean;
};

export async function listConfigurations(publicOnly = false): Promise<Configuration[]> {
  return query<Configuration>(
    `SELECT * FROM configurations ${publicOnly ? "WHERE is_public" : ""} ORDER BY sort, key`,
  );
}

export async function upsertConfiguration(c: Configuration): Promise<void> {
  await query(
    `INSERT INTO configurations (key, label, lineup, base_cents, notes, sort, is_public)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (key) DO UPDATE SET
       label=EXCLUDED.label, lineup=EXCLUDED.lineup, notes=EXCLUDED.notes, sort=EXCLUDED.sort,
       is_public=EXCLUDED.is_public`,
    [c.key, c.label, c.lineup, c.base_cents, c.notes, c.sort, c.is_public],
  );
}

export async function setConfigurationRate(key: string, baseCents: number): Promise<void> {
  await query(`UPDATE configurations SET base_cents = $2 WHERE key = $1`, [key, baseCents]);
}

export async function listBookings(status?: string): Promise<Booking[]> {
  if (status) {
    return query<Booking>(
      `SELECT * FROM bookings WHERE status = $1 ORDER BY event_date NULLS LAST, updated_at DESC`,
      [status],
    );
  }
  return query<Booking>(`SELECT * FROM bookings ORDER BY updated_at DESC`);
}

export async function listUpcomingBookings(limit = 8): Promise<Booking[]> {
  return query<Booking>(
    `SELECT * FROM bookings
     WHERE event_date >= CURRENT_DATE AND status IN ('hold','confirmed','deposit_paid')
     ORDER BY event_date ASC LIMIT $1`,
    [limit],
  );
}

export async function getBooking(id: number): Promise<Booking | null> {
  return queryOne<Booking>(`SELECT * FROM bookings WHERE id = $1`, [id]);
}

export async function createBooking(input: {
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  event_kind?: string;
  event_date?: string | null;
  start_time?: string;
  hours?: number | null;
  venue_name?: string;
  city?: string;
  configuration?: string | null;
  guests?: number | null;
  budget_cents?: number | null;
  details?: string;
  source?: string;
  travel_band?: string | null;
  estimate_cents?: number | null;
}): Promise<Booking> {
  const rows = await query<Booking>(
    `INSERT INTO bookings
       (contact_name, contact_email, contact_phone, event_kind, event_date, start_time, hours,
        venue_name, city, configuration, guests, budget_cents, details, source, travel_band, estimate_cents)
     VALUES ($1,$2,COALESCE($3,''),COALESCE($4,'venue'),$5,COALESCE($6,''),$7,
             COALESCE($8,''),COALESCE($9,''),$10,$11,$12,COALESCE($13,''),COALESCE($14,'site'),$15,$16)
     RETURNING *`,
    [
      input.contact_name,
      input.contact_email,
      input.contact_phone,
      input.event_kind,
      input.event_date ?? null,
      input.start_time,
      input.hours ?? null,
      input.venue_name,
      input.city,
      input.configuration ?? null,
      input.guests ?? null,
      input.budget_cents ?? null,
      input.details,
      input.source,
      input.travel_band ?? null,
      input.estimate_cents ?? null,
    ],
  );
  await addBookingEvent(rows[0].id, "note", `Inquiry received via ${input.source ?? "site"}.${input.estimate_cents ? ` Site estimate shown: $${Math.round(input.estimate_cents / 100)}.` : ""}`);
  return rows[0];
}

export async function updateBooking(
  id: number,
  patch: Partial<
    Pick<
      Booking,
      | "status"
      | "quote_cents"
      | "deposit_cents"
      | "notes"
      | "event_kind"
      | "event_date"
      | "start_time"
      | "hours"
      | "venue_name"
      | "city"
      | "configuration"
      | "travel_band"
    >
  >,
): Promise<Booking | null> {
  const existing = await getBooking(id);
  if (!existing) return null;
  const next = { ...existing, ...patch };
  const rows = await query<Booking>(
    `UPDATE bookings SET
       status=$2, quote_cents=$3, deposit_cents=$4, notes=$5, event_kind=$6, event_date=$7,
       start_time=$8, hours=$9, venue_name=$10, city=$11, configuration=$12, travel_band=$13, updated_at=now()
     WHERE id=$1 RETURNING *`,
    [
      id,
      next.status,
      next.quote_cents,
      next.deposit_cents,
      next.notes,
      next.event_kind,
      next.event_date,
      next.start_time,
      next.hours,
      next.venue_name,
      next.city,
      next.configuration,
      next.travel_band,
    ],
  );
  if (patch.status && patch.status !== existing.status) {
    await addBookingEvent(id, "status_change", `${existing.status} → ${patch.status}`);
  }
  return rows[0];
}

export async function addBookingEvent(bookingId: number, kind: string, body: string): Promise<void> {
  await query(`INSERT INTO booking_events (booking_id, kind, body) VALUES ($1,$2,$3)`, [
    bookingId,
    kind,
    body,
  ]);
}

export async function listBookingEvents(bookingId: number): Promise<BookingEvent[]> {
  return query<BookingEvent>(
    `SELECT * FROM booking_events WHERE booking_id = $1 ORDER BY created_at DESC`,
    [bookingId],
  );
}

export async function bookingCounts(): Promise<Record<string, number>> {
  const rows = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*) AS count FROM bookings GROUP BY status`,
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.status] = parseInt(r.count, 10);
  return out;
}

/** Sum of quotes on confirmed / deposit-paid / played bookings this calendar year. */
export async function bookedRevenueThisYear(): Promise<number> {
  const row = await queryOne<{ sum: string | null }>(
    `SELECT SUM(quote_cents) AS sum FROM bookings
     WHERE status IN ('confirmed','deposit_paid','played')
       AND event_date >= date_trunc('year', CURRENT_DATE)`,
  );
  return parseInt(row?.sum ?? "0", 10) || 0;
}
