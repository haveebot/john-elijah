/**
 * Venue scrape → HQ. Public sources only, idempotent upserts by name+city.
 *
 *   node --env-file=.env.local --import tsx scripts/scrape-venues.ts [--sources osm,halls,pal,curated] [--enrich N]
 *
 * Sources
 *   osm      OpenStreetMap via Overpass: music venues + anything tagged live_music
 *            statewide, plus breweries/wineries/biergartens in the band's core
 *            regions (Coastal Bend, San Antonio, Hill Country, Austin, Houston).
 *   halls    Texas Dance Hall Preservation "Find a Hall" list.
 *   pal      Port A Local's live-music venue table + business directory.
 *   curated  Rooms we know book this kind of act (websites verified by fetch).
 *   --enrich N   scan up to N venue websites for published emails (literal only).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { upsertVenue, upsertVenueContact, addVenueActivity, regionForCity, listVenues, updateVenue } from "../src/lib/db/venues";
import { scanSiteForEmails, roleForEmail } from "../src/lib/enrich";
import { query } from "../src/lib/db/client";

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
const SOURCES = (arg("sources") ?? "osm,halls,pal,curated").split(",");
const ENRICH = Number(arg("enrich") ?? 0);

// ── OSM ──────────────────────────────────────────────────────────────
const TEXAS = "25.8,-106.7,36.6,-93.5";
const CORE = ["27.3,-98.2,28.5,-96.5", "29.2,-99.2,30.2,-97.8", "29.9,-99.6,30.7,-98.0", "30.0,-98.1,30.7,-97.3", "29.3,-95.9,30.2,-94.9"]; // coastal bend · SA · hill country · austin · houston

async function overpass(q: string): Promise<{ tags: Record<string, string>; id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number } }[]> {
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  const j = (await res.json()) as { elements: never[] };
  return j.elements as never[];
}

function kindFromTags(t: Record<string, string>): string {
  if (t.amenity === "music_venue" || t.amenity === "nightclub") return "listening_room";
  if (t.craft === "brewery" || t.microbrewery === "yes" || /brew/i.test(t.name ?? "")) return "brewery";
  if (t.craft === "winery" || /winery|vineyard|cellars/i.test(t.name ?? "")) return "winery";
  if (/dance ?hall|ballroom|halle$/i.test(t.name ?? "")) return "dance_hall";
  if (t.amenity === "restaurant") return "restaurant";
  return "bar";
}

async function fromOsm(): Promise<number> {
  const queries = [
    `[out:json][timeout:120];(nwr["amenity"="music_venue"](${TEXAS});nwr["live_music"="yes"](${TEXAS});nwr["amenity"="nightclub"]["live_music"](${TEXAS}););out tags center 600;`,
    ...CORE.map((b) => `[out:json][timeout:120];(nwr["craft"="brewery"](${b});nwr["craft"="winery"](${b});nwr["amenity"="biergarten"](${b}););out tags center 300;`),
  ];
  let n = 0;
  const seen = new Set<string>();
  for (const q of queries) {
    let els: Awaited<ReturnType<typeof overpass>> = [];
    try { els = await overpass(q); } catch (e) { console.log("  osm query failed:", (e as Error).message); continue; }
    for (const e of els) {
      const t = e.tags ?? {};
      if (!t.name) continue;
      const city = t["addr:city"] ?? "";
      const key = `${t.name}|${city}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const lat = e.lat ?? e.center?.lat ?? null;
      const lon = e.lon ?? e.center?.lon ?? null;
      const website = t.website ?? t["contact:website"] ?? null;
      await upsertVenue({
        name: t.name.slice(0, 200),
        city,
        kind: kindFromTags(t),
        address: [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "),
        website: website ? website.replace(/\/$/, "") : null,
        phone: t.phone ?? t["contact:phone"] ?? "",
        email: (t.email ?? t["contact:email"] ?? "").toLowerCase(),
        instagram: t["contact:instagram"] ?? null,
        facebook: t["contact:facebook"] ?? null,
        lat, lng: lon,
        live_music: t.live_music === "yes" || t.amenity === "music_venue",
        source: "osm",
        source_ref: `${e.type}/${e.id}`,
        score: t.amenity === "music_venue" ? 70 : t.live_music === "yes" ? 65 : 40,
        tags: [t.amenity ?? t.craft ?? "venue"].filter(Boolean),
      });
      n += 1;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return n;
}

// ── Dance halls ──────────────────────────────────────────────────────
async function fromHalls(): Promise<number> {
  const res = await fetch("https://texasdancehall.org/about-dance-halls/find-a-hall/", { headers: { "User-Agent": UA } });
  const html = await res.text();
  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, "\n");
  const lines = text.split("\n").map((l) => l.replace(/&#8217;|&rsquo;/g, "'").replace(/&amp;/g, "&").trim()).filter(Boolean);
  const start = lines.indexOf("COUNTY");
  let n = 0;
  if (start < 0) return 0;
  for (let i = start + 1; i + 2 < lines.length; i += 3) {
    const [name, city, county] = [lines[i], lines[i + 1], lines[i + 2]];
    if (!/County$|^Dallas$/.test(county) && !/County/.test(county)) break;
    if (!name || name.length > 80) break;
    // try to find the hall's website link in the raw html near its name
    const idx = html.indexOf(name.split(" (")[0]);
    let website: string | null = null;
    if (idx > -1) {
      const window = html.slice(Math.max(0, idx - 1500), idx + 1500);
      const m = window.match(/href="(https?:\/\/(?!texasdancehall\.org)[^"]+)"/);
      if (m) website = m[1];
    }
    await upsertVenue({ name, city, kind: "dance_hall", website, source: "dance_halls", source_ref: "texasdancehall.org/find-a-hall", score: 75, tags: ["dance-hall", county], live_music: true });
    n += 1;
  }
  return n;
}

// ── Port A Local ─────────────────────────────────────────────────────
async function fromPal(): Promise<number> {
  const root = join(process.cwd(), "..", "port-a-local");
  const lm = readFileSync(join(root, "src/data/live-music.ts"), "utf8");
  const biz = readFileSync(join(root, "src/data/businesses.ts"), "utf8");
  const venues = [...lm.matchAll(/"([a-z0-9-]+)":\s*\{\s*slug:\s*"[a-z0-9-]+",\s*name:\s*"([^"]+)"/g)].map((m) => ({ slug: m[1], name: m[2] }));
  let n = 0;
  for (const v of venues) {
    if (/^(art-center|marker-25|fred-rhodes|roberts-point-park)$/.test(v.slug)) continue; // parks / not bookers
    // find a matching business block by name
    const i = biz.indexOf(`name: "${v.name}`);
    let address = "", phone = "", website: string | null = null;
    if (i > -1) {
      const block = biz.slice(i, i + 1500);
      address = (block.match(/address:\s*"([^"]*)"/) ?? [])[1] ?? "";
      phone = (block.match(/phone:\s*"([^"]*)"/) ?? [])[1] ?? "";
      website = (block.match(/website:\s*"([^"]*)"/) ?? [])[1] ?? null;
    }
    await upsertVenue({ name: v.name, city: "Port Aransas", kind: /vfw/i.test(v.name) ? "private_club" : /roosevelt|bernie|beach bums|bierhaus/i.test(v.name) ? "restaurant" : "bar", address, phone, website, source: "pal", source_ref: `theportalocal.com/live-music#${v.slug}`, score: 80, tags: ["port-a", "live-music-slate"], live_music: true });
    n += 1;
  }
  return n;
}

// ── Curated (rooms that book this act; websites verified by fetch below) ──
const CURATED: { name: string; city: string; kind: string; website?: string; capacity?: number; tags?: string[]; score?: number }[] = [
  // Coastal Bend
  { name: "Brewster Street Ice House", city: "Corpus Christi", kind: "bar", website: "https://brewsterstreet.net", capacity: 1500, score: 85 },
  { name: "Executive Surf Club", city: "Corpus Christi", kind: "bar", website: "https://executivesurfclub.com", capacity: 300, score: 85 },
  { name: "House of Rock", city: "Corpus Christi", kind: "listening_room", website: "https://texashouseofrock.com", capacity: 400, score: 80 },
  { name: "Concrete Street Amphitheater", city: "Corpus Christi", kind: "festival", website: "https://concretestreet.net", capacity: 3000, score: 60 },
  { name: "Rockit's Whiskey Bar & Saloon", city: "Corpus Christi", kind: "bar", score: 70 },
  { name: "Blackbeard's on the Beach", city: "Corpus Christi", kind: "restaurant", website: "https://blackbeardsonthebeach.com", score: 70 },
  { name: "Doc's Seafood & Steaks", city: "Corpus Christi", kind: "restaurant", website: "https://docsseafoodandsteaks.com", score: 65 },
  { name: "Boathouse Bar & Grill", city: "Corpus Christi", kind: "restaurant", score: 60 },
  { name: "South Texas Ice House", city: "Corpus Christi", kind: "bar", score: 60 },
  { name: "Pelican Lounge", city: "Corpus Christi", kind: "bar", score: 55 },
  { name: "Sugar Shack", city: "Corpus Christi", kind: "bar", score: 55 },
  { name: "Lorelei Brewing Company", city: "Corpus Christi", kind: "brewery", website: "https://loreleibrewing.com", score: 65 },
  { name: "Nueces Brewing Company", city: "Corpus Christi", kind: "brewery", website: "https://nuecesbrewing.com", score: 65 },
  { name: "Lazy Beach Brewing", city: "Corpus Christi", kind: "brewery", website: "https://lazybeachbrewing.com", score: 65 },
  { name: "Fifth & Elm", city: "Portland", kind: "bar", score: 60 },
  { name: "Rialto Theater", city: "Aransas Pass", kind: "listening_room", score: 60 },
  { name: "Hideout 35", city: "Aransas Pass", kind: "bar", score: 55 },
  { name: "Harbor Listening Room", city: "Fulton", kind: "listening_room", score: 70 },
  { name: "Paradise Key Dockside Bar & Grill", city: "Rockport", kind: "restaurant", website: "https://paradisekeyrockport.com", score: 65 },
  { name: "Latitude 28°02'", city: "Rockport", kind: "restaurant", score: 55 },
  { name: "Rockport Beach Bar & Grill", city: "Rockport", kind: "bar", score: 55 },
  { name: "Kody's Restaurant & Bar", city: "Port Aransas", kind: "restaurant", score: 55 },
  // San Antonio / New Braunfels / Hill Country
  { name: "Gruene Hall", city: "New Braunfels", kind: "dance_hall", website: "https://gruenehall.com", capacity: 800, score: 90, tags: ["bucket-list"] },
  { name: "Luckenbach Texas", city: "Fredericksburg", kind: "dance_hall", website: "https://luckenbachtexas.com", score: 85 },
  { name: "John T. Floore's Country Store", city: "Helotes", kind: "dance_hall", website: "https://liveatfloores.com", capacity: 1200, score: 85 },
  { name: "Sam's Burger Joint", city: "San Antonio", kind: "listening_room", website: "https://samsburgerjoint.com", capacity: 300, score: 85 },
  { name: "The Phoenix Saloon", city: "New Braunfels", kind: "bar", website: "https://phoenixsaloon.com", score: 70 },
  { name: "Riley's Tavern", city: "Hunter", kind: "bar", website: "https://rileystavern.com", score: 70 },
  { name: "Whitewater Amphitheater", city: "New Braunfels", kind: "festival", website: "https://whitewaterrocks.com", score: 60 },
  { name: "Cheatham Street Warehouse", city: "San Marcos", kind: "listening_room", website: "https://cheathamstreet.com", score: 80 },
  { name: "The Lonesome Dove", city: "Boerne", kind: "bar", score: 55 },
  { name: "Dodging Duck Brewhaus", city: "Boerne", kind: "brewery", website: "https://dodgingduck.com", score: 60 },
  { name: "11th Street Cowboy Bar", city: "Bandera", kind: "bar", website: "https://11thstreetcowboybar.com", score: 70 },
  { name: "Arkey Blue's Silver Dollar", city: "Bandera", kind: "bar", score: 60 },
  { name: "Albert Dance Hall", city: "Stonewall", kind: "dance_hall", website: "https://albertdancehall.com", score: 70 },
  { name: "The Cotton Club", city: "Granger", kind: "dance_hall", score: 55 },
  { name: "Twin Sisters Dance Hall", city: "Blanco", kind: "dance_hall", score: 65 },
  { name: "Kendalia Halle", city: "Kendalia", kind: "dance_hall", website: "https://kendaliahalle.com", score: 65 },
  { name: "Anhalt Hall", city: "Spring Branch", kind: "dance_hall", score: 60 },
  { name: "Devil's Backbone Tavern", city: "Fischer", kind: "bar", website: "https://devilsbackbonetavern.com", score: 75 },
  // Austin
  { name: "Antone's Nightclub", city: "Austin", kind: "listening_room", website: "https://antonesnightclub.com", capacity: 400, score: 90, tags: ["bucket-list"] },
  { name: "The Continental Club", city: "Austin", kind: "listening_room", website: "https://continentalclub.com", capacity: 300, score: 90, tags: ["bucket-list"] },
  { name: "The Saxon Pub", city: "Austin", kind: "listening_room", website: "https://thesaxonpub.com", capacity: 250, score: 85 },
  { name: "C-Boy's Heart & Soul", city: "Austin", kind: "bar", website: "https://cboys.com", score: 85 },
  { name: "The White Horse", city: "Austin", kind: "bar", website: "https://thewhitehorseaustin.com", score: 75 },
  { name: "Sagebrush", city: "Austin", kind: "bar", website: "https://sagebrushtexas.com", score: 75 },
  { name: "Broken Spoke", city: "Austin", kind: "dance_hall", website: "https://brokenspokeaustintx.net", score: 80 },
  { name: "Giddy Ups", city: "Austin", kind: "bar", score: 65 },
  { name: "Poodies Roadhouse", city: "Spicewood", kind: "bar", website: "https://poodies.net", score: 75 },
  // Houston / Galveston
  { name: "The Big Easy Social & Pleasure Club", city: "Houston", kind: "listening_room", website: "https://thebigeasyblues.com", score: 85, tags: ["blues-room"] },
  { name: "The Continental Club Houston", city: "Houston", kind: "listening_room", website: "https://continentalclub.com/houston", score: 80 },
  { name: "Old Quarter Acoustic Cafe", city: "Galveston", kind: "listening_room", website: "https://oldquarteracousticcafe.com", score: 70 },
  { name: "Dan Electro's", city: "Houston", kind: "bar", score: 60 },
  { name: "Goode's Armadillo Palace", city: "Houston", kind: "bar", website: "https://goodecompany.com/armadillo-palace", score: 70 },
  { name: "Mucky Duck", city: "Houston", kind: "listening_room", website: "https://mcgonigels.com", score: 70 },
];

async function fromCurated(): Promise<number> {
  let n = 0;
  for (const c of CURATED) {
    let website = c.website ?? null;
    if (website) {
      try {
        const r = await fetch(website, { redirect: "follow", headers: { "User-Agent": UA }, signal: AbortSignal.timeout(12000) });
        if (!r.ok) website = null; else website = r.url.replace(/\/$/, "");
      } catch { website = null; }
    }
    await upsertVenue({ name: c.name, city: c.city, kind: c.kind, website, capacity: c.capacity ?? null, score: c.score ?? 60, source: "curated", tags: ["curated", ...(c.tags ?? [])], live_music: true });
    n += 1;
  }
  return n;
}

// ── enrichment: published emails only ────────────────────────────────
async function enrich(max: number): Promise<void> {
  const rows = await query<{ id: number; name: string; website: string }>(
    `SELECT v.id, v.name, v.website FROM venues v
     WHERE v.website IS NOT NULL AND v.email = '' AND NOT EXISTS (SELECT 1 FROM venue_contacts c WHERE c.venue_id = v.id)
       AND NOT EXISTS (SELECT 1 FROM venue_activity a WHERE a.venue_id = v.id AND a.kind = 'note' AND a.body LIKE 'Site scan:%')
     ORDER BY v.score DESC, v.id LIMIT $1`, [max]);
  let hits = 0;
  for (const v of rows) {
    const { found, pagesTried } = await scanSiteForEmails(v.website, 6);
    for (const f of found) await upsertVenueContact({ venue_id: v.id, role: roleForEmail(f.email), email: f.email, source: `site:${f.kind}`, verified: false });
    await addVenueActivity(v.id, "note", found.length ? `Site scan: ${found.length} address${found.length === 1 ? "" : "es"} on ${pagesTried} pages — ${found.map((f) => f.email).join(", ")}` : `Site scan: nothing published on ${pagesTried} pages.`, "scraper");
    if (found.length) { hits += 1; await updateVenue(v.id, { status: "researched" }); }
    console.log(`  ${found.length ? "✓" : "·"} ${v.name}: ${found.map((f) => f.email).join(", ") || "none"}`);
  }
  console.log(`enrich: ${hits}/${rows.length} sites published an address`);
}

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");
  const before = (await listVenues({ limit: 100000 })).length;
  if (SOURCES.includes("pal")) console.log("pal:", await fromPal());
  if (SOURCES.includes("curated")) console.log("curated:", await fromCurated());
  if (SOURCES.includes("halls")) console.log("dance halls:", await fromHalls());
  if (SOURCES.includes("osm")) console.log("osm:", await fromOsm());
  // regions for anything the city table didn't catch
  await query(`UPDATE venues SET region = 'other' WHERE region = ''`);
  const all = await listVenues({ limit: 100000 });
  console.log(`venues: ${before} → ${all.length}`);
  const byRegion: Record<string, number> = {};
  for (const v of all) byRegion[v.region] = (byRegion[v.region] ?? 0) + 1;
  console.log("by region:", JSON.stringify(byRegion));
  if (ENRICH > 0) await enrich(ENRICH);
  process.exit(0);
}

main().catch((e) => { console.error("scrape-venues: FAILED", e); process.exit(1); });
