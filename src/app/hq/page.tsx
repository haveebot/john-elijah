import Link from "next/link";
import { bookingCounts, listBookings, listUpcomingBookings, bookedRevenueThisYear, STATUS_LABELS } from "@/lib/db/bookings";
import { listUpcomingShows } from "@/lib/db/shows";
import { listOrders } from "@/lib/db/commerce";
import { assetCount } from "@/lib/db/gallery";
import { fileTotals } from "@/lib/db/files";
import { query } from "@/lib/db/client";
import { mailEnabled, mailTransportName } from "@/lib/mail";
import { stripeEnabled } from "@/lib/stripe";
import { shippoEnabled } from "@/lib/shippo";

export const dynamic = "force-dynamic";

export default async function HqToday() {
  const [counts, recent, upcoming, shows, orders, photos, revenue, subs, drive] = await Promise.all([
    bookingCounts(),
    listBookings(),
    listUpcomingBookings(6),
    listUpcomingShows(6),
    listOrders(),
    assetCount(),
    bookedRevenueThisYear(),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM subscribers`),
    fileTotals(),
  ]);

  const open = (counts["inquiry"] ?? 0) + (counts["quoted"] ?? 0) + (counts["hold"] ?? 0);
  const locked = (counts["confirmed"] ?? 0) + (counts["deposit_paid"] ?? 0);
  const newInquiries = recent.filter((b) => b.status === "inquiry").slice(0, 5);
  const toShip = orders.filter((o) => o.status === "paid").length;

  const tiles = [
    { label: "New inquiries", value: counts["inquiry"] ?? 0, href: "/hq/bookings" },
    { label: "Open pipeline", value: open, href: "/hq/bookings" },
    { label: "Locked dates", value: locked, href: "/hq/bookings?status=confirmed" },
    { label: "Booked this year", value: `$${Math.round(revenue / 100).toLocaleString()}`, href: "/hq/bookings" },
    { label: "Orders to ship", value: toShip, href: "/hq/orders" },
    { label: "On the list", value: parseInt(subs[0]?.count ?? "0", 10), href: "/hq/settings" },
  ];

  const integrations = [
    { name: "Mail", on: mailEnabled(), note: mailTransportName() === "smtp" ? "Google Workspace SMTP" : mailTransportName() === "resend" ? "Resend" : "SMTP_USER/SMTP_PASS or RESEND_API_KEY" },
    { name: "Stripe", on: stripeEnabled(), note: "merch checkout" },
    { name: "Shippo", on: shippoEnabled(), note: "labels from Orders" },
  ];

  return (
    <div>
      <p className="label">Today</p>
      <h1 className="wordmark mt-2 text-4xl">The band at a glance</h1>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <Link key={tile.label} href={tile.href} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5 transition-colors hover:border-ink-faint">
            <p className="wordmark text-3xl">{tile.value}</p>
            <p className="label mt-2">{tile.label}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        <section>
          <h2 className="label mb-4">Newest inquiries</h2>
          {newInquiries.length === 0 ? (
            <p className="text-ink-dim">Nothing new — the intake is quiet.</p>
          ) : (
            <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
              {newInquiries.map((b) => (
                <li key={b.id}>
                  <Link href={`/hq/bookings/${b.id}`} className="flex items-baseline justify-between gap-4 px-5 py-4 hover:bg-canvas">
                    <div>
                      <p className="wordmark text-lg">{b.contact_name} · {b.event_kind}</p>
                      <p className="mt-1 text-sm text-ink-dim">
                        {[b.event_date, b.venue_name, b.city, b.configuration?.replace("_", " ")].filter(Boolean).join(" · ") || "no details yet"}
                      </p>
                    </div>
                    <span className="label shrink-0">{new Date(b.created_at).toLocaleDateString()}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="label mb-4">Next on the calendar</h2>
          <ul className="setlist rounded-lg border border-canvas-edge/60 bg-canvas-raised">
            {shows.map((s) => (
              <li key={`s${s.id}`} className="flex items-baseline justify-between gap-4 px-5 py-3">
                <span className="text-sm">{s.date} · {s.venue_name}{s.city ? `, ${s.city}` : ""}</span>
                <span className="label">{s.kind}</span>
              </li>
            ))}
            {upcoming
              .filter((b) => !shows.some((s) => s.booking_id === b.id))
              .map((b) => (
                <li key={`b${b.id}`}>
                  <Link href={`/hq/bookings/${b.id}`} className="flex items-baseline justify-between gap-4 px-5 py-3 hover:bg-canvas">
                    <span className="text-sm">{b.event_date} · {b.venue_name || b.contact_name}{b.city ? `, ${b.city}` : ""}</span>
                    <span className="label">{STATUS_LABELS[b.status]} · not on site</span>
                  </Link>
                </li>
              ))}
            {shows.length === 0 && upcoming.length === 0 ? (
              <li className="px-5 py-3 text-sm text-ink-faint">Nothing dated yet.</li>
            ) : null}
          </ul>
          <p className="mt-3 text-xs text-ink-faint">{photos} photos in the library · {drive.count} files on the drive.</p>
        </section>
      </div>

      <section className="mt-12">
        <h2 className="label mb-3">Integrations</h2>
        <div className="flex flex-wrap gap-3">
          {integrations.map((i) => (
            <span key={i.name} className={`rounded-full border px-3 py-1 text-xs ${i.on ? "border-teal/60 text-teal" : "border-canvas-edge text-ink-faint"}`}>
              {i.name}: {i.on ? "connected" : "not connected"} · {i.note}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
