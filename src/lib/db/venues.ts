/**
 * Venues — the outbound engine. Texas rooms that book live music, with the
 * contacts we actually found (literal scrape or operator entry — never a
 * guessed address), an activity trail, and a status that walks toward a
 * booking. `bookings.venue_id` links the two when a room converts.
 */

import { query, queryOne } from "./client";

export const VENUE_KINDS = ["bar", "dance_hall", "listening_room", "restaurant", "brewery", "winery", "festival", "event_planner", "corporate", "private_club", "other"] as const;
export const VENUE_STATUSES = ["new", "researched", "contacted", "replied", "booked", "passed"] as const;
export const REGIONS = ["coastal_bend", "hill_country", "austin", "san_antonio", "houston", "dfw", "rgv", "west_texas", "east_texas", "panhandle", "other"] as const;

export const REGION_LABELS: Record<string, string> = {
  coastal_bend: "Coastal Bend",
  hill_country: "Hill Country",
  austin: "Austin",
  san_antonio: "San Antonio",
  houston: "Houston",
  dfw: "Dallas–Fort Worth",
  rgv: "Rio Grande Valley",
  west_texas: "West Texas",
  east_texas: "East Texas",
  panhandle: "Panhandle",
  other: "Texas",
};

export type Venue = {
  id: number;
  name: string;
  slug: string;
  kind: string;
  city: string;
  region: string;
  address: string;
  website: string | null;
  phone: string;
  email: string;
  instagram: string | null;
  facebook: string | null;
  capacity: number | null;
  live_music: boolean;
  lat: number | null;
  lng: number | null;
  source: string;
  source_ref: string | null;
  status: string;
  score: number;
  notes: string;
  tags: string[];
  last_contacted_at: string | null;
  next_touch_at: string | null;
  touch_count?: number;
  created_at: string;
  updated_at: string;
  contact_count?: number;
  email_count?: number;
};

export type VenueContact = {
  id: number;
  venue_id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  source: string;
  verified: boolean;
  created_at: string;
};

export type VenueActivity = {
  id: number;
  venue_id: number;
  kind: string;
  body: string;
  by_name: string;
  created_at: string;
};

export function slugify(s: string): string {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/** City → region, for scraped rows. Extend as the list grows. */
export function regionForCity(city: string): string {
  const c = city.toLowerCase();
  const table: [RegExp, string][] = [
    [/port aransas|corpus christi|rockport|fulton|aransas pass|portland|ingleside|padre|kingsville|alice|beeville|refugio|victoria|port lavaca|goliad|george west|mathis|sinton|taft|robstown|bishop|flour bluff/, "coastal_bend"],
    [/san antonio|helotes|boerne|new braunfels|gruene|seguin|schertz|selma|bulverde|spring branch|floresville|castroville|hondo|bandera|pleasanton|jourdanton|comfort|sisterdale|fischer/, "san_antonio"],
    [/austin|round rock|cedar park|dripping springs|buda|kyle|san marcos|wimberley|georgetown|bastrop|lockhart|pflugerville|leander|spicewood|bee cave|lakeway|elgin|smithville|manor/, "austin"],
    [/fredericksburg|kerrville|luckenbach|johnson city|blanco|marble falls|llano|mason|junction|stonewall|hunt|ingram|center point|burnet|lampasas|utopia|leakey|concan/, "hill_country"],
    [/houston|galveston|katy|sugar land|the woodlands|conroe|pearland|league city|baytown|pasadena|humble|spring|tomball|cypress|kemah|seabrook|clear lake|richmond|rosenberg|brenham|bellville|cat spring|burton|schulenburg|fayetteville|round top|la grange|columbus|el maton|bay city|freeport|lake jackson|angleton/, "houston"],
    [/dallas|fort worth|arlington|plano|frisco|denton|irving|grapevine|mckinney|allen|garland|richardson|lewisville|carrollton|mesquite|waxahachie|weatherford|granbury|cleburne|burleson|southlake|keller|anson/, "dfw"],
    [/mcallen|brownsville|harlingen|edinburg|mission|pharr|weslaco|south padre|port isabel|laredo|rio grande city|san benito/, "rgv"],
    [/el paso|midland|odessa|lubbock|san angelo|abilene|marfa|alpine|terlingua|fort davis|big spring|sweetwater|fort stockton|pecos/, "west_texas"],
    [/tyler|longview|nacogdoches|lufkin|beaumont|port arthur|texarkana|marshall|jacksonville|huntsville|palestine|crockett|orange/, "east_texas"],
    [/amarillo|canyon|wichita falls|pampa|plainview|childress|borger/, "panhandle"],
    [/waco|temple|killeen|belton|bryan|college station|sweet home|hallettsville|yoakum|cuero|shiner|gonzales|luling/, "other"],
  ];
  for (const [re, region] of table) if (re.test(c)) return region;
  return "other";
}

const VENUE_SELECT = `
  SELECT v.*,
         (SELECT COUNT(*) FROM venue_contacts c WHERE c.venue_id = v.id)::int AS contact_count,
         (SELECT COUNT(*) FROM venue_contacts c WHERE c.venue_id = v.id AND c.email <> '')::int AS email_count
  FROM venues v`;

export async function listVenues(f: { region?: string; kind?: string; status?: string; q?: string; hasEmail?: boolean; limit?: number } = {}): Promise<Venue[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.region) { params.push(f.region); where.push(`v.region = $${params.length}`); }
  if (f.kind) { params.push(f.kind); where.push(`v.kind = $${params.length}`); }
  if (f.status) { params.push(f.status); where.push(`v.status = $${params.length}`); }
  if (f.q) { params.push(`%${f.q}%`); where.push(`(v.name ILIKE $${params.length} OR v.city ILIKE $${params.length})`); }
  if (f.hasEmail) where.push(`(v.email <> '' OR EXISTS (SELECT 1 FROM venue_contacts c WHERE c.venue_id = v.id AND c.email <> ''))`);
  params.push(f.limit ?? 500);
  return query<Venue>(
    `${VENUE_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""}
     ORDER BY v.score DESC, v.region, v.city, v.name LIMIT $${params.length}`,
    params,
  );
}

