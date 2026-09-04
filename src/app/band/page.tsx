import Image from "next/image";
import Link from "next/link";
import { SiteNav, SiteFooter, SectionHeading, LoneStarBadge } from "@/components/site-chrome";
import { listBandMembers, listPress } from "@/lib/db/music";
import { listAssetsByTag } from "@/lib/db/gallery";
import { SITE } from "@/lib/site";

export const revalidate = 3600;
export const metadata = { title: "The Band" };

export default async function BandPage() {
  const [members, press, portraits] = await Promise.all([
    listBandMembers(),
    listPress(),
    listAssetsByTag("band", 3),
  ]);
  const lead = members.find((m) => m.sort === 1) ?? members[0];
  const rest = members.filter((m) => m.id !== lead?.id);

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-5xl px-5 py-16">
        <SectionHeading label="Who's playing" title="The Band" />

        {portraits.length > 0 ? (
          <div className="mb-12 grid grid-cols-3 gap-1.5">
            {portraits.map((a) => (
              <div key={a.id} className="relative aspect-[4/3] overflow-hidden bg-canvas-raised">
                <Image src={a.thumb_url || a.blob_url} alt={a.alt} fill sizes="33vw" className="object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        {lead ? (
          <section className="grid gap-8 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="script text-4xl text-brass">{lead.name.split(" ")[0]}</p>
              <p className="wordmark mt-1 text-3xl">{lead.name}</p>
              <p className="label mt-2">{lead.instrument} · {lead.hometown}</p>
              <LoneStarBadge className="mt-4" />
            </div>
            <div className="space-y-4 leading-relaxed text-ink-dim">
              <p className="text-ink">
                Hard to put a genre on it. Blues, rock, soul, jazz, R&amp;B and Americana all pass through, and it always comes out sounding like him, smooth, greasy, beautiful. A rough-but-soothing voice, a guitar that raises hair, and the coastal ease of Port Aransas carried into every room. Never the same song twice.
              </p>
              {lead.bio.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
              <blockquote className="border-l-2 border-brass/60 pl-4 text-sm italic">
                “No joke, this is easily one of the best bands I&apos;ve ever gotten to play with. Deep, deep grooves and tons of original music, all with an improvisational depth that&apos;s really exciting. We never know where a song might end up going.”
                <span className="label mt-1 block not-italic">,  Kris Redus, producer / studio drummer</span>
              </blockquote>
            </div>
          </section>
        ) : null}

        <section className="mt-14 rounded-lg border border-brass/30 bg-canvas-raised p-6 md:flex md:items-center md:justify-between md:gap-8">
          <div>
            <p className="script text-3xl text-brass">{SITE.affiliation}</p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-dim">
              John Elijah is part of Lone Star Beer&apos;s artist roster, the National Beer of Texas backing
              Texas music. Venues, festivals, and brands looking for a Lone Star night: that&apos;s this band.
            </p>
          </div>
          <Link href="/book" className="btn btn-brass mt-5 whitespace-nowrap md:mt-0">Book a Lone Star night</Link>
        </section>

        {rest.length > 0 ? (
          <section className="mt-16">
            <p className="label mb-4">The band</p>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {rest.map((m) => (
                <div key={m.id} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
                  <p className="wordmark text-xl">{m.name}</p>
                  <p className="label mt-1">{m.instrument}</p>
                  {m.hometown ? <p className="mt-2 text-sm text-ink-dim">{m.hometown}</p> : null}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {press.length > 0 ? (
          <section className="mt-16">
            <p className="label mb-4">Press &amp; mentions</p>
            <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
              {press.map((p) => (
                <li key={p.id} className="px-5 py-4">
                  <p className="wordmark text-lg">
                    {p.url ? (
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="brass-link hover:text-ink">{p.title}</a>
                    ) : (
                      p.title
                    )}
                  </p>
                  <p className="label mt-1">
                    {p.outlet}
                    {p.published_on ? ` · ${new Date(`${p.published_on}T12:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : ""}
                  </p>
                  {p.pull_quote ? <p className="mt-2 text-sm text-ink-dim">“{p.pull_quote}”</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-16 flex flex-wrap items-center gap-4">
          <Link href="/book" className="btn btn-brass">Book the band</Link>
          <a href={SITE.instagram} target="_blank" rel="noopener noreferrer" className="brass-link text-sm text-ink-dim hover:text-ink">
            {SITE.instagramHandle} on Instagram →
          </a>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
