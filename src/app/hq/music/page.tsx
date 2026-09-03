import { listReleases, listBandMembers, listPress } from "@/lib/db/music";
import { listVideos } from "@/lib/db/videos";
import { actionUpdateReleaseStory, actionUpsertBandMember, actionUpsertPress, actionUpsertVideo, actionToggleVideoFlag, actionDeleteVideo } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqMusic() {
  const [releases, members, press, videos] = await Promise.all([listReleases(false), listBandMembers(false), listPress(false), listVideos(false)]);

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
        <h2 className="label mb-3">Videos · {videos.length}</h2>
        <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
          {videos.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 text-sm">
              <span><span className="wordmark text-lg">{v.title}</span><span className="ml-3 text-ink-dim">{v.kind}{v.duration ? ` · ${v.duration}` : ""} · {v.youtube_id}</span></span>
              <span className="flex gap-2">
                <form action={actionToggleVideoFlag}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="flag" value="featured" /><button className={`btn btn-sm ${v.featured ? "btn-brass" : "btn-ghost"}`}>{v.featured ? "Featured" : "Feature"}</button></form>
                <form action={actionToggleVideoFlag}><input type="hidden" name="id" value={v.id} /><input type="hidden" name="flag" value="is_public" /><button className={`btn btn-sm ${v.is_public ? "btn-ghost" : "btn-brass"}`}>{v.is_public ? "Hide" : "Show"}</button></form>
                <form action={actionDeleteVideo}><input type="hidden" name="id" value={v.id} /><button className="text-xs text-coral hover:underline">Delete</button></form>
              </span>
            </li>
          ))}
        </ul>
        <form action={actionUpsertVideo} className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
          <input name="youtube" required placeholder="YouTube URL or id" className="field md:col-span-2" />
          <input name="title" required placeholder="Title" className="field" />
          <select name="kind" className="field" defaultValue="live">{["live", "studio", "montage", "cover", "other"].map((k) => <option key={k} value={k}>{k}</option>)}</select>
          <label className="flex items-center gap-2 text-sm text-ink-dim"><input type="checkbox" name="featured" /> Featured</label>
          <button type="submit" className="btn btn-ghost btn-sm justify-self-start">Add video</button>
        </form>
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
