import { NextResponse } from "next/server";
import { createBooking, addBookingEvent, listConfigurations } from "@/lib/db/bookings";
import { sendMail, notifyEmail } from "@/lib/mail";
import { SITE } from "@/lib/site";

/**
 * Public booking intake → HQ pipeline. Honeypot + light per-instance rate
 * limit. On success: confirmation to the inquirer + alert to the band's
 * mailbox (both no-op until mail is configured; the booking still lands).
 */

const recent = new Map<string, number[]>();
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

function rateLimited(key: string): boolean {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > MAX_PER_WINDOW;
}

const EVENT_KINDS = new Set(["venue", "private", "wedding", "corporate", "festival", "other"]);

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  if (typeof body.company_site === "string" && body.company_site.length > 0) {
    return NextResponse.json({ ok: true }); // honeypot: silent success
  }

  const name = String(body.contact_name ?? "").trim();
  const email = String(body.contact_email ?? "").trim();
  if (!name || !email.includes("@")) {
    return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return NextResponse.json({ error: "slow-down" }, { status: 429 });

  const configs = await listConfigurations();
  const configuration = configs.some((c) => c.key === body.configuration)
    ? String(body.configuration)
    : null;
  const eventKind = EVENT_KINDS.has(String(body.event_kind)) ? String(body.event_kind) : "other";
  const dateRaw = String(body.event_date ?? "");
  const eventDate = /^\d{4}-\d{2}-\d{2}$/.test(dateRaw) ? dateRaw : null;
  const hours = Number(body.hours);
  const guests = Number(body.guests);
  const budget = Number(body.budget);

  const booking = await createBooking({
    contact_name: name.slice(0, 200),
    contact_email: email.slice(0, 200),
    contact_phone: String(body.contact_phone ?? "").slice(0, 50),
    event_kind: eventKind,
    event_date: eventDate,
    start_time: String(body.start_time ?? "").slice(0, 40),
    hours: Number.isFinite(hours) && hours > 0 ? Math.min(hours, 12) : null,
    venue_name: String(body.venue_name ?? "").slice(0, 200),
    city: String(body.city ?? "").slice(0, 120),
    configuration,
    guests: Number.isFinite(guests) && guests > 0 ? Math.min(guests, 100000) : null,
    budget_cents: Number.isFinite(budget) && budget > 0 ? Math.round(budget * 100) : null,
    details: String(body.details ?? "").slice(0, 4000),
    source: "site",
  });

  const label = configs.find((c) => c.key === configuration)?.label ?? "TBD";
  const when = [eventDate, booking.start_time].filter(Boolean).join(" ") || "date TBD";
  const where = [booking.venue_name, booking.city].filter(Boolean).join(", ") || "location TBD";

  // confirmation to the inquirer
  const confirm = await sendMail({
    to: booking.contact_email,
    subject: `Got your booking inquiry — ${SITE.bandName}`,
    text: `Hi ${booking.contact_name},\n\nGot it. ${label} · ${when} · ${where}.\n\nYou'll hear back with a quote and a hold on the date, usually within a day.\n\n— ${SITE.bandName}\n${SITE.domain}`,
  });
  // alert to the band
  const notify = notifyEmail();
  const alert = notify
    ? await sendMail({
        to: notify,
        replyTo: booking.contact_email,
        subject: `New booking inquiry: ${label} · ${when} · ${where}`,
        text: `${booking.contact_name} <${booking.contact_email}>${booking.contact_phone ? ` · ${booking.contact_phone}` : ""}\n\nKind: ${eventKind}\nWhen: ${when}${booking.hours ? ` · ${booking.hours}h` : ""}\nWhere: ${where}\nLineup: ${label}\nCrowd: ${booking.guests ?? "—"}\nBudget: ${booking.budget_cents ? `$${booking.budget_cents / 100}` : "—"}\n\n${booking.details || "(no details)"}\n\nHQ: ${SITE.domain}/hq/bookings/${booking.id}`,
      })
    : { sent: false, error: "no-notify-address" };

  await addBookingEvent(
    booking.id,
    "email",
    `Confirmation ${confirm.sent ? "sent" : `not sent (${confirm.error})`} · alert ${alert.sent ? "sent" : `not sent (${alert.error})`}.`,
  );

  return NextResponse.json({ ok: true, id: booking.id });
}
