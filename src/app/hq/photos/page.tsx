import Image from "next/image";
import { listAllAssets } from "@/lib/db/gallery";
import { actionUpdateAsset, actionToggleAssetFlag } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqPhotos() {
  const assets = await listAllAssets();
  const heroes = assets.filter((a) => a.tags.includes("hero"));

  return (
    <div>
      <p className="label">Photos</p>
      <h1 className="wordmark mt-2 text-4xl">The library · {assets.length}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-dim">
        Tags drive the site: <code className="text-ink">hero</code> = homepage backdrop (first by sort wins, {heroes.length} tagged),
        <code className="ml-1 text-ink">band</code> = band-page strip, <code className="ml-1 text-ink">featured</code> flag = homepage grid. Everything public shows in /photos.
        New photos: <code className="text-ink">npm run import-photos</code> from a local folder (see README).
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {assets.map((a) => (
          <div key={a.id} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-3">
            <div className="relative aspect-[3/2] overflow-hidden rounded bg-canvas">
              <Image src={a.thumb_url || a.blob_url} alt={a.alt} fill sizes="33vw" className="object-cover" />
            </div>
            <form action={actionUpdateAsset} className="mt-3 space-y-2">
              <input type="hidden" name="id" value={a.id} />
              <input name="alt" defaultValue={a.alt} placeholder="Alt text" className="field py-1.5 text-xs" />
              <input name="tags" defaultValue={a.tags.join(", ")} placeholder="tags: hero, stage, crowd, band" className="field py-1.5 text-xs" />
              <div className="flex gap-2">
                <input name="credit" defaultValue={a.credit} placeholder="Photo credit" className="field py-1.5 text-xs" />
                <input name="sort_weight" type="number" defaultValue={a.sort_weight} className="field w-20 py-1.5 text-xs" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="submit" className="btn btn-ghost btn-sm">Save</button>
                <span className="label">{a.width}×{a.height}{a.taken_on ? ` · ${a.taken_on}` : ""}</span>
              </div>
            </form>
            <div className="mt-2 flex gap-2">
              <form action={actionToggleAssetFlag}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="flag" value="featured" />
                <button type="submit" className={`btn btn-sm ${a.featured ? "btn-brass" : "btn-ghost"}`}>{a.featured ? "Featured" : "Feature"}</button>
              </form>
              <form action={actionToggleAssetFlag}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="flag" value="is_public" />
                <button type="submit" className={`btn btn-sm ${a.is_public ? "btn-ghost" : "btn-brass"}`}>{a.is_public ? "Hide" : "Publish"}</button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
