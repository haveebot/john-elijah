/**
 * Payroll + tour finance. Players carry a default per-show rate; each booking
 * gets a lineup (player + rate + paid), expenses, and what the client paid.
 * P&L per show = quote − players − expenses. Runs group bookings for a tour P&L.
 */

import { query, queryOne } from "./client";

export type Player = {
  id: number;
  name: string;
  instrument: string;
  default_rate_cents: number;
  pay_method: string;
  pay_handle: string;
  is_leader: boolean;
  is_active: boolean;
  sort: number;
};

export type BookingPlayer = { id: number; booking_id: number; player_id: number; rate_cents: number; paid: boolean; paid_at: string | null; name: string; instrument: string };
export type Expense = { id: number; booking_id: number; kind: string; amount_cents: number; note: string; paid_by: string; created_at: string };
export type Run = { id: number; name: string; starts_on: string | null; ends_on: string | null; notes: string };

export async function listPlayers(activeOnly = false): Promise<Player[]> {
  return query<Player>(`SELECT * FROM players ${activeOnly ? "WHERE is_active" : ""} ORDER BY sort, name`);
}

export async function upsertPlayer(p: Partial<Player> & { name: string }): Promise<void> {
  await query(
    `INSERT INTO players (name, instrument, default_rate_cents, pay_method, pay_handle, is_leader, is_active, sort)
     VALUES ($1,COALESCE($2,''),COALESCE($3,0),COALESCE($4,''),COALESCE($5,''),COALESCE($6,false),COALESCE($7,true),COALESCE($8,100))
     ON CONFLICT (name) DO UPDATE SET instrument=EXCLUDED.instrument, default_rate_cents=EXCLUDED.default_rate_cents,
       pay_method=EXCLUDED.pay_method, pay_handle=EXCLUDED.pay_handle, is_leader=EXCLUDED.is_leader, is_active=EXCLUDED.is_active, sort=EXCLUDED.sort`,
    [p.name, p.instrument, p.default_rate_cents, p.pay_method, p.pay_handle, p.is_leader, p.is_active, p.sort],
  );
}

export async function listBookingPlayers(bookingId: number): Promise<BookingPlayer[]> {
  return query<BookingPlayer>(
    `SELECT bp.*, p.name, p.instrument FROM booking_players bp JOIN players p ON p.id = bp.player_id WHERE bp.booking_id = $1 ORDER BY p.sort, p.name`, [bookingId]);
}

export async function addBookingPlayer(bookingId: number, playerId: number, rateCents?: number): Promise<void> {
  const p = await queryOne<Player>(`SELECT * FROM players WHERE id = $1`, [playerId]);
  if (!p) return;
  await query(
    `INSERT INTO booking_players (booking_id, player_id, rate_cents) VALUES ($1,$2,$3)
     ON CONFLICT (booking_id, player_id) DO UPDATE SET rate_cents = EXCLUDED.rate_cents`,
    [bookingId, playerId, rateCents ?? p.default_rate_cents]);
}

export async function setBookingPlayerPaid(id: number, paid: boolean): Promise<void> {
  await query(`UPDATE booking_players SET paid = $2, paid_at = CASE WHEN $2 THEN now() ELSE NULL END WHERE id = $1`, [id, paid]);
}

export async function setBookingPlayerRate(id: number, rateCents: number): Promise<void> {
  await query(`UPDATE booking_players SET rate_cents = $2 WHERE id = $1`, [id, rateCents]);
}

export async function removeBookingPlayer(id: number): Promise<void> {
  await query(`DELETE FROM booking_players WHERE id = $1`, [id]);
}

export async function listExpenses(bookingId: number): Promise<Expense[]> {
  return query<Expense>(`SELECT * FROM booking_expenses WHERE booking_id = $1 ORDER BY id`, [bookingId]);
}

export async function addExpense(bookingId: number, e: { kind: string; amount_cents: number; note: string; paid_by: string }): Promise<void> {
  await query(`INSERT INTO booking_expenses (booking_id, kind, amount_cents, note, paid_by) VALUES ($1,$2,$3,$4,$5)`, [bookingId, e.kind, e.amount_cents, e.note, e.paid_by]);
}

export async function removeExpense(id: number): Promise<void> {
  await query(`DELETE FROM booking_expenses WHERE id = $1`, [id]);
}

export async function setBookingPaid(bookingId: number, paidCents: number): Promise<void> {
  await query(`UPDATE bookings SET paid_cents = $2, updated_at = now() WHERE id = $1`, [bookingId, paidCents]);
}

export type ShowPnl = { gross: number; players: number; expenses: number; net: number; paidIn: number; owedToBand: number; unpaidPlayers: number };

export async function showPnl(bookingId: number): Promise<ShowPnl> {
  const b = await queryOne<{ quote_cents: number | null; paid_cents: number }>(`SELECT quote_cents, paid_cents FROM bookings WHERE id = $1`, [bookingId]);
  const [pl, ex] = await Promise.all([listBookingPlayers(bookingId), listExpenses(bookingId)]);
  const gross = b?.quote_cents ?? 0;
  const players = pl.reduce((a, p) => a + p.rate_cents, 0);
  const expenses = ex.reduce((a, e) => a + e.amount_cents, 0);
  return { gross, players, expenses, net: gross - players - expenses, paidIn: b?.paid_cents ?? 0, owedToBand: gross - (b?.paid_cents ?? 0), unpaidPlayers: pl.filter((p) => !p.paid).reduce((a, p) => a + p.rate_cents, 0) };
}

export async function listRuns(): Promise<Run[]> {
  return query<Run>(`SELECT * FROM runs ORDER BY starts_on DESC NULLS LAST, id DESC`);
}

export async function createRun(name: string, startsOn: string | null, endsOn: string | null): Promise<Run> {
  const rows = await query<Run>(`INSERT INTO runs (name, starts_on, ends_on) VALUES ($1,$2,$3) RETURNING *`, [name, startsOn, endsOn]);
  return rows[0];
}

export async function runPnl(runId: number): Promise<{ shows: number; gross: number; players: number; expenses: number; net: number }> {
  const r = await queryOne<{ shows: string; gross: string | null; players: string | null; expenses: string | null }>(
    `SELECT COUNT(DISTINCT b.id) AS shows, SUM(b.quote_cents) AS gross,
            (SELECT COALESCE(SUM(bp.rate_cents),0) FROM booking_players bp JOIN bookings b2 ON b2.id = bp.booking_id WHERE b2.run_id = $1) AS players,
            (SELECT COALESCE(SUM(e.amount_cents),0) FROM booking_expenses e JOIN bookings b3 ON b3.id = e.booking_id WHERE b3.run_id = $1) AS expenses
     FROM bookings b WHERE b.run_id = $1`, [runId]);
  const gross = parseInt(r?.gross ?? "0", 10) || 0, players = parseInt(r?.players ?? "0", 10) || 0, expenses = parseInt(r?.expenses ?? "0", 10) || 0;
  return { shows: parseInt(r?.shows ?? "0", 10), gross, players, expenses, net: gross - players - expenses };
}
