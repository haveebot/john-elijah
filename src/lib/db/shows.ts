/**
 * Shows — the public calendar (dated gigs) + residencies (standing weekly gigs).
 * Public pages read `listUpcomingShows` / `listResidencies` at build (ISR).
 */

import { query, queryOne } from "./client";

export type Show = {
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  venue_name: string;
  city: string;
  venue_url: string | null;
  ticket_url: string | null;
  configuration: string | null;
  kind: string;
  status: string;
  is_public: boolean;
  booking_id: number | null;
  notes: string;
  created_at: string;
};

export type Residency = {
  id: number;
  venue_name: string;
  city: string;
  venue_url: string | null;
  weekdays: string[];
  start_time: string;
  label: string;
  active: boolean;
  sort: number;
};

export async function listUpcomingShows(limit = 50): Promise<Show[]> {
  return query<Show>(
    `SELECT * FROM shows
     WHERE is_public AND status <> 'cancelled' AND date >= CURRENT_DATE
     ORDER BY date ASC, start_time ASC LIMIT $1`,
    [limit],
  );
}

export async function listPastShows(limit = 40): Promise<Show[]> {
  return query<Show>(
    `SELECT * FROM shows WHERE is_public AND date < CURRENT_DATE ORDER BY date DESC LIMIT $1`,
    [limit],
  );
}

export async function listAllShows(): Promise<Show[]> {
  return query<Show>(`SELECT * FROM shows ORDER BY date DESC, start_time`);
}

export async function upsertShow(s: {
  date: string;
  venue_name: string;
  city?: string;
  start_time?: string;
  end_time?: string;
  venue_url?: string | null;
  ticket_url?: string | null;
  configuration?: string | null;
  kind?: string;
  status?: string;
  is_public?: boolean;
  booking_id?: number | null;
  notes?: string;
}): Promise<Show> {
  const rows = await query<Show>(
    `INSERT INTO shows (date, venue_name, city, start_time, end_time, venue_url, ticket_url,
                        configuration, kind, status, is_public, booking_id, notes)
     VALUES ($1,$2,COALESCE($3,''),COALESCE($4,''),COALESCE($5,''),$6,$7,$8,
             COALESCE($9,'club'),COALESCE($10,'confirmed'),COALESCE($11,true),$12,COALESCE($13,''))
     ON CONFLICT (date, venue_name) DO UPDATE SET
       city=EXCLUDED.city, start_time=EXCLUDED.start_time, end_time=EXCLUDED.end_time,
       venue_url=EXCLUDED.venue_url, ticket_url=EXCLUDED.ticket_url,
       configuration=EXCLUDED.configuration, kind=EXCLUDED.kind, status=EXCLUDED.status,
       is_public=EXCLUDED.is_public, booking_id=COALESCE(EXCLUDED.booking_id, shows.booking_id),
       notes=EXCLUDED.notes
     RETURNING *`,
    [
      s.date,
      s.venue_name,
      s.city,
      s.start_time,
      s.end_time,
      s.venue_url ?? null,
      s.ticket_url ?? null,
      s.configuration ?? null,
      s.kind,
      s.status,
      s.is_public,
      s.booking_id ?? null,
      s.notes,
    ],
  );
  return rows[0];
}

export async function setShowStatus(id: number, status: string): Promise<void> {
  await query(`UPDATE shows SET status = $2 WHERE id = $1`, [id, status]);
}

export async function toggleShowPublic(id: number): Promise<void> {
  await query(`UPDATE shows SET is_public = NOT is_public WHERE id = $1`, [id]);
}

export async function deleteShow(id: number): Promise<void> {
  await query(`DELETE FROM shows WHERE id = $1`, [id]);
}

export async function getShowForBooking(bookingId: number): Promise<Show | null> {
  return queryOne<Show>(`SELECT * FROM shows WHERE booking_id = $1`, [bookingId]);
}

export async function listResidencies(activeOnly = true): Promise<Residency[]> {
  return query<Residency>(
    `SELECT * FROM residencies ${activeOnly ? "WHERE active" : ""} ORDER BY sort, venue_name`,
  );
}

export async function upsertResidency(r: {
  venue_name: string;
  city?: string;
  venue_url?: string | null;
  weekdays: string[];
  start_time?: string;
  label?: string;
  active?: boolean;
  sort?: number;
}): Promise<void> {
  await query(
    `INSERT INTO residencies (venue_name, city, venue_url, weekdays, start_time, label, active, sort)
     VALUES ($1,COALESCE($2,''),$3,$4::text[],COALESCE($5,''),COALESCE($6,''),COALESCE($7,true),COALESCE($8,100))
     ON CONFLICT (venue_name) DO UPDATE SET
       city=EXCLUDED.city, venue_url=EXCLUDED.venue_url, weekdays=EXCLUDED.weekdays,
       start_time=EXCLUDED.start_time, label=EXCLUDED.label, sort=EXCLUDED.sort`,
    [r.venue_name, r.city, r.venue_url ?? null, r.weekdays, r.start_time, r.label, r.active, r.sort],
  );
}

export async function toggleResidency(id: number): Promise<void> {
  await query(`UPDATE residencies SET active = NOT active WHERE id = $1`, [id]);
}
