import { listAllShows, listResidencies } from "@/lib/db/shows";
import { listConfigurations } from "@/lib/db/bookings";
import { actionUpsertShow, actionSetShowStatus, actionToggleShowPublic, actionDeleteShow, actionUpsertResidency, actionToggleResidency } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqShows() {
  const [shows, residencies, configs] = await Promise.all([listAllShows(), listResidencies(false), listConfigurations()]);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = shows.filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const past = shows.filter((s) => s.date < today);

  return (
    <div>
      <p className="label">Shows</p>
      <h1 className="wordmark mt-2 text-4xl">The calendar</h1>

      <form action={actionUpsertShow} className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 md:grid-cols-4">
        <p className="label col-span-full">Add a dated show</p>
        <input name="date" type="date" required className="field" />
        <input name="venue_name" required placeholder="Venue" className="field" />
        <input name="city" placeholder="City" className="field" />
        <input name="start_time" placeholder="8:00 PM" className="field" />
        <input name="venue_url" placeholder="Venue URL" className="field" />
        <input name="ticket_url" placeholder="Ticket URL" className="field" />
        <select name="configuration" className="field" defaultValue="full_band">
          <option value="">Lineup —</option>
          {configs.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
        <select name="kind" className="field" defaultValue="club">
          {["club", "festival", "private", "residency", "special"].map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-ink-dim"><input type="checkbox" name="is_public" defaultChecked /> Public</label>
        <button type="submit" className="btn btn-brass btn-sm justify-self-start">Add show</button>
      </form>

      <section className="mt-10">
        <h2 className="label mb-3">Standing dates (residencies)</h2>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {residencies.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
              <span>
                <span className="wordmark text-lg">{r.venue_name}</span>
                <span className="ml-3 text-ink-dim">{r.weekdays.join(" + ")} · {r.start_time} · {r.label}</span>
              </span>
              <form action={actionToggleResidency}>
                <input type="hidden" name="id" value={r.id} />
                <button type="submit" className={`btn btn-sm ${r.active ? "btn-ghost" : "btn-brass"}`}>{r.active ? "Pause" : "Resume"}</button>
              </form>
            </li>
          ))}
        </ul>
        <form action={actionUpsertResidency} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <input name="venue_name" required placeholder="Venue" className="field" />
          <input name="city" placeholder="City" className="field" />
          <input name="weekdays" required placeholder="fri,sat" className="field" />
          <input name="start_time" placeholder="7:00 PM" className="field" />
          <input name="label" placeholder="Label (e.g. Weekly)" className="field" />
          <input name="venue_url" placeholder="Venue URL" className="field md:col-span-3" />
          <button type="submit" className="btn btn-ghost btn-sm justify-self-start">Add residency</button>
        </form>
      </section>

      <ShowTable title="Upcoming" shows={upcoming} />
      <ShowTable title="Past" shows={past} />
    </div>
  );
}

function ShowTable({ title, shows }: { title: string; shows: Awaited<ReturnType<typeof listAllShows>> }) {
  return (
    <section className="mt-10">
      <h2 className="label mb-3">{title} · {shows.length}</h2>
      <div className="overflow-x-auto rounded-lg border border-canvas-edge/60 bg-canvas-raised">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-canvas-edge/60">
              {["Date", "Venue", "City", "Time", "Kind", "Status", "Public", ""].map((h) => (
                <th key={h} className="label px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-edge/40">
            {shows.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-2.5">{s.date}</td>
                <td className="px-4 py-2.5">{s.venue_name}{s.booking_id ? <span className="label ml-2">#{s.booking_id}</span> : null}</td>
                <td className="px-4 py-2.5 text-ink-dim">{s.city}</td>
                <td className="px-4 py-2.5 text-ink-dim">{s.start_time}</td>
                <td className="px-4 py-2.5 text-ink-dim">{s.kind}</td>
                <td className="px-4 py-2.5">
                  <form action={actionSetShowStatus} className="inline">
                    <input type="hidden" name="id" value={s.id} />
                    <select name="status" defaultValue={s.status} className="field py-1 text-xs" onChange={undefined}>
                      {["confirmed", "tentative", "cancelled"].map((st) => <option key={st} value={st}>{st}</option>)}
                    </select>
                    <button type="submit" className="btn btn-ghost btn-sm ml-1">Set</button>
                  </form>
                </td>
                <td className="px-4 py-2.5">
                  <form action={actionToggleShowPublic}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className={`btn btn-sm ${s.is_public ? "btn-ghost" : "btn-brass"}`}>{s.is_public ? "Hide" : "Show"}</button>
                  </form>
                </td>
                <td className="px-4 py-2.5">
                  <form action={actionDeleteShow}>
                    <input type="hidden" name="id" value={s.id} />
                    <button type="submit" className="text-xs text-coral hover:underline">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {shows.length === 0 ? <tr><td className="px-4 py-3 text-ink-faint" colSpan={8}>None.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
