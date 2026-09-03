/**
 * Videos — YouTube ids curated in HQ. Public pages render click-to-load
 * thumbnails (no YouTube iframe until tapped — cost-shape + page weight).
 */

import { query } from "./client";

export type Video = {
  id: number;
  youtube_id: string;
  title: string;
  kind: string;
  duration: string;
  featured: boolean;
  is_public: boolean;
  sort: number;
};

export async function listVideos(publicOnly = true): Promise<Video[]> {
  return query<Video>(
    `SELECT * FROM videos ${publicOnly ? "WHERE is_public" : ""} ORDER BY featured DESC, sort, created_at DESC`,
  );
}

export async function listFeaturedVideos(limit = 3): Promise<Video[]> {
  return query<Video>(`SELECT * FROM videos WHERE is_public AND featured ORDER BY sort LIMIT $1`, [limit]);
}

export async function upsertVideo(v: Partial<Video> & { youtube_id: string; title: string }): Promise<void> {
  await query(
    `INSERT INTO videos (youtube_id, title, kind, duration, featured, is_public, sort)
     VALUES ($1,$2,COALESCE($3,'live'),COALESCE($4,''),COALESCE($5,false),COALESCE($6,true),COALESCE($7,100))
     ON CONFLICT (youtube_id) DO UPDATE SET
       title=EXCLUDED.title, kind=EXCLUDED.kind, duration=EXCLUDED.duration, sort=EXCLUDED.sort`,
    [v.youtube_id, v.title, v.kind, v.duration, v.featured, v.is_public, v.sort],
  );
}

export async function toggleVideoFlag(id: number, flag: "featured" | "is_public"): Promise<void> {
  await query(`UPDATE videos SET ${flag} = NOT ${flag} WHERE id = $1`, [id]);
}

export async function deleteVideo(id: number): Promise<void> {
  await query(`DELETE FROM videos WHERE id = $1`, [id]);
}