export async function getVenue(id: number): Promise<Venue | null> {
  return queryOne<Venue>(`${VENUE_SELECT} WHERE v.id = $1`, [id]);
}

export async function upsertVenue(v: Partial<Venue> & { name: string; city?: string }): Promise<Venue> {
  const city = v.city ?? "";
  const slug = v.slug ?? slugify(`${v.name}-${city}`);
  const region = v.region ?? regionForCity(city);
  const rows = await query<Venue>(
    `INSERT INTO venues (name, slug, kind, city, region, address, website, phone, email, instagram, facebook, capacity, live_music, lat, lng, source, source_ref, score, notes, tags)
     VALUES ($1,$2,COALESCE($3,'bar'),$4,$5,COALESCE($6,''),$7,COALESCE($8,''),COALESCE($9,''),$10,$11,$12,COALESCE($13,true),$14,$15,COALESCE($16,'manual'),$17,COALESCE($18,50),COALESCE($19,''),COALESCE($20::text[],'{}'))
     ON CONFLICT (slug) DO UPDATE SET
       kind = CASE WHEN venues.kind = 'other' THEN EXCLUDED.kind ELSE venues.kind END,
       address = CASE WHEN venues.address = '' THEN EXCLUDED.address ELSE venues.address END,
       website = COALESCE(venues.website, EXCLUDED.website),
       phone = CASE WHEN venues.phone = '' THEN EXCLUDED.phone ELSE venues.phone END,
       email = CASE WHEN venues.email = '' THEN EXCLUDED.email ELSE venues.email END,
       instagram = COALESCE(venues.instagram, EXCLUDED.instagram),
       facebook = COALESCE(venues.facebook, EXCLUDED.facebook),
       capacity = COALESCE(venues.capacity, EXCLUDED.capacity),
       lat = COALESCE(venues.lat, EXCLUDED.lat), lng = COALESCE(venues.lng, EXCLUDED.lng),
       source_ref = COALESCE(venues.source_ref, EXCLUDED.source_ref),
       tags = (SELECT ARRAY(SELECT DISTINCT unnest(venues.tags || EXCLUDED.tags))),
       updated_at = now()
     RETURNING *`,
    [v.name, slug, v.kind, city, region, v.address, v.website ?? null, v.phone, v.email, v.instagram ?? null, v.facebook ?? null, v.capacity ?? null, v.live_music, v.lat ?? null, v.lng ?? null, v.source, v.source_ref ?? null, v.score, v.notes, v.tags],
  );
  return rows[0];
}

