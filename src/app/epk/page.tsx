import Image from "next/image";
import Link from "next/link";
import { SiteNav, SiteFooter, Wordmark, LoneStarBadge } from "@/components/site-chrome";
import { VideoEmbed } from "@/components/video-embed";
import { StagePlot } from "@/components/stage-plot";
import { SITE } from "@/lib/site";
import { listConfigurations } from "@/lib/db/bookings";
import { listBandMembers, listPress, listReleases } from "@/lib/db/music";
import { listFeaturedAssets, getHeroAsset } from "@/lib/db/gallery";
import { listFeaturedVideos } from "@/lib/db/videos";
import { listUpcomingShows } from "@/lib/db/shows";

export const revalidate = 3600;
export const metadata = {
  title: "Electronic press kit",
  description: `${SITE.bandName} — EPK: bio, photos, stage plots, tech rider, music, video, and booking for talent buyers.`,
};

export default async function EpkPage() {
  const [configs, members, press, releases, photos, hero, videos, shows] = await Promise.all([
    listConfigurations(true),
    listBandMembers(),
    listPress(),
    listReleases(),
    listFeaturedAssets(6),
    getHeroAsset(),
    listFeaturedVideos(3),
    listUpcomingShows(8),
  ]);
  const lead = members[0];
  const release = releases[0];

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 py-14 print:py-6">
        {/* header */}
        <header className="grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="label">Electronic press kit · {new Date().getFullYear()}</p>
            <h1 className="mt-2"><Wordmark size="lg" /></h1>
            <p className="script mt-2 text-3xl text-brass">{SITE.tagline}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <LoneStarBadge />
              <span className="label">{SITE.origin} · books {SITE.bookingRadius.toLowerCase()}</span>
            </div>
          </div>
          {hero ? (
            <div className="relative aspect-[3/2] overflow-hidden rounded-lg border border-canvas-edge/60">
              <Image src={hero.blob_url} alt={hero.alt} fill sizes="(max-width: 768px) 100vw, 40vw" className="object-cover" priority />
            </div>
          ) : null}
        </header>

        {/* quick facts */}
        <section className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Sound", "Blues & soul originals with rock, reggae and funk edges"],
            ["Lineups", configs.map((c) => c.label).join(" · ")],
            ["Set length", "Up to 3 hours; 45–90 min festival sets"],
            ["Booking", `${SITE.bookingRadius} · quote within a day`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-4">
              <p className="label">{k}</p>
              <p className="mt-1 text-sm text-ink-dim">{v}</p>
            </div>
          ))}
        </section>

        {/* bio */}
        <section className="mt-12 grid gap-8 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="label">Bio</p>
            <p className="wordmark mt-2 text-3xl">{lead?.name}</p>
            <p className="label mt-1">{lead?.instrument} · {lead?.hometown}</p>
            <ul className="mt-4 space-y-1 text-sm text-ink-dim">
              {members.slice(1).map((m) => (
                <li key={m.id}><span className="text-ink">{m.name}</span> — {m.instrument}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 leading-relaxed text-ink-dim">
            {(lead?.bio ?? "").split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
            <blockquote className="border-l-2 border-brass/60 pl-4 text-sm italic">
              “No joke, this is easily one of the best bands I&apos;ve ever gotten to play with. Blues, soul, R&amp;B, rock, reggae — deep grooves and tons of original music, with an improvisational depth that&apos;s really exciting.”
              <span className="label mt-1 block not-italic">— Kris Redus, producer / studio drummer</span>
            </blockquote>
          </div>
        </section>

        {/* music + video */}
        <section className="mt-12 grid gap-8 md:grid-cols-2">
          {release ? (
            <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
              <p className="label">The record</p>
              <div className="mt-3 flex gap-4">
                {release.cover_asset_url || release.cover_url ? (
                  <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded">
                    <Image src={release.cover_asset_url || (release.cover_url as string)} alt={`${release.title} cover`} fill sizes="112px" className="object-cover" />
                  </div>
                ) : null}
                <div>
                  <p className="script text-3xl text-brass">{release.title}</p>
                  <p className="text-sm text-ink-dim">{release.released_on?.slice(0, 4)} · {release.tracks?.length} originals · tracked live</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {release.spotify_id ? <a className="btn btn-ghost btn-sm" href={`https://open.spotify.com/album/${release.spotify_id}`} target="_blank" rel="noopener noreferrer">Spotify</a> : null}
                    <Link className="btn btn-ghost btn-sm" href="/music">All music</Link>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
            <p className="label">Watch</p>
            <div className="mt-3 grid gap-3">
              {videos.slice(0, 2).map((v, i) => (
                <VideoEmbed key={v.id} youtubeId={v.youtube_id} title={v.title} priority={i === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* photos */}
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <p className="label">Approved photos · full-size downloads · credit {SITE.photographer.name}</p>
            <Link href="/photos" className="brass-link text-sm text-ink-dim hover:text-ink">All photos →</Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-1.5 md:grid-cols-6">
            {photos.map((a) => (
              <a key={a.id} href={a.blob_url} target="_blank" rel="noopener noreferrer" download className="group relative aspect-square overflow-hidden bg-canvas-raised">
                <Image src={a.thumb_url || a.blob_url} alt={a.alt} fill sizes="(max-width: 768px) 33vw, 16vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
              </a>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-faint">Tap a photo for the 2400px file. Print-resolution originals on request. Photo credit: <a href={SITE.photographer.url} target="_blank" rel="noopener noreferrer" className="brass-link text-ink-dim">{SITE.photographer.name}</a>.</p>
        </section>

        {/* stage plots + rider */}
        <section className="mt-12">
          <p className="label">Stage plots &amp; input lists</p>
          <div className="mt-3 grid gap-4 md:grid-cols-3">
            {configs.filter((c) => ["solo", "trio", "full_band"].includes(c.key)).map((c) => (
              <StagePlot key={c.key} configuration={c.key} label={c.label} />
            ))}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 text-sm text-ink-dim">
              <p className="label mb-2">Hospitality &amp; logistics</p>
              <ul className="space-y-1">
                <li>· Load-in 90 minutes before downbeat for band shows; 45 for solo.</li>
                <li>· Band travels self-contained (backline, monitors on request for rooms without PA).</li>
                <li>· Parking for one van + trailer close to load-in.</li>
                <li>· Water on stage; a meal for the lineup on 3-hour nights.</li>
                <li>· Deposit holds the date; balance at the show.</li>
              </ul>
            </div>
            <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 text-sm text-ink-dim">
              <p className="label mb-2">Sound &amp; power</p>
              <ul className="space-y-1">
                <li>· Any FOH system that covers the room; we bring an engineer for full-band festival sets when needed.</li>
                <li>· Two 20A circuits on stage for the full band.</li>
                <li>· Sound-check 30 minutes; doors can open during it.</li>
                <li>· Full band can run a house mix on 5 wedges or an IEM split.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* shows + press */}
        <section className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <p className="label">On the calendar</p>
            <ul className="setlist mt-3 rounded-lg border border-canvas-edge/60 bg-canvas-raised text-sm">
              {shows.map((s) => (
                <li key={s.id} className="px-4 py-2.5">{s.date} · <span className="text-ink">{s.venue_name}</span>{s.city ? ` · ${s.city}` : ""}</li>
              ))}
              {shows.length === 0 ? <li className="px-4 py-2.5 text-ink-faint">Dates posting — <Link href="/shows" className="brass-link text-ink">calendar</Link>.</li> : null}
            </ul>
          </div>
          <div>
            <p className="label">Press</p>
            <ul className="setlist mt-3 rounded-lg border border-canvas-edge/60 bg-canvas-raised text-sm">
              {press.map((p) => (
                <li key={p.id} className="px-4 py-2.5">
                  {p.url ? <a href={p.url} target="_blank" rel="noopener noreferrer" className="brass-link text-ink">{p.title}</a> : p.title}
                  <span className="label ml-2">{p.outlet}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* contact */}
        <section className="mt-14 rounded-lg border border-brass/40 bg-canvas-raised p-8 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="script text-3xl text-brass">Booking</p>
            <p className="mt-2 text-ink-dim">
              <a href="mailto:booking@johnelijahmusic.com" className="brass-link text-ink">booking@johnelijahmusic.com</a>
              {" · "}
              <a href="tel:+12107481271" className="brass-link text-ink">210-748-1271</a>
              {" · "}
              <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="brass-link text-ink">{SITE.instagramHandle}</a>
            </p>
          </div>
          <Link href="/book" className="btn btn-brass mt-5 whitespace-nowrap md:mt-0">Book the band</Link>
        </section>
        <p className="label mt-6 print:hidden">Press ⌘P / Ctrl+P for a one-sheet PDF of this page.</p>
      </main>
      <SiteFooter />
    </>
  );
}
