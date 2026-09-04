import type { Player, BookingPlayer, Expense, ShowPnl, Run } from "@/lib/db/finance";
import { actionAddBookingPlayer, actionSetBookingPlayer, actionAddExpense, actionRemoveExpense, actionSetBookingPaid, actionSetBookingRun } from "../../actions";

const EXPENSE_KINDS = ["fuel", "lodging", "food", "gear", "sound", "merch", "fees", "other"];
const $ = (c: number) => `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export function ShowMoney({ booking, players, lineup, expenses, pnl, runs }: {
  booking: { id: number; quote_cents: number | null; paid_cents: number; run_id: number | null };
  players: Player[]; lineup: BookingPlayer[]; expenses: Expense[]; pnl: ShowPnl; runs: Run[];
}) {
  const onLineup = new Set(lineup.map((l) => l.player_id));
  return (
    <section className="mt-10">
      <h2 className="label mb-4">The money on this show</h2>
      <div className="grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
          <p className="label mb-3">Lineup + pay</p>
          <ul className="setlist">
            {lineup.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="wordmark w-32 text-lg">{l.name}</span>
                <span className="label w-20">{l.instrument}</span>
                <form action={actionSetBookingPlayer} className="flex items-center gap-1">
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="booking_id" value={booking.id} /><input type="hidden" name="intent" value="rate" />
                  <span className="label">$</span><input name="rate_dollars" type="number" min="0" step="5" defaultValue={l.rate_cents / 100} className="field w-24 py-1 text-sm" />
                  <button type="submit" className="label brass-link">set</button>
                </form>
                <form action={actionSetBookingPlayer}>
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="booking_id" value={booking.id} />
                  <button type="submit" name="intent" value={l.paid ? "unpaid" : "paid"} className={`btn btn-sm ${l.paid ? "btn-brass" : "btn-ghost"}`}>{l.paid ? `Paid ${l.paid_at ? new Date(l.paid_at).toLocaleDateString() : ""}` : "Mark paid"}</button>
                </form>
                <form action={actionSetBookingPlayer}>
                  <input type="hidden" name="id" value={l.id} /><input type="hidden" name="booking_id" value={booking.id} />
                  <button type="submit" name="intent" value="remove" className="text-xs text-coral hover:underline">remove</button>
                </form>
              </li>
            ))}
            {lineup.length === 0 ? <li className="py-2 text-sm text-ink-faint">No lineup on this show yet.</li> : null}
          </ul>
          {players.filter((p) => !onLineup.has(p.id)).length > 0 ? (
            <form action={actionAddBookingPlayer} className="mt-4 flex flex-wrap items-end gap-2">
              <input type="hidden" name="booking_id" value={booking.id} />
              <label className="text-xs text-ink-faint">Add player
                <select name="player_id" className="field mt-1 py-1.5 text-sm">
                  {players.filter((p) => !onLineup.has(p.id)).map((p) => <option key={p.id} value={p.id}>{p.name} · {p.instrument} · {$(p.default_rate_cents)}</option>)}
                </select>
              </label>
              <label className="text-xs text-ink-faint">Rate $ (blank = default)<input name="rate_dollars" type="number" min="0" step="5" className="field mt-1 w-28 py-1.5 text-sm" /></label>
              <button type="submit" className="btn btn-ghost btn-sm">Add</button>
            </form>
          ) : players.length === 0 ? <p className="mt-3 text-xs text-ink-faint">Add players under Settings first.</p> : null}

          <p className="label mb-3 mt-8">Expenses</p>
          <ul className="setlist">
            {expenses.map((e) => (
              <li key={e.id} className="flex items-center gap-3 py-2 text-sm">
                <span className="label w-16">{e.kind}</span>
                <span className="w-20 text-ink">{$(e.amount_cents)}</span>
                <span className="flex-1 text-ink-dim">{e.note}{e.paid_by ? <span className="label ml-2">paid by {e.paid_by}</span> : null}</span>
                <form action={actionRemoveExpense}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="booking_id" value={booking.id} /><button type="submit" className="text-xs text-coral hover:underline">remove</button></form>
              </li>
            ))}
          </ul>
          <form action={actionAddExpense} className="mt-3 flex flex-wrap items-end gap-2">
            <input type="hidden" name="booking_id" value={booking.id} />
            <select name="kind" className="field py-1.5 text-sm">{EXPENSE_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}</select>
            <input name="amount_dollars" type="number" min="0" step="1" placeholder="$" className="field w-24 py-1.5 text-sm" />
            <input name="note" placeholder="note" className="field flex-1 py-1.5 text-sm" />
            <input name="paid_by" placeholder="paid by" className="field w-28 py-1.5 text-sm" />
            <button type="submit" className="btn btn-ghost btn-sm">Add</button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <p className="label mb-3">Show P&amp;L</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-ink-dim">Gross (quote)</dt><dd>{$(pnl.gross)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-dim">Players</dt><dd>− {$(pnl.players)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-dim">Expenses</dt><dd>− {$(pnl.expenses)}</dd></div>
              <div className="flex justify-between border-t border-canvas-edge/60 pt-2"><dt>Net to the band</dt><dd className={`wordmark text-2xl ${pnl.net < 0 ? "text-coral" : "text-brass"}`}>{$(pnl.net)}</dd></div>
              <div className="flex justify-between pt-2"><dt className="text-ink-dim">Client has paid</dt><dd>{$(pnl.paidIn)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-dim">Still owed to us</dt><dd className={pnl.owedToBand > 0 ? "text-coral" : "text-teal"}>{$(Math.max(0, pnl.owedToBand))}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-dim">Players still unpaid</dt><dd className={pnl.unpaidPlayers > 0 ? "text-coral" : "text-teal"}>{$(pnl.unpaidPlayers)}</dd></div>
            </dl>
            <form action={actionSetBookingPaid} className="mt-4 flex items-end gap-2">
              <input type="hidden" name="booking_id" value={booking.id} />
              <label className="text-xs text-ink-faint">Client paid so far $<input name="paid_dollars" type="number" min="0" step="1" defaultValue={booking.paid_cents / 100} className="field mt-1 w-32 py-1.5 text-sm" /></label>
              <button type="submit" className="btn btn-ghost btn-sm">Save</button>
            </form>
            <p className="mt-2 text-xs text-ink-faint">Deposits paid through Stripe update this automatically once Stripe is live.</p>
          </div>

          <form action={actionSetBookingRun} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <input type="hidden" name="booking_id" value={booking.id} />
            <p className="label mb-2">Part of a run</p>
            <div className="flex flex-wrap items-end gap-2">
              <select name="run_id" defaultValue={booking.run_id ?? ""} className="field py-1.5 text-sm">
                <option value="">One-off show</option>
                {runs.map((r) => <option key={r.id} value={r.id}>{r.name}{r.starts_on ? ` · ${r.starts_on}` : ""}</option>)}
                <option value="new">New run…</option>
              </select>
              <input name="new_run_name" placeholder="name the run (if new)" className="field flex-1 py-1.5 text-sm" />
              <button type="submit" className="btn btn-ghost btn-sm">Save</button>
            </div>
            <p className="mt-2 text-xs text-ink-faint">Runs roll every show&apos;s P&amp;L into one tour number.</p>
          </form>
        </div>
      </div>
    </section>
  );
}
