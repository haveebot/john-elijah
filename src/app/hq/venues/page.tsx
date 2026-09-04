import Link from "next/link";
import { listVenues, venueCounts, VENUE_KINDS, VENUE_STATUSES, REGIONS, REGION_LABELS } from "@/lib/db/venues";
import { actionCreateVenue } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqVenues({ searchParams }: { searchParams: Promise<{ region?: string; kind?: string; status?: string; q?: string; email?: string }> }) {
  const sp = await searchParams;
  const [venues, counts] = await Promise.all([
    listVenues({ region: sp.region, kind: sp.kind, status: sp.status, q: sp.q, hasEmail: sp.email === "1" }),
    venueCounts(),
  ]);
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
    const s = p.toString();
    return `/hq/venues${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <p className="label">Venues</p>
      <h1 className="wordmark mt-2 text-4xl">The map · {counts.total} rooms</h1>
      <p className="mt-2 text-sm text-ink-dim">
        {counts.withEmail} with an email we actually found · {counts.byStatus.contacted ?? 0} contacted · {counts.byStatus.replied ?? 0} replied · {counts.byStatus.booked ?? 0} booked · {counts.due} due for a follow-up
      </p>

      <p className="mt-3 flex flex-wrap gap-4 text-sm">
        <Link href="/hq/outreach" className="brass-link text-ink">Outreach batch mode →</Link>
        <Link href="/hq/venues/route" className="brass-link text-ink">Route planner →</Link>
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={qs({ region: undefined })} className={`btn btn-sm ${!sp.region ? "btn-brass" : "btn-ghost"}`}>All Texas</Link>
        {REGIONS.filter((r) => counts.byRegion[r]).map((r) => (
          <Link key={r} href={qs({ region: r })} className={`btn btn-sm ${sp.region === r ? "btn-brass" : "btn-ghost"}`}>{REGION_LABELS[r]} · {counts.byRegion[r]}</Link>
        ))}
      </div>
      <form className="mt-3 flex flex-wrap items-center gap-2" action="/hq/venues" method="get">
        {sp.region ? <input type="hidden" name="region" value={sp.region} /> : null}
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search name or city" className="field w-56 py-1.5 text-sm" />
        <select name="kind" defaultValue={sp.kind ?? ""} className="field w-40 py-1.5 text-sm"><option value="">Any kind</option>{VENUE_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
        <select name="status" defaultValue={sp.status ?? ""} className="field w-40 py-1.5 text-sm"><option value="">Any status</option>{VENUE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
        <label className="flex items-center gap-1 text-sm text-ink-dim"><input type="checkbox" name="email" value="1" defaultChecked={sp.email === "1"} /> has email</label>
        <button type="submit" className="btn btn-ghost btn-sm">Filter</button>
      </form>

      <details className="mt-6 rounded-lg border border-canvas-edge/60 bg-canvas-raised">
        <summary className="cursor-pointer px-5 py-3 text-sm text-ink-dim">Add a venue by hand</summary>
        <form action={actionCreateVenue} className="grid grid-cols-2 gap-3 px-5 pb-5 md:grid-cols-4">
          <input name="name" required placeholder="Venue name" className="field" />
          <input name="city" placeholder="City, TX" className="field" />
          <select name="kind" className="field" defaultValue="bar">{VENUE_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
          <input name="website" placeholder="Website" className="field" />
          <input name="email" placeholder="Booking email (only if published)" className="field" />
          <input name="phone" placeholder="Phone" className="field" />
          <input name="capacity" type="number" placeholder="Capacity" className="field" />
          <button type="submit" className="btn btn-brass btn-sm justify-self-start">Add venue</button>
        </form>
      </details>

      <div className="mt-6 overflow-x-auto rounded-lg border border-canvas-edge/60 bg-canvas-raised">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead>
            <tr className="border-b border-canvas-edge/60">
              {["Venue", "City", "Kind", "Contacts", "Status", "Score", "Next touch", "Source"].map((h) => <th key={h} className="label px-4 py-3 font-normal">{h}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-edge/40">
            {venues.map((v) => (
              <tr key={v.id} className="hover:bg-canvas">
                <td className="px-4 py-2.5"><Link href={`/hq/venues/${v.id}`} className="brass-link text-ink">{v.name}</Link>{v.website ? <a href={v.website} target="_blank" rel="noopener noreferrer" className="label ml-2 text-ink-faint">site</a> : null}</td>
                <td className="px-4 py-2.5 text-ink-dim">{v.city}</td>
                <td className="px-4 py-2.5 text-ink-dim">{v.kind.replace("_", " ")}</td>
                <td className="px-4 py-2.5 text-ink-dim">{(v.email ? 1 : 0) + (v.email_count ?? 0)} email{((v.email ? 1 : 0) + (v.email_count ?? 0)) === 1 ? "" : "s"}{v.phone ? " · phone" : ""}</td>
                <td className="px-4 py-2.5"><span className={`label ${v.status === "booked" ? "text-teal" : v.status === "replied" ? "text-brass" : ""}`}>{v.status}</span></td>
                <td className="px-4 py-2.5 text-ink-dim">{v.score}</td>
                <td className="px-4 py-2.5 text-ink-dim">{v.next_touch_at ?? "—"}</td>
                <td className="px-4 py-2.5 text-ink-faint">{v.source}</td>
              </tr>
            ))}
            {venues.length === 0 ? <tr><td className="px-4 py-3 text-ink-faint" colSpan={8}>No rooms match.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
