import { listReleases, listBandMembers, listPress } from "@/lib/db/music";
import { actionUpdateReleaseStory, actionUpsertBandMember, actionUpsertPress } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqMusic() {
  const [releases, members, press] = await Promise.all([listReleases(false), listBandMembers(false), listPress(false)]);

  return (
    <div className="max-w-4xl">
      <p className="label">Music</p>
      <h1 className="wordmark mt-2 text-4xl">Records, band, press</h1>

      <section className="mt-8">
        <h2 className="label mb-3">Releases</h2>
        {releases.map((r) => (
          <form key={r.id} action={actionUpdateReleaseStory} className="mb-4 rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
            <input type="hidden" name="slug" value={r.slug} />
            <p className="wordmark text-2xl">{r.title} <span className="label ml-2">{r.kind} · {r.released_on ?? "undated"} · {r.tracks?.length ?? 0} tracks</span></p>
            <textarea name="story" defaultValue={r.story} rows={4} className="field mt-3" />
            <button type="submit" className="btn btn-ghost btn-sm mt-3">Save story</button>
          </form>
        ))}
      </section>

      <section className="mt-10">
        <h2 className="label mb-3">Band members</h2>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {members.map((m) => (
            <li key={m.id} className="px-5 py-3 text-sm">
              <span className="wordmark text-lg">{m.name}</span>
              <span className="ml-3 text-ink-dim">{m.instrument} · {m.hometown} · sort {m.sort}{m.is_active ? "" : " · inactive"}</span>
            </li>
          ))}
        </ul>
        <form action={actionUpsertBandMember} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <input name="name" required placeholder="Name (upserts by name)" className="field" />
          <input name="instrument" placeholder="Instrument" className="field" />
          <input name="hometown" placeholder="Hometown" className="field" />
          <input name="sort" type="number" placeholder="Sort" className="field" />
          <textarea name="bio" placeholder="Bio (blank lines = paragraphs)" rows={3} className="field col-span-full" />
          <label className="flex items-center gap-2 text-sm text-ink-dim"><input type="checkbox" name="is_active" defaultChecked /> Active</label>
          <button type="submit" className="btn btn-ghost btn-sm justify-self-start">Save member</button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="label mb-3">Press</h2>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {press.map((p) => (
            <li key={p.id} className="px-5 py-3 text-sm">
              <span className="wordmark text-lg">{p.title}</span>
              <span className="ml-3 text-ink-dim">{p.outlet} · {p.published_on ?? "undated"} · {p.kind}</span>
            </li>
          ))}
        </ul>
        <form action={actionUpsertPress} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <input name="outlet" required placeholder="Outlet" className="field" />
          <input name="title" required placeholder="Title" className="field" />
          <input name="url" placeholder="URL (upserts by URL)" className="field" />
          <input name="published_on" type="date" className="field" />
          <select name="kind" className="field" defaultValue="web">
            {["web", "print", "radio", "video", "listing"].map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <input name="pull_quote" placeholder="Pull quote" className="field md:col-span-3" />
          <button type="submit" className="btn btn-ghost btn-sm justify-self-start">Save press</button>
        </form>
      </section>
    </div>
  );
}
