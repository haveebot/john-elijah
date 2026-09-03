/**
 * Music + story content — releases, tracks, band members, press.
 * Read paths feed the public site (ISR); write paths feed HQ + seed.
 */

import { query, queryOne } from "./client";

export type Release = {
  id: number;
  title: string;
  slug: string;
  kind: string;
  released_on: string | null;
  cover_url: string | null;
  cover_asset_url?: string | null;
  spotify_id: string | null;
  apple_url: string | null;
  youtube_url: string | null;
  bandcamp_url: string | null;
  story: string;
  is_public: boolean;
  sort: number;
  tracks?: Track[];
};

export type Track = {
  id: number;
  release_id: number;
  number: number;
  title: string;
  duration_ms: number | null;
  spotify_id: string | null;
};

export type BandMember = {
  id: number;
  name: string;
  instrument: string;
  bio: string;
  hometown: string;
  is_active: boolean;
  sort: number;
};

export type PressItem = {
  id: number;
  outlet: string;
  title: string;
  url: string | null;
  published_on: string | null;
  kind: string;
  pull_quote: string;
  is_public: boolean;
  sort_weight: number;
};

const RELEASE_SELECT = `
  SELECT r.*, a.blob_url AS cover_asset_url
  FROM releases r LEFT JOIN assets a ON a.id = r.cover_asset_id`;

export async function listReleases(publicOnly = true): Promise<Release[]> {
  const releases = await query<Release>(
    `${RELEASE_SELECT} ${publicOnly ? "WHERE r.is_public" : ""} ORDER BY r.sort, r.released_on DESC NULLS LAST`,
  );
  if (releases.length === 0) return releases;
  const tracks = await query<Track>(
    `SELECT * FROM tracks WHERE release_id = ANY($1) ORDER BY number`,
    [releases.map((r) => r.id)],
  );
  return releases.map((r) => ({ ...r, tracks: tracks.filter((t) => t.release_id === r.id) }));
}

export async function getReleaseBySlug(slug: string): Promise<Release | null> {
  const r = await queryOne<Release>(`${RELEASE_SELECT} WHERE r.slug = $1`, [slug]);
  if (!r) return null;
  const tracks = await query<Track>(`SELECT * FROM tracks WHERE release_id = $1 ORDER BY number`, [r.id]);
  return { ...r, tracks };
}

export async function upsertRelease(
  r: Partial<Release> & { title: string; slug: string },
  tracks?: { number: number; title: string; duration_ms?: number | null; spotify_id?: string | null }[],
): Promise<Release> {
  const rows = await query<Release>(
    `INSERT INTO releases (title, slug, kind, released_on, cover_url, spotify_id, apple_url, youtube_url, bandcamp_url, story, is_public, sort)
     VALUES ($1,$2,COALESCE($3,'album'),$4,$5,$6,$7,$8,$9,COALESCE($10,''),COALESCE($11,true),COALESCE($12,100))
     ON CONFLICT (slug) DO UPDATE SET
       title=EXCLUDED.title, kind=EXCLUDED.kind, released_on=EXCLUDED.released_on,
       cover_url=COALESCE(EXCLUDED.cover_url, releases.cover_url), spotify_id=EXCLUDED.spotify_id,
       apple_url=EXCLUDED.apple_url, youtube_url=EXCLUDED.youtube_url, bandcamp_url=EXCLUDED.bandcamp_url,
       story=EXCLUDED.story, is_public=EXCLUDED.is_public, sort=EXCLUDED.sort
     RETURNING *`,
    [
      r.title, r.slug, r.kind, r.released_on ?? null, r.cover_url ?? null, r.spotify_id ?? null,
      r.apple_url ?? null, r.youtube_url ?? null, r.bandcamp_url ?? null, r.story, r.is_public, r.sort,
    ],
  );
  const release = rows[0];
  if (tracks) {
    for (const t of tracks) {
      await query(
        `INSERT INTO tracks (release_id, number, title, duration_ms, spotify_id)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (release_id, number) DO UPDATE SET
           title=EXCLUDED.title, duration_ms=EXCLUDED.duration_ms, spotify_id=EXCLUDED.spotify_id`,
        [release.id, t.number, t.title, t.duration_ms ?? null, t.spotify_id ?? null],
      );
    }
  }
  return release;
}

export async function updateReleaseStory(slug: string, story: string): Promise<boolean> {
  const rows = await query(`UPDATE releases SET story = $2 WHERE slug = $1 RETURNING id`, [slug, story]);
  return rows.length > 0;
}

export async function listBandMembers(activeOnly = true): Promise<BandMember[]> {
  return query<BandMember>(
    `SELECT * FROM band_members ${activeOnly ? "WHERE is_active" : ""} ORDER BY sort, name`,
  );
}

export async function upsertBandMember(m: Partial<BandMember> & { name: string }): Promise<void> {
  await query(
    `INSERT INTO band_members (name, instrument, bio, hometown, is_active, sort)
     VALUES ($1,COALESCE($2,''),COALESCE($3,''),COALESCE($4,''),COALESCE($5,true),COALESCE($6,100))
     ON CONFLICT (name) DO UPDATE SET
       instrument=EXCLUDED.instrument, bio=EXCLUDED.bio, hometown=EXCLUDED.hometown,
       is_active=EXCLUDED.is_active, sort=EXCLUDED.sort`,
    [m.name, m.instrument, m.bio, m.hometown, m.is_active, m.sort],
  );
}

export async function listPress(publicOnly = true): Promise<PressItem[]> {
  return query<PressItem>(
    `SELECT * FROM press ${publicOnly ? "WHERE is_public" : ""} ORDER BY published_on DESC NULLS LAST, sort_weight`,
  );
}

export async function upsertPress(p: Partial<PressItem> & { outlet: string; title: string }): Promise<void> {
  await query(
    `INSERT INTO press (outlet, title, url, published_on, kind, pull_quote, sort_weight)
     VALUES ($1,$2,$3,$4,COALESCE($5,'web'),COALESCE($6,''),COALESCE($7,100))
     ON CONFLICT (url) WHERE url IS NOT NULL DO UPDATE SET
       outlet=EXCLUDED.outlet, title=EXCLUDED.title, published_on=EXCLUDED.published_on,
       kind=EXCLUDED.kind, pull_quote=EXCLUDED.pull_quote, sort_weight=EXCLUDED.sort_weight`,
    [p.outlet, p.title, p.url ?? null, p.published_on ?? null, p.kind, p.pull_quote, p.sort_weight],
  );
}
