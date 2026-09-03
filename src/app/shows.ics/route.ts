import { listUpcomingShows } from "@/lib/db/shows";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

/**
 * iCalendar feed of upcoming public shows — subscribe from Google/Apple
 * Calendar, and the import source for Bandsintown / Songkick tooling.
 */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toStamp(date: string, time: string): string {
  // "8:00 PM" → 20:00; missing → 20:00 local (America/Chicago handled by TZID)
  const m = /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i.exec(time.trim());
  let h = 20;
  let min = 0;
  if (m) {
    h = Number(m[1]) % 12;
    min = Number(m[2] ?? 0);
    if ((m[3] ?? "PM").toUpperCase() === "PM") h += 12;
  }
  return `${date.replace(/-/g, "")}T${String(h).padStart(2, "0")}${String(min).padStart(2, "0")}00`;
}

export async function GET() {
  const shows = await listUpcomingShows(200);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${SITE.bandName}//shows//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${esc(SITE.bandName)} — shows`,
    "X-WR-TIMEZONE:America/Chicago",
  ];
  for (const s of shows) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:show-${s.id}@johnelijahmusic.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
      `DTSTART;TZID=America/Chicago:${toStamp(s.date, s.start_time)}`,
      `SUMMARY:${esc(`${SITE.bandName} at ${s.venue_name}`)}`,
      `LOCATION:${esc([s.venue_name, s.city].filter(Boolean).join(", "))}`,
      `URL:${s.ticket_url ?? s.venue_url ?? `${SITE.domain}/shows`}`,
      `STATUS:${s.status === "tentative" ? "TENTATIVE" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="john-elijah-shows.ics"',
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
