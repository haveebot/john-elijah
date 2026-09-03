/**
 * Seeds the database from scripts/seed-data/content.ts. Idempotent — every
 * write is an upsert keyed on key/slug/name/url. Rates are only set when a
 * configuration is NEW (HQ owns them afterwards).
 *
 * Usage: node --env-file=.env.local --import tsx scripts/seed.ts
 */

import { CONFIGURATIONS, RESIDENCIES, RELEASES, BAND, PRESS, PRODUCTS, TRAVEL_BANDS, VIDEOS, SHOWS } from "./seed-data/content";
import { upsertConfiguration, upsertTravelBand } from "../src/lib/db/bookings";
import { upsertResidency, upsertShow } from "../src/lib/db/shows";
import { upsertVideo } from "../src/lib/db/videos";
import { upsertRelease, upsertBandMember, upsertPress } from "../src/lib/db/music";
import { upsertProduct } from "../src/lib/db/commerce";
import { query } from "../src/lib/db/client";

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  for (const c of CONFIGURATIONS) await upsertConfiguration({ ...c, is_public: true });
  console.log(`seed: ${CONFIGURATIONS.length} configurations`);

  for (const r of RESIDENCIES) await upsertResidency(r);
  console.log(`seed: ${RESIDENCIES.length} residencies`);

  for (const t of TRAVEL_BANDS) await upsertTravelBand(t);
  console.log(`seed: ${TRAVEL_BANDS.length} travel bands`);

  for (const v of VIDEOS) await upsertVideo(v);
  console.log(`seed: ${VIDEOS.length} videos`);

  for (const s of SHOWS) await upsertShow(s);
  console.log(`seed: ${SHOWS.length} shows`);

  for (const r of RELEASES) {
    const { tracks, ...rest } = r;
    await upsertRelease(rest, tracks);
  }
  console.log(`seed: ${RELEASES.length} releases`);

  for (const m of BAND) await upsertBandMember(m);
  console.log(`seed: ${BAND.length} band members`);

  for (const p of PRESS) await upsertPress(p);
  console.log(`seed: ${PRESS.length} press items`);

  for (const p of PRODUCTS) {
    const { variants, ...rest } = p;
    await upsertProduct(rest, variants);
  }
  console.log(`seed: ${PRODUCTS.length} products`);

  await query(`INSERT INTO hub_preferences (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
  console.log("seed: done");
  process.exit(0);
}

main().catch((err) => {
  console.error("seed: FAILED");
  console.error(err);
  process.exit(1);
});
