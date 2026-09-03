/**
 * Seed content — everything verified from public sources on 2026-09-03
 * (South Jetty, Port A Chamber listing, Kickstarter, Spotify)
 * plus Winston's decisions. Operator edits in HQ survive re-seeds where
 * the upsert says so (rates are NOT overwritten once set).
 */

export const CONFIGURATIONS = [
  { key: "solo", label: "Solo", lineup: "John Elijah — acoustic blues & roots, guitar and voice", base_cents: 60000, notes: "listening rooms, patios, small private", sort: 1 },
  { key: "duo", label: "Duo", lineup: "Guitar + one — bass or keys", base_cents: 85000, notes: "", sort: 2 },
  { key: "trio", label: "Trio", lineup: "Guitar, bass, drums", base_cents: 110000, notes: "", sort: 3 },
  { key: "four_piece", label: "Four-piece", lineup: "Guitar, organ, bass, drums", base_cents: 130000, notes: "the club lineup", sort: 4 },
  { key: "full_band", label: "Full band", lineup: "Two guitars, organ, bass, drums — the record lineup", base_cents: 160000, notes: "festivals, big rooms, weddings", sort: 5 },
];

// No standing residencies right now (The Palm Social Club closed — no house-band claims).
export const RESIDENCIES: {
  venue_name: string; city?: string; venue_url?: string | null; weekdays: string[];
  start_time?: string; label?: string; sort?: number;
}[] = [];

export const RELEASES = [
  {
    title: "Take and Give",
    slug: "take-and-give",
    kind: "album",
    released_on: "2025-05-25",
    cover_url: "https://i.scdn.co/image/ab67616d0000b273d264ec4f514cc3730afb4610",
    spotify_id: "1OJL1qd5AnyqRInvB4DdNM",
    story:
      "Nine originals, tracked live in a room the old way — no stacking, no fixing it later. Recorded at Sound Machine Studio outside Beeville with the full band, funded by thirty-five people on the island who wanted to hear it as much as we wanted to make it.",
    sort: 1,
    tracks: [
      { number: 1, title: "Heart Goes Boom", duration_ms: 222450 },
      { number: 2, title: "The Giver", duration_ms: 296343 },
      { number: 3, title: "Ghost Of My Past", duration_ms: 204764 },
      { number: 4, title: "I'm Old", duration_ms: 264210 },
      { number: 5, title: "Roof Over My Head", duration_ms: 300118 },
      { number: 6, title: "Pharma. and Fast Food", duration_ms: 192957 },
      { number: 7, title: "Know That About You", duration_ms: 362846 },
      { number: 8, title: "Honey", duration_ms: 290378 },
      { number: 9, title: "Middle Class Blues", duration_ms: 361104 },
    ],
  },
];

export const BAND = [
  {
    name: "John Elijah",
    instrument: "Guitar, vocals",
    hometown: "Port Aransas, TX",
    sort: 1,
    bio: `Port Aransas raised — the family moved to the island to open Lisabella's, and there was always an instrument within reach. University of North Texas in Denton, then four years as a working guitarist around Dallas–Fort Worth and a year on the road, then back to the coast, where the small-town pace and the island crowd shaped how the songs get written and how the shows get played.

Blues and soul at the root of everything — even when a song wanders into reggae or funk, that's where it comes home. Loud and fast, quiet and slow, mostly originals these days. The full band cut Take and Give live in a room in 2025; the solo acoustic set is the same songs with the volume down and the stories up.`,
  },
  { name: "Gary Graves", instrument: "Organ, piano", hometown: "Corpus Christi, TX", sort: 2, bio: "" },
  { name: "Joseph Soto", instrument: "Bass", hometown: "Corpus Christi, TX", sort: 3, bio: "" },
  { name: "Kris Redus", instrument: "Drums", hometown: "Corpus Christi, TX", sort: 4, bio: "" },
  { name: "Jose Felix", instrument: "Guitar", hometown: "Corpus Christi, TX", sort: 5, bio: "" },
];

export const PRESS = [
  {
    outlet: "Port Aransas South Jetty",
    title: "John Elijah Band to release studio album, 'Take and Give'",
    url: "https://www.portasouthjetty.com/articles/john-elijah-band-to-release-studio-album-take-and-give/",
    published_on: "2025-05-21",
    kind: "print",
    pull_quote: "We tracked it live with a very old-school R&B style. It has a very natural sound, feel to it, but it's very big.",
    sort_weight: 1,
  },
  {
    outlet: "Port Aransas Chamber — Port A Live",
    title: "John Elijah — artist listing",
    url: "https://www.portaransas.org/listing/john-elijah/964/",
    published_on: null,
    kind: "listing",
    pull_quote: "Playing all over the state with full band, four piece, trio, duo or just classic solo acoustic blues and roots.",
    sort_weight: 3,
  },
  {
    outlet: "Kickstarter",
    title: "John Elijah: Recording Session — funded",
    url: "https://www.kickstarter.com/projects/johnelijah/john-elijah-recording-session",
    published_on: "2025-02-07",
    kind: "web",
    pull_quote: "35 backers pledged $10,055 to help bring this project to life.",
    sort_weight: 2,
  },
];