export async function updateVenue(id: number, patch: Partial<Pick<Venue, "name" | "kind" | "city" | "region" | "address" | "website" | "phone" | "email" | "instagram" | "facebook" | "capacity" | "status" | "score" | "notes" | "next_touch_at">>): Promise<Venue | null> {
  const existing = await getVenue(id);
  if (!existing) return null;
  const n = { ...existing, ...patch };
  const rows = await query<Venue>(
    `UPDATE venues SET name=$2, kind=$3, city=$4, region=$5, address=$6, website=$7, phone=$8, email=$9, instagram=$10, facebook=$11, capacity=$12, status=$13, score=$14, notes=$15, next_touch_at=$16, updated_at=now()
     WHERE id=$1 RETURNING *`,
    [id, n.name, n.kind, n.city, n.region, n.address, n.website, n.phone, n.email, n.instagram, n.facebook, n.capacity, n.status, n.score, n.notes, n.next_touch_at],
  );
  if (patch.status && patch.status !== existing.status) {
    await addVenueActivity(id, "status_change", `${existing.status} → ${patch.status}`, "");
  }
  return rows[0];
}

export async function markContacted(id: number): Promise<void> {
  await query(`UPDATE venues SET status = CASE WHEN status IN ('new','researched') THEN 'contacted' ELSE status END, last_contacted_at = now(), touch_count = GREATEST(touch_count, 1), next_touch_at = CURRENT_DATE + 7, updated_at = now() WHERE id = $1`, [id]);
}

export async function listVenueContacts(venueId: number): Promise<VenueContact[]> {
  return query<VenueContact>(`SELECT * FROM venue_contacts WHERE venue_id = $1 ORDER BY verified DESC, id`, [venueId]);
}

export async function upsertVenueContact(c: { venue_id: number; name?: string; role?: string; email?: string; phone?: string; source?: string; verified?: boolean }): Promise<void> {
  await query(
    `INSERT INTO venue_contacts (venue_id, name, role, email, phone, source, verified)
     VALUES ($1,COALESCE($2,''),COALESCE($3,'general'),COALESCE($4,''),COALESCE($5,''),COALESCE($6,'manual'),COALESCE($7,false))
     ON CONFLICT (venue_id, email) DO UPDATE SET
       name = CASE WHEN venue_contacts.name = '' THEN EXCLUDED.name ELSE venue_contacts.name END,
       role = CASE WHEN venue_contacts.role = 'general' THEN EXCLUDED.role ELSE venue_contacts.role END,
       phone = CASE WHEN venue_contacts.phone = '' THEN EXCLUDED.phone ELSE venue_contacts.phone END,
       verified = venue_contacts.verified OR EXCLUDED.verified`,
    [c.venue_id, c.name, c.role, (c.email ?? "").toLowerCase(), c.phone, c.source, c.verified],
  );
}

export async function deleteVenueContact(id: number): Promise<void> {
  await query(`DELETE FROM venue_contacts WHERE id = $1`, [id]);
}

export async function addVenueActivity(venueId: number, kind: string, body: string, by: string): Promise<void> {
  await query(`INSERT INTO venue_activity (venue_id, kind, body, by_name) VALUES ($1,$2,$3,$4)`, [venueId, kind, body, by]);
}

export async function listVenueActivity(venueId: number): Promise<VenueActivity[]> {
  return query<VenueActivity>(`SELECT * FROM venue_activity WHERE venue_id = $1 ORDER BY created_at DESC LIMIT 100`, [venueId]);
}

export async function venueCounts(): Promise<{ total: number; byStatus: Record<string, number>; byRegion: Record<string, number>; withEmail: number; due: number }> {
  const [st, rg, em, due] = await Promise.all([
    query<{ status: string; count: string }>(`SELECT status, COUNT(*) AS count FROM venues GROUP BY status`),
    query<{ region: string; count: string }>(`SELECT region, COUNT(*) AS count FROM venues GROUP BY region`),
    queryOne<{ count: string }>(`SELECT COUNT(*) AS count FROM venues v WHERE v.email <> '' OR EXISTS (SELECT 1 FROM venue_contacts c WHERE c.venue_id = v.id AND c.email <> '')`),
    queryOne<{ count: string }>(`SELECT COUNT(*) AS count FROM venues WHERE next_touch_at <= CURRENT_DATE AND status IN ('contacted','replied')`),
  ]);
  const byStatus: Record<string, number> = {};
  for (const r of st) byStatus[r.status] = parseInt(r.count, 10);
  const byRegion: Record<string, number> = {};
  for (const r of rg) byRegion[r.region] = parseInt(r.count, 10);
  const total = Object.values(byStatus).reduce((a, b) => a + b, 0);
  return { total, byStatus, byRegion, withEmail: parseInt(em?.count ?? "0", 10), due: parseInt(due?.count ?? "0", 10) };
}
