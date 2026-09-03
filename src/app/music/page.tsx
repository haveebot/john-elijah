import Image from "next/image";
import { SiteNav, SiteFooter, SectionHeading } from "@/components/site-chrome";
import { listReleases } from "@/lib/db/music";
import { SITE } from "@/lib/site";

export const revalidate = 3600;
export const metadata = { title: "Music" };

function fmt(ms: number | null): string {
  if (!ms) return "";
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default async function MusicPage() {
  const releases = await listReleases();

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 py-16">
        <SectionHeading label="Discography" title="Music" />

        {releases.map((r) => (
          <article key={r.id} className="mb-16 grid gap-10 md:grid-cols-[minmax(0,380px)_1fr]">
            <div className="relative aspect-square w-full overflow-hidden rounded-md border border-canvas-edge/60 bg-canvas-raised">
              {r.cover_asset_url || r.cover_url ? (
                <Image
                  src={r.cover_asset_url || (r.cover_url as string)}
                  alt={`${r.title} — cover`}
                  fill
                  sizes="(max-width: 768px) 90vw, 380px"
                  className="object-cover"
                />
              ) : null}
            </div>
            <div>
              <p className="label">{r.kind} · {r.released_on ? new Date(`${r.released_on}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}</p>
              <h2 className="script mt-1 text-5xl text-brass md:text-6xl">{r.title}</h2>
              <p className="mt-4 max-w-lg leading-relaxed text-ink-dim">{r.story}</p>

              <ol className="setlist mt-6 rounded-lg border border-canvas-edge/60 bg-canvas-raised">
                {(r.tracks ?? []).map((t) => (
                  <li key={t.id} className="flex items-baseline gap-4 px-4 py-2.5 text-sm">
                    <span className="label w-6">{String(t.number).padStart(2, "0")}</span>
                    <span className="flex-1">{t.title}</span>
                    <span className="label">{fmt(t.duration_ms)}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                {r.spotify_id ? (
                  <a href={`https://open.spotify.com/album/${r.spotify_id}`} target="_blank" rel="noopener noreferrer" className="btn btn-brass">
                    Spotify
                  </a>
                ) : null}
                {r.apple_url ? <a href={r.apple_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Apple Music</a> : null}
                {r.youtube_url ? <a href={r.youtube_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">YouTube</a> : null}
                {r.bandcamp_url ? <a href={r.bandcamp_url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">Bandcamp</a> : null}
              </div>

              {r.spotify_id ? (
                <div className="mt-8 overflow-hidden rounded-xl">
                  <iframe
                    title={`${r.title} on Spotify`}
                    src={`https://open.spotify.com/embed/album/${r.spotify_id}?theme=0`}
                    width="100%"
                    height="352"
                    frameBorder="0"
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  />
                </div>
              ) : null}
            </div>
          </article>
        ))}

        <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-8">
          <p className="label">Everything else</p>
          <p className="mt-2 text-ink-dim">
            Live cuts and singles land on the artist page first.
          </p>
          <a href={SITE.spotifyArtistUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost mt-5">
            John Elijah on Spotify
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
