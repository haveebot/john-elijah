import Link from "next/link";
import { notFound } from "next/navigation";
import { getBooking, listBookingEvents, listConfigurations, listTravelBands, BOOKING_STATUSES, STATUS_LABELS } from "@/lib/db/bookings";
import { estimateCents, dollars } from "@/lib/quote";
import { depositUrl } from "@/lib/deposit";
import { stripeEnabled } from "@/lib/stripe";
import { getShowForBooking } from "@/lib/db/shows";
import { mailEnabled } from "@/lib/mail";
import {
  actionSetBookingStatus,
  actionAddBookingNote,
  actionSetBookingQuote,
  actionUpdateBookingDetails,
  actionPromoteToShow,
  actionSendQuoteEmail,
  actionUpdateBookingTravel,
} from "../../actions";

export const dynamic = "force-dynamic";

export default async function BookingDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const [booking, events, configs, bands, show] = await Promise.all([
    getBooking(id),
    listBookingEvents(id),
    listConfigurations(),
    listTravelBands(),
    getShowForBooking(id),
  ]);
  if (!booking) notFound();

  const config = configs.find((c) => c.key === booking.configuration);
  const band = bands.find((b) => b.key === booking.travel_band);
  const suggested = config
    ? estimateCents({ baseCents: config.base_cents, hours: booking.hours ? Number(booking.hours) : null, travelFeeCents: band?.fee_cents ?? 0 })
    : null;

  return (
    <div className="max-w-4xl">
      <Link href="/hq/bookings" className="label brass-link">← Pipeline</Link>
      <h1 className="wordmark mt-4 text-4xl">{booking.venue_name || booking.contact_name}</h1>
      <p className="label mt-2">
        {booking.contact_name} · <a href={`mailto:${booking.contact_email}`} className="brass-link">{booking.contact_email}</a>
        {booking.contact_phone ? ` · ${booking.contact_phone}` : ""} · via {booking.source}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {BOOKING_STATUSES.map((status) => (
          <form key={status} action={actionSetBookingStatus}>
            <input type="hidden" name="id" value={booking.id} />
            <input type="hidden" name="status" value={status} />
            <button
              type="submit"
              className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                booking.status === status
                  ? "border-brass bg-brass text-canvas"
                  : "border-canvas-edge text-ink-dim hover:border-ink-faint hover:text-ink"
              }`}
            >
              {STATUS_LABELS[status]}
            </button>
          </form>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* the night */}
        <form action={actionUpdateBookingDetails} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
          <input type="hidden" name="id" value={booking.id} />
          <p className="label mb-3">The night</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-ink-faint">Date<input name="event_date" type="date" defaultValue={booking.event_date ?? ""} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Start<input name="start_time" defaultValue={booking.start_time} placeholder="8:00 PM" className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Hours<input name="hours" type="number" step="0.5" min="0" defaultValue={booking.hours ?? ""} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Kind
              <select name="event_kind" defaultValue={booking.event_kind} className="field mt-1">
                {["venue", "private", "wedding", "corporate", "festival", "other"].map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>
            <label className="text-xs text-ink-faint">Venue<input name="venue_name" defaultValue={booking.venue_name} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">City<input name="city" defaultValue={booking.city} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint col-span-2">Lineup
              <select name="configuration" defaultValue={booking.configuration ?? ""} className="field mt-1">
                <option value="">—</option>
                {configs.map((c) => <option key={c.key} value={c.key}>{c.label} — ${(c.base_cents / 100).toFixed(0)}</option>)}
              </select>
            </label>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div><dt className="label">Crowd</dt><dd className="mt-1 text-ink-dim">{booking.guests ?? "—"}</dd></div>
            <div><dt className="label">Their budget</dt><dd className="mt-1 text-ink-dim">{booking.budget_cents ? `$${(booking.budget_cents / 100).toFixed(0)}` : "—"}</dd></div>
            <div><dt className="label">Site estimate shown</dt><dd className="mt-1 text-ink-dim">{booking.estimate_cents ? dollars(booking.estimate_cents) : "—"}</dd></div>
            <div><dt className="label">Travel</dt><dd className="mt-1 text-ink-dim">{band ? band.label : "—"}</dd></div>
          </dl>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-ink-dim">{booking.details || "No details given."}</p>
          <button type="submit" className="btn btn-ghost btn-sm mt-4">Save the night</button>
        </form>

        {/* money + promote */}
        <div className="space-y-6">
          <form action={actionSetBookingQuote} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <input type="hidden" name="id" value={booking.id} />
            <p className="label mb-3">The number</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-ink-faint">Quote $
                <input name="quote_dollars" type="number" min="0" step="1" defaultValue={booking.quote_cents ? booking.quote_cents / 100 : suggested ? suggested / 100 : ""} className="field mt-1" />
              </label>
              <label className="text-xs text-ink-faint">Deposit $
                <input name="deposit_dollars" type="number" min="0" step="1" defaultValue={booking.deposit_cents ? booking.deposit_cents / 100 : ""} className="field mt-1" />
              </label>
            </div>
            {suggested ? <p className="mt-2 text-xs text-ink-faint">Rate card math for {config?.label}{booking.hours ? ` · ${booking.hours}h` : ""}{band ? ` · ${band.label}` : ""}: {dollars(suggested)}</p> : null}
            <button type="submit" className="btn btn-brass btn-sm mt-4">Set quote</button>
          </form>

          <form action={actionUpdateBookingTravel} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <input type="hidden" name="id" value={booking.id} />
            <p className="label mb-2">Travel band</p>
            <div className="flex gap-2">
              <select name="travel_band" defaultValue={booking.travel_band ?? ""} className="field">
                <option value="">—</option>
                {bands.map((b) => <option key={b.key} value={b.key}>{b.label} (+${(b.fee_cents / 100).toFixed(0)})</option>)}
              </select>
              <button type="submit" className="btn btn-ghost btn-sm whitespace-nowrap">Set</button>
            </div>
          </form>

          {booking.deposit_cents ? (
            <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
              <p className="label mb-2">Deposit link</p>
              {booking.deposit_paid_at ? (
                <p className="text-sm text-teal">Paid {new Date(booking.deposit_paid_at).toLocaleString()}.</p>
              ) : stripeEnabled() ? (
                <p className="break-all text-xs text-ink-dim">{depositUrl(booking.id)}<span className="label mt-2 block">Included automatically in the quote email.</span></p>
              ) : (
                <p className="text-xs text-ink-faint">Stripe isn&apos;t connected — the link switches on with the keys. Signed per booking; safe to send once live.</p>
              )}
            </div>
          ) : null}

          <form action={actionSendQuoteEmail} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <input type="hidden" name="id" value={booking.id} />
            <p className="label mb-2">Send the quote</p>
            <p className="text-xs text-ink-faint">
              {mailEnabled()
                ? `Emails ${booking.contact_email} the quote, deposit, and date hold; logs it here.`
                : "Mail isn't connected yet — this opens a pre-written email in your mail app instead."}
            </p>
            {mailEnabled() ? (
              <button type="submit" disabled={!booking.quote_cents} className="btn btn-ghost btn-sm mt-3 disabled:opacity-40">Email quote</button>
            ) : (
              <a
                className="btn btn-ghost btn-sm mt-3"
                href={`mailto:${booking.contact_email}?subject=${encodeURIComponent(`John Elijah Band — ${booking.event_date ?? "your date"}`)}&body=${encodeURIComponent(quoteBody(booking.contact_name, config?.label ?? "the band", booking.event_date, booking.venue_name, booking.quote_cents, booking.deposit_cents))}`}
              >
                Draft in mail app
              </a>
            )}
          </form>

          <form action={actionPromoteToShow} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <input type="hidden" name="id" value={booking.id} />
            <p className="label mb-2">On the public calendar</p>
            {show ? (
              <p className="text-sm text-ink-dim">
                Listed: {show.date} · {show.venue_name} · {show.is_public ? "public" : "hidden"}. Manage on <Link href="/hq/shows" className="brass-link text-ink">Shows</Link>.
              </p>
            ) : (
              <>
                <p className="text-xs text-ink-faint">Creates a show row from this booking (needs a date + venue). Private events post as hidden.</p>
                <label className="mt-3 flex items-center gap-2 text-sm text-ink-dim">
                  <input type="checkbox" name="is_public" defaultChecked={booking.event_kind === "venue" || booking.event_kind === "festival"} /> Show it on the site
                </label>
                <button type="submit" disabled={!booking.event_date} className="btn btn-ghost btn-sm mt-3 disabled:opacity-40">Add to calendar</button>
              </>
            )}
          </form>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="label mb-4">Activity</h2>
        <form action={actionAddBookingNote} className="mb-5 flex gap-3">
          <input type="hidden" name="id" value={booking.id} />
          <input name="body" placeholder="Add a note…" className="field flex-1" />
          <button type="submit" className="btn btn-ghost btn-sm">Note it</button>
        </form>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {events.map((event) => (
            <li key={event.id} className="px-5 py-3">
              <p className="whitespace-pre-wrap text-sm text-ink-dim">{event.body}</p>
              <p className="label mt-1">{event.kind} · {new Date(event.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function quoteBody(
  name: string,
  lineup: string,
  date: string | null,
  venue: string,
  quoteCents: number | null,
  depositCents: number | null,
): string {
  const lines = [
    `Hi ${name},`,
    ``,
    `Thanks for reaching out. Here's where we land for ${lineup}${date ? ` on ${date}` : ""}${venue ? ` at ${venue}` : ""}:`,
    ``,
    quoteCents ? `Rate: $${(quoteCents / 100).toFixed(0)}` : `Rate: (to fill in)`,
    depositCents ? `Deposit to hold the date: $${(depositCents / 100).toFixed(0)}` : `Deposit to hold the date: (to fill in)`,
    ``,
    `Say the word and we'll hold it.`,
    ``,
    `— John Elijah Band`,
  ];
  return lines.join("\n");
}
