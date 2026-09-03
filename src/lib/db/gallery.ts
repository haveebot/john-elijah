/**
 * Gallery — the photo library (assets table). Public reads are tag-driven
 * so the site can ask for "hero", "stage", "crowd" without knowing filenames.
 */

import { query, queryOne } from "./client";

export type Asset = {
  id: string;
  blob_url: string;
  thumb_url: string | null;
  source_url: string | null;
  kind: string;
  alt: string;
  width: number | null;
  height: number | null;
  credit: string;
  tags: string[];
  featured: boolean;
  is_public: boolean;
  sort_weight: number;
  taken_on: string | null;
  created_at: string;
};

export async function listPublicAssets(limit = 120): Promise<Asset[]> {
  return query<Asset>(
    `SELECT * FROM assets WHERE is_public AND kind = 'image'
     ORDER BY featured DESC, sort_weight, taken_on DESC NULLS LAST, created_at DESC LIMIT $1`,
    [limit],
  );
}

export async function listAssetsByTag(tag: string, limit = 24): Promise<Asset[]> {
  return query<Asset>(
    `SELECT * FROM assets WHERE is_public AND $1 = ANY(tags)
     ORDER BY featured DESC, sort_weight, created_at DESC LIMIT $2`,
    [tag, limit],
  );
}

export async function listFeaturedAssets(limit = 8): Promise<Asset[]> {
  return query<Asset>(
    `SELECT * FROM assets WHERE is_public AND featured ORDER BY sort_weight, created_at DESC LIMIT $1`,
    [limit],
  );
}

export async function getHeroAsset(): Promise<Asset | null> {
  return queryOne<Asset>(
    `SELECT * FROM assets WHERE is_public AND 'hero' = ANY(tags) ORDER BY sort_weight LIMIT 1`,
  );
}

export async function listAllAssets(): Promise<Asset[]> {
  return query<Asset>(`SELECT * FROM assets ORDER BY sort_weight, created_at DESC`);
}

export async function upsertAssetBySource(a: {
  source_url: string;
  blob_url: string;
  thumb_url?: string | null;
  alt?: string;
  width?: number | null;
  height?: number | null;
  credit?: string;
  tags?: string[];
  featured?: boolean;
  sort_weight?: number;
  taken_on?: string | null;
}): Promise<string> {
  const rows = await query<{ id: string }>(
    `INSERT INTO assets (source_url, blob_url, thumb_url, alt, width, height, credit, tags, featured, sort_weight, taken_on)
     VALUES ($1,$2,$3,COALESCE($4,''),$5,$6,COALESCE($7,''),COALESCE($8::text[],'{}'),COALESCE($9,false),COALESCE($10,100),$11)
     ON CONFLICT (source_url) WHERE source_url IS NOT NULL DO UPDATE SET
       blob_url=EXCLUDED.blob_url, thumb_url=EXCLUDED.thumb_url, width=EXCLUDED.width, height=EXCLUDED.height,
       taken_on=EXCLUDED.taken_on,
       -- operator-owned fields survive re-imports
       alt=CASE WHEN assets.alt = '' THEN EXCLUDED.alt ELSE assets.alt END,
       credit=CASE WHEN assets.credit = '' THEN EXCLUDED.credit ELSE assets.credit END,
       tags=CASE WHEN cardinality(assets.tags) = 0 THEN EXCLUDED.tags ELSE assets.tags END
     RETURNING id`,
    [
      a.source_url, a.blob_url, a.thumb_url ?? null, a.alt, a.width ?? null, a.height ?? null,
      a.credit, a.tags, a.featured, a.sort_weight, a.taken_on ?? null,
    ],
  );
  return rows[0].id;
}

export async function updateAsset(
  id: string,
  patch: Partial<Pick<Asset, "alt" | "credit" | "tags" | "featured" | "is_public" | "sort_weight">>,
): Promise<void> {
  const existing = await queryOne<Asset>(`SELECT * FROM assets WHERE id = $1`, [id]);
  if (!existing) return;
  const next = { ...existing, ...patch };
  await query(
    `UPDATE assets SET alt=$2, credit=$3, tags=$4::text[], featured=$5, is_public=$6, sort_weight=$7 WHERE id=$1`,
    [id, next.alt, next.credit, next.tags, next.featured, next.is_public, next.sort_weight],
  );
}

export async function assetCount(): Promise<number> {
  const row = await queryOne<{ count: string }>(`SELECT COUNT(*) AS count FROM assets WHERE is_public`);
  return parseInt(row?.count ?? "0", 10);
}
