import Link from "next/link";
import Image from "next/image";
import { SiteNav, SiteFooter, Wordmark, LoneStarBadge } from "@/components/site-chrome";
import { ShowRow, ResidencyRow } from "@/components/show-row";
import { SubscribeForm } from "@/components/subscribe-form";
import { SITE } from "@/lib/site";
import { listUpcomingShows, listResidencies } from "@/lib/db/shows";
import { listReleases } from "@/lib/db/music";
import { getHeroAsset, listFeaturedAssets } from "@/lib/db/gallery";
import { listConfigurations } from "@/lib/db/bookings";
import { listLiveProducts } from "@/lib/db/commerce";

export const revalidate = 3600; // static, refreshed hourly — no per-request DB

export default async function HomePage() {
  const [shows, residencies, releases, hero, featured, configs, products] = await Promise.all([
    listUpcomingShows(6),
    listResidencies(),
    listReleases(),
    getHeroAsset(),
    listFeaturedAssets(8),
    listConfigurations(true),
    listLiveProducts(),
  ]);
  const release = releases[0];

  return (
    <>
      <div className="stage-hairline" aria-hidden />
      <SiteNav />
      <main>
        {/* ── Act I: the stage — full-frame photo, wordmark rising out of the light ── */}
        <section className="relative flex min-h-[92vh] flex-col justify-end overflow-hidden">
          {hero ? (
            <Image
              src={hero.blob_url}
              alt={hero.alt || `${SITE.name} on stage`}
              fill
              priority
              sizes="100vw"
              className="hero-drift object-cover object-center"
            />
          ) : (
            <div className="absolute inset-0 bg-canvas-raised" aria-hidden />
          )}
          <div className="stage-veil absolute inset-0" aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-40 md:pb-24">
            <p className="script text-3xl text-brass md:text-5xl">Blues &amp; soul, live</p>
            <h1 className="mt-2">
              <Wordmark size="xl" />
            </h1>
            <LoneStarBadge size="lg" className="mt-5" />
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-ink-dim">
              Originals rooted in blues and soul, out of {SITE.origin}. Full band to solo
              acoustic — anywhere in Texas.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/book" className="btn btn-brass">Book the band</Link>
              <Link href="/shows" className="brass-link text-sm text-ink hover:text-ink">
                Next shows →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Shows — the setlist strip ── */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="label mb-2">On the calendar</p>
              <h2 className="wordmark text-3xl md:text-5xl">Next shows</h2>
            </div>
            <Link href="/shows" className="brass-link mb-1 whitespace-nowrap text-sm text-ink-dim hover:text-ink">
              Full calendar →
            </Link>
          </div>
          <div className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
            {residencies.map((r) => (
              <ResidencyRow key={r.id} residency={r} />
            ))}
            {shows.map((s) => (
              <ShowRow key={s.id} show={s} />
            ))}
            {shows.length === 0 && residencies.length === 0 ? (
              <p className="px-5 py-6 text-ink-dim">Dates posting soon.</p>
            ) : null}
          </div>
        </section>

        {/* ── The record ── */}
        {release ? (
          <section className="border-y border-canvas-edge/60 bg-canvas-raised">
            <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:items-center">
              <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-md border border-canvas-edge/60">
                {release.cover_asset_url || release.cover_url ? (
                  <Image
                    src={release.cover_asset_url || (release.cover_url as string)}
                    alt={`${release.title} — album cover`}
                    fill
                    sizes="(max-width: 768px) 90vw, 40vw"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div>
                <p className="label mb-2">The record · {release.released_on?.slice(0, 4)}</p>
                <h2 className="script text-5xl text-brass md:text-7xl">{release.title}</h2>
                <p className="mt-5 max-w-md leading-relaxed text-ink-dim">{release.story}</p>
                <ol className="mt-6 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                  {(release.tracks ?? []).map((t) => (
                    <li key={t.id} className="flex items-baseline gap-3">
                      <span className="label w-5">{String(t.number).padStart(2, "0")}</span>
                      <span>{t.title}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {release.spotify_id ? (
                    <a
                      href={`https://open.spotify.com/album/${release.spotify_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-brass"
                    >
                      Listen on Spotify
                    </a>
                  ) : null}
                  <Link href="/music" className="brass-link text-sm text-ink hover:text-ink">
                    All the music →
                  </Link>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── Photos — edge to edge ── */}
        {featured.length > 0 ? (
          <section className="py-16">
            <div className="mx-auto mb-8 flex max-w-6xl items-end justify-between gap-4 px-5">
              <h2 className="wordmark text-3xl md:text-5xl">From the stage</h2>
              <Link href="/photos" className="brass-link mb-1 whitespace-nowrap text-sm text-ink-dim hover:text-ink">
                All photos →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-1.5 px-1.5 md:grid-cols-4">
              {featured.map((a, i) => (
                <Link
                  key={a.id}
                  href="/photos"
                  className={`group relative overflow-hidden bg-canvas-raised ${i % 5 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"}`}
                >
                  <Image
                    src={a.thumb_url || a.blob_url}
                    alt={a.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* ── Booking — the configurations ── */}
        <section className="mx-auto max-w-6xl px-5 py-20">
          <p className="label mb-2">Booking · {SITE.bookingRadius}</p>
          <h2 className="wordmark text-3xl md:text-5xl">
            Five ways to <span className="brass-text">bring the band</span>
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-ink-dim">
            Bars and clubs, private parties, weddings, festivals, corporate nights. Pick the
            size of the room and the size of the sound follows.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {configs.map((c) => (
              <Link
                key={c.key}
                href={`/book?configuration=${c.key}`}
                className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 transition-colors hover:border-brass/60"
              >
                <p className="wordmark text-2xl">{c.label}</p>
                <p className="mt-2 text-sm text-ink-dim">{c.lineup}</p>
              </Link>
            ))}
          </div>
          <Link href="/book" className="btn btn-brass mt-10">Start a booking</Link>
        </section>

        {/* ── Merch teaser (renders only when something is live) ── */}
        {products.length > 0 ? (
          <section className="border-t border-canvas-edge/60">
            <div className="mx-auto max-w-6xl px-5 py-16">
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="wordmark text-3xl md:text-5xl">Merch</h2>
                <Link href="/shop" className="brass-link mb-1 text-sm text-ink-dim hover:text-ink">
                  The shop →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {products.slice(0, 4).map((p) => (
                  <Link key={p.id} href={`/shop/${p.slug}`} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-4 hover:border-brass/60">
                    {p.hero_url ? (
                      <div className="relative mb-3 aspect-square overflow-hidden rounded">
                        <Image src={p.hero_url} alt={p.title} fill sizes="25vw" className="object-cover" />
                      </div>
                    ) : null}
                    <p className="wordmark text-lg">{p.title}</p>
                    <p className="label mt-1">${(p.price_cents / 100).toFixed(0)}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {/* ── the list ── */}
        <section className="border-t border-canvas-edge/60">
          <div className="mx-auto max-w-6xl px-5 py-16 md:flex md:items-center md:justify-between md:gap-10">
            <div>
              <p className="script text-3xl text-brass">Stay in the loop</p>
              <p className="mt-2 max-w-md text-ink-dim">New dates, new songs, and the occasional shirt. No noise.</p>
            </div>
            <SubscribeForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