// Merch known to exist (Kickstarter rewards). Drafts until Stripe + photos.
export const PRODUCTS = [
  { kind: "music", title: "Take and Give — CD", slug: "take-and-give-cd", description: "The record on a disc. Nine originals, tracked live.", price_cents: 1500, weight_oz: 4, status: "draft", variants: [{ label: "One size", sort: 1 }] },
  { kind: "apparel", title: "John Elijah Band tee", slug: "band-tee", description: "The first-ever John Elijah shirt.", price_cents: 3000, weight_oz: 7, status: "draft", variants: ["S", "M", "L", "XL", "2XL"].map((l, i) => ({ label: l, sort: i + 1 })) },
  { kind: "accessory", title: "John Elijah Band hat", slug: "band-hat", description: "For the sun and the stage.", price_cents: 3000, weight_oz: 5, status: "draft", variants: [{ label: "One size", sort: 1 }] },
];

// Travel bands — flat fees by distance from Port Aransas. PLACEHOLDERS pending Winston + John.
export const TRAVEL_BANDS = [
  { key: "local", label: "Port Aransas / Corpus Christi (under 30 mi)", fee_cents: 0, sort: 1 },
  { key: "coastal_bend", label: "Coastal Bend (30–100 mi)", fee_cents: 15000, sort: 2 },
  { key: "texas", label: "Texas (100–250 mi)", fee_cents: 40000, sort: 3 },
  { key: "far_texas", label: "Far Texas (250+ mi)", fee_cents: 75000, sort: 4 },
];

// YouTube — John's channel @JohnElijahMusic (UCL9DDwErICGT3UJoRQvAexA) + two third-party pieces.
export const VIDEOS = [
  { youtube_id: "F_2CH_WoaZo", title: "She Got the House (Cases of Lone Star Beer)", kind: "live", duration: "6:21", featured: true, sort: 1 },
  { youtube_id: "kEeo47p_-MI", title: "Roof Over My Head — live at Sound Machine Studio", kind: "studio", duration: "4:39", featured: true, sort: 2 },
  { youtube_id: "t973iERyi-Q", title: "Meet Me in the City", kind: "live", duration: "5:02", featured: true, sort: 3 },
  { youtube_id: "vS2pN5CY-Cc", title: "I'm a Man — live", kind: "live", duration: "4:11", sort: 4 },
  { youtube_id: "S-b8hIb70h4", title: "Mortgage on My Soul", kind: "live", duration: "6:21", sort: 5 },
  { youtube_id: "K8HpzhiDY3U", title: "Party Down", kind: "live", duration: "3:27", sort: 6 },
  { youtube_id: "RJaDF_jq2T0", title: "Me and My Woman", kind: "live", duration: "3:35", sort: 7 },
  { youtube_id: "6iuNRt1IVFI", title: "Roof Over My Head — live", kind: "live", duration: "4:32", sort: 8 },
  { youtube_id: "lMWT5Cqv7lA", title: "Tom Cat — live", kind: "live", duration: "2:15", sort: 9 },
  { youtube_id: "UUxbomOuMsc", title: "Do You Feel It (NRBQ)", kind: "cover", duration: "3:50", sort: 10 },
  { youtube_id: "ToytKhE4Pz8", title: "John Elijah Band — montage 2", kind: "montage", duration: "4:57", sort: 11 },
  { youtube_id: "W1IdvYLYDf0", title: "John Elijah Band — montage 1", kind: "montage", duration: "2:25", sort: 12 },
  { youtube_id: "uDHHqlJX8nQ", title: "Visit Port Aransas — musician feature", kind: "other", duration: "0:30", sort: 13 },
  { youtube_id: "Ib_2ZqCjByk", title: "Know That About You (Rdrokit Power)", kind: "live", duration: "6:03", sort: 14 },
  { youtube_id: "IZYGcfhkysg", title: "Love and Sound", kind: "live", duration: "", sort: 15 },
];

// Past dated shows worth keeping on the record (from the old Bandzoogle site).
export const SHOWS = [
  { date: "2026-05-01", venue_name: "Buc Days Festival", city: "Corpus Christi, TX", start_time: "8:00 PM", kind: "festival", status: "confirmed", is_public: true, notes: "Closed the opening night of Buc Days." },
];
