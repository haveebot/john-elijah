import { SiteNav, SiteFooter, SectionHeading, LoneStarBadge } from "@/components/site-chrome";
import { listConfigurations, listTravelBands } from "@/lib/db/bookings";
import { SITE } from "@/lib/site";
import { BookingForm } from "./booking-form";

export const revalidate = 3600;
export const metadata = { title: "Book the band" };

const DEPOSIT_NOTES: Record<string, string> = {
  paid: "Deposit received — the date is held. You'll get a confirmation from the band.",
  already: "That deposit was already paid. The date is held.",
  cancelled: "No charge was made. The quote stands whenever you're ready.",
  offline: "Online deposits aren't switched on yet — reply to the quote email and we'll sort it directly.",
  invalid: "That deposit link isn't valid. Reply to the quote email and we'll send a fresh one.",
};

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ configuration?: string; deposit?: string }>;
}) {
  const [{ configuration, deposit }, configs, bands] = await Promise.all([
    searchParams,
    listConfigurations(true),
    listTravelBands(),
  ]);
  const defaultConfig = configs.some((c) => c.key === configuration) ? (configuration as string) : "full_band";
  const note = deposit ? DEPOSIT_NOTES[deposit] : null;

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-5 py-16">
        <SectionHeading label={`Booking · ${SITE.bookingRadius}`} title="Book the band" />
        {note ? (
          <div className="mb-8 rounded-lg border border-brass/40 bg-canvas-raised p-5 text-ink-dim">{note}</div>
        ) : null}
        <div className="-mt-4 mb-10 max-w-2xl space-y-3 leading-relaxed text-ink-dim">
          <p>
            Tell us the night — where, when, how big the room is — and you&apos;ll see a working
            number right here before you send. We come back with the firm quote and a hold on
            the date, usually within a day. Solo acoustic through the full five-piece; bars,
            private parties, weddings, festivals, corporate nights. Anywhere in Texas.
          </p>
          <LoneStarBadge />
        </div>
        <BookingForm
          configurations={configs.map((c) => ({ key: c.key, label: c.label, lineup: c.lineup, base_cents: c.base_cents }))}
          travelBands={bands.map((b) => ({ key: b.key, label: b.label, fee_cents: b.fee_cents }))}
          defaultConfiguration={defaultConfig}
        />
      </main>
      <SiteFooter />
    </>
  );
}
