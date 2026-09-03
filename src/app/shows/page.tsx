import Link from "next/link";
import { SiteNav, SiteFooter, SectionHeading } from "@/components/site-chrome";
import { ShowRow, ResidencyRow } from "@/components/show-row";
import { listUpcomingShows, listPastShows, listResidencies } from "@/lib/db/shows";
import { EventsJsonLd } from "@/components/json-ld";

export const revalidate = 3600;
export const metadata = { title: "Shows" };

export default async function ShowsPage() {
  const [upcoming, past, residencies] = await Promise.all([
    listUpcomingShows(60),
    listPastShows(24),
    listResidencies(),
  ]);

  return (
    <>
      <SiteNav />
      <EventsJsonLd shows={upcoming} />
      <main className="mx-auto max-w-4xl px-5 py-16">
        <SectionHeading label="Calendar" title="Shows" />

        {residencies.length > 0 ? (
          <section className="mb-12">
            <p className="label mb-3">Standing dates</p>
            <div className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
              {residencies.map((r) => (
                <ResidencyRow key={r.id} residency={r} />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <p className="label mb-3">Upcoming</p>
          <div className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
            {upcoming.map((s) => (
              <ShowRow key={s.id} show={s} />
            ))}
            {upcoming.length === 0 ? (
              <p className="px-5 py-6 text-ink-dim">
                Nothing dated beyond the standing gigs right now. Want one? <Link href="/book" className="brass-link text-ink">Book the band →</Link>
              </p>
            ) : null}
          </div>
        </section>

        {past.length > 0 ? (
          <section className="mt-12">
            <p className="label mb-3">Recently</p>
            <div className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised opacity-70">
              {past.map((s) => (
                <ShowRow key={s.id} show={s} />
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-16 rounded-lg border border-brass/30 bg-canvas-raised p-8 text-center">
          <p className="script text-3xl text-brass">Want a night like this?</p>
          <p className="mt-2 text-ink-dim">Anywhere in Texas. Solo to full band.</p>
          <Link href="/book" className="btn btn-brass mt-6">Book the band</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
