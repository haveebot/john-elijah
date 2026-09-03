import Link from "next/link";
import { listBookings, BOOKING_STATUSES, STATUS_LABELS } from "@/lib/db/bookings";
import { actionCreateBooking } from "../actions";

export const dynamic = "force-dynamic";

const LANES = ["inquiry", "quoted", "hold", "confirmed", "deposit_paid"] as const;

export default async function BookingsBoard() {
  const bookings = await listBookings();
  const closed = bookings.filter((b) => !LANES.includes(b.status as (typeof LANES)[number]));

  return (
    <div>
      <p className="label">Bookings</p>
      <h1 className="wordmark mt-2 text-4xl">The pipeline</h1>

      <details className="mt-6 rounded-lg border border-canvas-edge/60 bg-canvas-raised">
        <summary className="cursor-pointer px-5 py-3 text-sm text-ink-dim">Log a booking by hand (phone / text / walk-up)</summary>
        <form action={actionCreateBooking} className="grid grid-cols-1 gap-3 px-5 pb-5 sm:grid-cols-3">
          <input name="contact_name" required placeholder="Contact name" className="field" />
          <input name="contact_email" required type="email" placeholder="Email" className="field" />
          <input name="contact_phone" placeholder="Phone" className="field" />
          <input name="event_date" type="date" className="field" />
          <input name="venue_name" placeholder="Venue" className="field" />
          <input name="city" placeholder="City" className="field" />
          <select name="configuration" className="field" defaultValue="full_band">
            <option value="solo">Solo</option>
            <option value="duo">Duo</option>
            <option value="trio">Trio</option>
            <option value="four_piece">Four-piece</option>
            <option value="full_band">Full band</option>
          </select>
          <select name="event_kind" className="field" defaultValue="venue">
            <option value="venue">Venue</option>
            <option value="private">Private</option>
            <option value="wedding">Wedding</option>
            <option value="corporate">Corporate</option>
            <option value="festival">Festival</option>
            <option value="other">Other</option>
          </select>
          <input name="source" placeholder="Source (phone, text, PSC…)" className="field" />
          <textarea name="details" placeholder="Details" rows={2} className="field sm:col-span-3" />
          <button type="submit" className="btn btn-brass btn-sm sm:col-span-3 sm:justify-self-start">Add to pipeline</button>
        </form>
      </details>

      <div className="mt-8 grid grid-cols-1 gap-4 overflow-x-auto md:grid-cols-3 xl:grid-cols-5">
        {LANES.map((status) => {
          const lane = bookings.filter((b) => b.status === status);
          return (
            <div key={status} className="min-w-[220px] rounded-lg border border-canvas-edge/60 bg-canvas-raised p-3">
              <p className="label mb-3 flex items-center justify-between">
                {STATUS_LABELS[status]}
                <span className="text-ink-dim">{lane.length}</span>
              </p>
              <div className="flex flex-col gap-2">
                {lane.map((b) => (
                  <Link key={b.id} href={`/hq/bookings/${b.id}`} className="rounded-md border border-canvas-edge/60 bg-canvas p-3 transition-colors hover:border-brass/60">
                    <p className="wordmark text-base leading-snug">{b.venue_name || b.contact_name}</p>
                    <p className="mt-1 text-xs text-ink-dim">
                      {[b.event_date ?? "date TBD", b.city, b.configuration?.replace("_", " ")].filter(Boolean).join(" · ")}
                    </p>
                    <p className="label mt-2">
                      {b.event_kind}
                      {b.quote_cents ? ` · $${(b.quote_cents / 100).toFixed(0)}` : b.budget_cents ? ` · ~$${(b.budget_cents / 100).toFixed(0)}` : ""}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {closed.length > 0 ? (
        <section className="mt-10">
          <h2 className="label mb-3">Closed · {closed.length}</h2>
          <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
            {closed.map((b) => (
              <li key={b.id}>
                <Link href={`/hq/bookings/${b.id}`} className="flex items-baseline justify-between px-5 py-3 hover:bg-canvas">
                  <span className="text-sm">{b.event_date ?? "—"} · {b.venue_name || b.contact_name}</span>
                  <span className="label">{STATUS_LABELS[b.status as keyof typeof STATUS_LABELS] ?? b.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="mt-6 text-xs text-ink-faint">Statuses: {BOOKING_STATUSES.map((s) => STATUS_LABELS[s]).join(" → ")}</p>
    </div>
  );
}
