import Link from "next/link";
import { notFound } from "next/navigation";
import { getVenue, listVenueContacts, listVenueActivity, VENUE_KINDS, VENUE_STATUSES, REGIONS, REGION_LABELS } from "@/lib/db/venues";
import { firstTouch, suggestLineup } from "@/lib/outreach";
import { mailEnabled } from "@/lib/mail";
import { getCurrentOperator } from "@/lib/auth/session";
import { actionUpdateVenue, actionSetVenueStatus, actionAddVenueContact, actionDeleteVenueContact, actionAddVenueNote, actionSendVenueEmail, actionBookingFromVenue, actionEnrichVenue } from "../../actions";

export const dynamic = "force-dynamic";

export default async function VenueDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();
  const [venue, contacts, activity, who] = await Promise.all([getVenue(id), listVenueContacts(id), listVenueActivity(id), getCurrentOperator()]);
  if (!venue) notFound();

  const recipients = [
    ...contacts.filter((c) => c.email).map((c) => ({ email: c.email, label: `${c.name || c.role} <${c.email}>`, name: c.name })),
    ...(venue.email && !contacts.some((c) => c.email === venue.email) ? [{ email: venue.email, label: `venue <${venue.email}>`, name: "" }] : []),
  ];
  const draft = firstTouch(venue, { toName: contacts.find((c) => c.name)?.name, from: who?.name ?? "Winston" });

  return (
    <div className="max-w-5xl">
      <Link href="/hq/venues" className="label brass-link">← Venues</Link>
      <h1 className="wordmark mt-4 text-4xl">{venue.name}</h1>
      <p className="label mt-2">{venue.city || "city?"} · {REGION_LABELS[venue.region] ?? venue.region} · {venue.kind.replace("_", " ")} · fit {venue.score}{venue.website ? <> · <a href={venue.website} target="_blank" rel="noopener noreferrer" className="brass-link text-brass">site</a></> : null}{venue.phone ? ` · ${venue.phone}` : ""}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {VENUE_STATUSES.map((s) => (
          <form key={s} action={actionSetVenueStatus}>
            <input type="hidden" name="id" value={venue.id} />
            <input type="hidden" name="status" value={s} />
            <button type="submit" className={`rounded-full border px-3.5 py-1.5 text-xs uppercase tracking-wider transition-colors ${venue.status === s ? "border-brass bg-brass text-canvas" : "border-canvas-edge text-ink-dim hover:border-ink-faint hover:text-ink"}`}>{s}</button>
          </form>
        ))}
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {/* the room */}
        <form action={actionUpdateVenue} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
          <input type="hidden" name="id" value={venue.id} />
          <p className="label mb-3">The room</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-ink-faint col-span-2">Name<input name="name" defaultValue={venue.name} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">City<input name="city" defaultValue={venue.city} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Region<select name="region" defaultValue={venue.region} className="field mt-1">{REGIONS.map((r) => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}</select></label>
            <label className="text-xs text-ink-faint">Kind<select name="kind" defaultValue={venue.kind} className="field mt-1">{VENUE_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select></label>
            <label className="text-xs text-ink-faint">Capacity<input name="capacity" type="number" defaultValue={venue.capacity ?? ""} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint col-span-2">Address<input name="address" defaultValue={venue.address} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Website<input name="website" defaultValue={venue.website ?? ""} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Phone<input name="phone" defaultValue={venue.phone} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Venue email (published)<input name="email" defaultValue={venue.email} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Fit score 0–100<input name="score" type="number" min="0" max="100" defaultValue={venue.score} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Instagram<input name="instagram" defaultValue={venue.instagram ?? ""} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Next touch<input name="next_touch_at" type="date" defaultValue={venue.next_touch_at ?? ""} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint col-span-2">Notes<textarea name="notes" defaultValue={venue.notes} rows={3} className="field mt-1" /></label>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="submit" className="btn btn-ghost btn-sm">Save room</button>
          </div>
        </form>

        <div className="space-y-6">
          {/* contacts */}
          <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <div className="flex items-center justify-between">
              <p className="label">People</p>
              {venue.website ? (
                <form action={actionEnrichVenue}>
                  <input type="hidden" name="id" value={venue.id} />
                  <button type="submit" className="btn btn-ghost btn-sm">Scan site for emails</button>
                </form>
              ) : null}
            </div>
            <ul className="setlist mt-3 text-sm">
              {contacts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                  <span><span className="text-ink">{c.name || "—"}</span> <span className="text-ink-dim">· {c.role}{c.email ? ` · ${c.email}` : ""}{c.phone ? ` · ${c.phone}` : ""}</span> <span className="label ml-1">{c.source}{c.verified ? " · verified" : ""}</span></span>
                  <form action={actionDeleteVenueContact}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="venue_id" value={venue.id} /><button className="text-xs text-coral hover:underline">remove</button></form>
                </li>
              ))}
              {contacts.length === 0 ? <li className="py-2 text-ink-faint">No people yet — scan the site, or add what you find.</li> : null}
            </ul>
            <form action={actionAddVenueContact} className="mt-3 grid grid-cols-2 gap-2">
              <input type="hidden" name="venue_id" value={venue.id} />
              <input name="name" placeholder="Name" className="field py-1.5 text-sm" />
              <select name="role" className="field py-1.5 text-sm" defaultValue="booker">{["booker", "owner", "manager", "events", "general"].map((r) => <option key={r} value={r}>{r}</option>)}</select>
              <input name="email" placeholder="Email (as found, never guessed)" className="field py-1.5 text-sm" />
              <input name="phone" placeholder="Phone" className="field py-1.5 text-sm" />
              <button type="submit" className="btn btn-ghost btn-sm justify-self-start">Add person</button>
            </form>
          </div>

          {/* outreach */}
          <form action={actionSendVenueEmail} className="rounded-lg border border-brass/40 bg-canvas-raised p-6">
            <input type="hidden" name="id" value={venue.id} />
            <p className="label mb-2">First touch · suggested lineup: {suggestLineup(venue)}</p>
            <label className="text-xs text-ink-faint">To
              <select name="to" className="field mt-1" defaultValue={recipients[0]?.email ?? ""}>
                {recipients.length === 0 ? <option value="">No email on file</option> : null}
                {recipients.map((r) => <option key={r.email} value={r.email}>{r.label}</option>)}
              </select>
            </label>
            <label className="mt-3 block text-xs text-ink-faint">Subject<input name="subject" defaultValue={draft.subject} className="field mt-1" /></label>
            <label className="mt-3 block text-xs text-ink-faint">Message<textarea name="text" defaultValue={draft.text} rows={14} className="field mt-1 font-mono text-xs" /></label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button type="submit" disabled={!mailEnabled() || recipients.length === 0} className="btn btn-brass btn-sm disabled:opacity-40">Send from booking@</button>
              <span className="text-xs text-ink-faint">{mailEnabled() ? "Logs here, marks the room contacted, sets a 7-day follow-up." : "Mail isn't connected."}</span>
            </div>
          </form>

          <form action={actionBookingFromVenue} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-6">
            <input type="hidden" name="id" value={venue.id} />
            <p className="label mb-2">They said yes?</p>
            <p className="text-xs text-ink-faint">Creates a booking in the pipeline pre-filled from this room and marks it booked.</p>
            <div className="mt-3 flex gap-2">
              <input name="event_date" type="date" className="field w-44" />
              <button type="submit" className="btn btn-ghost btn-sm">Start the booking</button>
            </div>
          </form>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="label mb-4">Activity</h2>
        <form action={actionAddVenueNote} className="mb-5 flex gap-3">
          <input type="hidden" name="id" value={venue.id} />
          <input name="body" placeholder="Add a note (call, reply, gut feel)…" className="field flex-1" />
          <button type="submit" className="btn btn-ghost btn-sm">Note it</button>
        </form>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {activity.map((a) => (
            <li key={a.id} className="px-5 py-3">
              <p className="whitespace-pre-wrap text-sm text-ink-dim">{a.body}</p>
              <p className="label mt-1">{a.kind}{a.by_name ? ` · ${a.by_name}` : ""} · {new Date(a.created_at).toLocaleString()}</p>
            </li>
          ))}
          {activity.length === 0 ? <li className="px-5 py-3 text-sm text-ink-faint">Quiet so far.</li> : null}
        </ul>
      </section>
    </div>
  );
}
