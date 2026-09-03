/**
 * Seed content — everything verified from public sources on 2026-09-03
 * (South Jetty, Port A Chamber listing, Kickstarter, Spotify, PSC site)
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

export const RESIDENCIES = [
  {
    venue_name: "The Palm Social Club",
    city: "Port Aransas, TX",
    venue_url: "https://thepalmsocialclub.com/",
    weekdays: ["fri", "sat"],
    start_time: "7:00 PM",
    label: "House band",
    sort: 1,
  },
];

export const RELEASES = [
  {
    title: "Take and Give",
    slug: "take-and-give",
    kind: "album",
    released_on: "2025-05-25",
    cover_url: "https://i.scdn.co/image/ab67616d0000b273d264ec4f514cc3730afb4610",
    spotify_id: "1OJL1qd5AnyqRInvB4DdNM",
    story:
      "Nine originals, tracked live in a room the old way — no stacking, no fixing it later. Recorded at Sound Machine Studio outside Beeville with the full band, funded by thirty-five people on the island who wanted to hear it as much as we wanted to make it. Released with a night at The Palm Social Club.",
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
    bio: `Port Aransas raised — the family moved to the island to open Lisabella's, and there was always an instrument within reach. Four years as a working guitarist around Dallas–Fort Worth, a year on the road, then back to the coast, where the small-town pace and the island crowd shaped how the songs get written and how the shows get played.

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
