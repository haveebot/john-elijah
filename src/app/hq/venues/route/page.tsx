import Link from "next/link";
import { listVenues, REGIONS, REGION_LABELS } from "@/lib/db/venues";
import { planRoute, CITY_COORDS } from "@/lib/route";
import { actionQueueStops } from "../../actions";

export const dynamic = "force-dynamic";

export default async function RoutePlanner({ searchParams }: { searchParams: Promise<{ start?: string; nights?: string; max?: string; regions?: string; min?: string }> }) {
  const sp = await searchParams;
  const startKey = (sp.start ?? "port aransas").toLowerCase();
  const nights = Math.max(1, Math.min(10, Number(sp.nights ?? 4) || 4));
  const maxDaily = Math.max(60, Math.min(500, Number(sp.max ?? 220) || 220));
  const minScore = Math.max(0, Math.min(100, Number(sp.min ?? 55) || 55));
  const regions = (sp.regions ?? "").split(",").filter(Boolean);
  const start = CITY_COORDS[startKey] ?? CITY_COORDS["port aransas"];

  const all = await listVenues({ limit: 5000 });
  const pool = regions.length ? all.filter((v) => regions.includes(v.region)) : all;
  const plan = planRoute({ venues: pool, start, startCity: startKey, nights, maxDailyMiles: maxDaily, minScore });

  return (
    <div>
      <Link href="/hq/venues" className="label brass-link">← Venues</Link>
      <h1 className="wordmark mt-3 text-4xl">Route planner</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-dim">
        Pick a start, how many nights, and how far you&apos;ll drive in a day. The planner picks one city a night by fit and distance, names the best room there with alternates, and queues outreach to the whole run in one click. Distances are road estimates, not turn-by-turn.
      </p>

      <form method="get" className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 md:grid-cols-5">
        <label className="text-xs text-ink-faint">Start<select name="start" defaultValue={startKey} className="field mt-1">{Object.keys(CITY_COORDS).map((c) => <option key={c} value={c}>{c.replace(/\b\w/g, (m) => m.toUpperCase())}</option>)}</select></label>
        <label className="text-xs text-ink-faint">Nights<input name="nights" type="number" min="1" max="10" defaultValue={nights} className="field mt-1" /></label>
        <label className="text-xs text-ink-faint">Max miles / day<input name="max" type="number" min="60" max="500" step="10" defaultValue={maxDaily} className="field mt-1" /></label>
        <label className="text-xs text-ink-faint">Min fit<input name="min" type="number" min="0" max="100" defaultValue={minScore} className="field mt-1" /></label>
        <label className="text-xs text-ink-faint">Regions (optional)
          <select name="regions" multiple className="field mt-1 h-24" defaultValue={regions}>
            {REGIONS.map((r) => <option key={r} value={r}>{REGION_LABELS[r]}</option>)}
          </select>
        </label>
        <button type="submit" className="btn btn-brass btn-sm justify-self-start md:col-span-5">Plan it</button>
      </form>

      <div className="mt-8 overflow-x-auto rounded-lg border border-canvas-edge/60 bg-canvas-raised">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead><tr className="border-b border-canvas-edge/60">{["Night", "City", "Room", "Fit", "Drive", "Alternates"].map((h) => <th key={h} className="label px-4 py-3 font-normal">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-canvas-edge/40">
            {plan.stops.map((s) => (
              <tr key={s.night}>
                <td className="px-4 py-2.5 wordmark text-xl">{s.night}</td>
                <td className="px-4 py-2.5">{s.city}</td>
                <td className="px-4 py-2.5"><Link href={`/hq/venues/${s.venue.id}`} className="brass-link text-ink">{s.venue.name}</Link>{(s.venue.email || (s.venue.email_count ?? 0) > 0) ? <span className="label ml-2 text-teal">email</span> : null}</td>
                <td className="px-4 py-2.5 text-ink-dim">{s.venue.score}</td>
                <td className="px-4 py-2.5 text-ink-dim">{s.miles} mi · {s.hours}h</td>
                <td className="px-4 py-2.5 text-ink-dim">{s.alternates.map((a) => a.name).join(" · ") || "—"}</td>
              </tr>
            ))}
            {plan.stops.length > 0 ? <tr><td className="px-4 py-2.5 label" colSpan={4}>Home</td><td className="px-4 py-2.5 text-ink-dim">{plan.homeMiles} mi</td><td className="px-4 py-2.5 label">Total {plan.totalMiles} mi</td></tr> : null}
            {plan.stops.length === 0 ? <tr><td className="px-4 py-3 text-ink-faint" colSpan={6}>No route fits those limits. Raise the daily miles or lower the fit floor.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {plan.stops.length > 0 ? (
        <form action={actionQueueStops} className="mt-4 flex items-center gap-3">
          {plan.stops.flatMap((s) => [s.venue, ...s.alternates]).map((v) => <input key={v.id} type="hidden" name="ids" value={v.id} />)}
          <button type="submit" className="btn btn-brass btn-sm">Draft outreach to every room on this run</button>
          <span className="text-xs text-ink-faint">Drafts land in Outreach for approval; rooms without an address are skipped.</span>
        </form>
      ) : null}
    </div>
  );
}
