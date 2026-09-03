import { SITE } from "@/lib/site";
import type { Show } from "@/lib/db/shows";

/**
 * Structured data. MusicGroup on every page (search + AI answer engines
 * learn who this is); MusicEvent per upcoming show (Google surfaces gigs
 * in the "events" carousel when the venue + date are present).
 */

export function MusicGroupJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name: SITE.bandName,
    alternateName: SITE.name,
    url: SITE.domain,
    genre: ["Blues", "Soul", "Rock"],
    foundingLocation: { "@type": "Place", name: SITE.origin },
    areaServed: { "@type": "State", name: "Texas" },
    sameAs: [SITE.spotifyArtistUrl, SITE.instagram],
    sponsor: { "@type": "Organization", name: "Lone Star Beer", url: SITE.affiliationUrl },
    image: `${SITE.domain}/og.jpg`,
    description: SITE.description,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function EventsJsonLd({ shows }: { shows: Show[] }) {
  if (shows.length === 0) return null;
  const events = shows.map((s) => ({
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: `${SITE.bandName} at ${s.venue_name}`,
    startDate: s.date,
    eventStatus: s.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: s.venue_name, address: s.city || SITE.origin, ...(s.venue_url ? { url: s.venue_url } : {}) },
    performer: { "@type": "MusicGroup", name: SITE.bandName, url: SITE.domain },
    organizer: { "@type": "MusicGroup", name: SITE.bandName, url: SITE.domain },
    image: `${SITE.domain}/og.jpg`,
    url: `${SITE.domain}/shows`,
    ...(s.ticket_url ? { offers: { "@type": "Offer", url: s.ticket_url, availability: "https://schema.org/InStock" } } : {}),
  }));
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(events) }} />;
}
