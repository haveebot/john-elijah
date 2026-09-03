import { requireAuth } from "@/lib/auth/require";
import { listUpcomingShows } from "@/lib/db/shows";
import { SITE } from "@/lib/site";

/**
 * CSV of upcoming shows in the column shape the Bandsintown for Artists /
 * Songkick Tourbox bulk-upload sheets expect (artist, date, time, venue,
 * city, state, country, ticket url). HQ auth (cookie or bearer).
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  const shows = await listUpcomingShows(500);
  const rows = [["Artist", "Date", "Time", "Venue", "City", "State", "Country", "Ticket URL", "Venue URL", "Status"]];
  for (const s of shows) {
    const [city, state] = s.city.split(",").map((x) => x.trim());
    rows.push([
      SITE.bandName,
      s.date,
      s.start_time,
      s.venue_name,
      city ?? "",
      state ?? "TX",
      "United States",
      s.ticket_url ?? "",
      s.venue_url ?? "",
      s.status,
    ]);
  }
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\r\n");
  return new Response(csv + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="john-elijah-shows.csv"',
    },
  });
}
