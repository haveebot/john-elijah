import { SiteNav, SiteFooter, SectionHeading, LoneStarBadge } from "@/components/site-chrome";
import { listConfigurations } from "@/lib/db/bookings";
import { SITE } from "@/lib/site";
import { BookingForm } from "./booking-form";

export const revalidate = 3600;
export const metadata = { title: "Book the band" };

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ configuration?: string }>;
}) {
  const [{ configuration }, configs] = await Promise.all([searchParams, listConfigurations(true)]);
  const defaultConfig = configs.some((c) => c.key === configuration) ? (configuration as string) : "full_band";

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <SectionHeading label={`Booking · ${SITE.bookingRadius}`} title="Book the band" />
        <div className="-mt-4 mb-10 max-w-2xl space-y-3 leading-relaxed text-ink-dim">
          <p>
            Tell us the night — where, when, how big the room is — and we&apos;ll come back with
            a quote and a hold on the date. Solo acoustic through the full five-piece; bars,
            private parties, weddings, festivals, corporate nights. Anywhere in Texas.
          </p>
          <LoneStarBadge />
        </div>
        <BookingForm
          configurations={configs.map((c) => ({ key: c.key, label: c.label, lineup: c.lineup }))}
          defaultConfiguration={defaultConfig}
        />
      </main>
      <SiteFooter />
    </>
  );
}
