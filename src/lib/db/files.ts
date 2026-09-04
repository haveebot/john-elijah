/**
 * Files — the shared drive. Rows point at Vercel Blob objects uploaded
 * straight from the browser (client uploads: no size wall, multipart for
 * big video/audio). Folder + kind are how HQ filters; tags/notes are free.
 */

import { query, queryOne } from "./client";

export const FOLDERS = ["music", "video", "photos", "designs", "docs", "inbox"] as const;
export type Folder = (typeof FOLDERS)[number];

export type FileRow = {
  id: string;
  pathname: string;
  blob_url: string;
  filename: string;
  size_bytes: string | number;
  content_type: string;
  kind: string;
  folder: string;
  uploaded_by: string;
  notes: string;
  tags: string[];
  created_at: string;
};

export function kindFor(contentType: string, filename: string): string {
  const ct = contentType.toLowerCase();
  const ext = (filename.split(".").pop() ?? "").toLowerCase();
  if (ct.startsWith("audio/") || ["wav", "aif", "aiff", "flac", "mp3", "m4a"].includes(ext)) return "audio";
  if (ct.startsWith("video/") || ["mp4", "mov", "m4v", "webm", "mkv"].includes(ext)) return "video";
  if (ct.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "heic", "tif", "tiff", "gif"].includes(ext)) return "image";
  if (["ai", "psd", "svg", "eps", "sketch", "fig", "indd", "afdesign"].includes(ext)) return "design";
  if (["pdf", "doc", "docx", "txt", "md", "xlsx", "csv", "pages", "numbers"].includes(ext)) return "doc";
  return "other";
}

export function folderFor(kind: string): Folder {
  if (kind === "audio") return "music";
  if (kind === "video") return "video";
  if (kind === "image") return "photos";
  if (kind === "design") return "designs";
  if (kind === "doc") return "docs";
  return "inbox";
}

export async function listFiles(folder?: string): Promise<FileRow[]> {
  if (folder && (FOLDERS as readonly string[]).includes(folder)) {
    return query<FileRow>(`SELECT * FROM files WHERE folder = $1 ORDER BY created_at DESC`, [folder]);
  }
  return query<FileRow>(`SELECT * FROM files ORDER BY created_at DESC`);
}

export async function upsertFile(f: {
  pathname: string;
  blob_url: string;
  filename: string;
  size_bytes: number;
  content_type: string;
  kind?: string;
  folder?: string;
  uploaded_by?: string;
  notes?: string;
}): Promise<FileRow> {
  const kind = f.kind ?? kindFor(f.content_type, f.filename);
  const folder = f.folder && (FOLDERS as readonly string[]).includes(f.folder) ? f.folder : folderFor(kind);
  const rows = await query<FileRow>(
    `INSERT INTO files (pathname, blob_url, filename, size_bytes, content_type, kind, folder, uploaded_by, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,COALESCE($8,''),COALESCE($9,''))
     ON CONFLICT (pathname) DO UPDATE SET
       blob_url=EXCLUDED.blob_url, size_bytes=EXCLUDED.size_bytes, content_type=EXCLUDED.content_type,
       kind=EXCLUDED.kind, folder=EXCLUDED.folder,
       uploaded_by=CASE WHEN files.uploaded_by = '' THEN EXCLUDED.uploaded_by ELSE files.uploaded_by END
     RETURNING *`,
    [f.pathname, f.blob_url, f.filename, f.size_bytes, f.content_type, kind, folder, f.uploaded_by, f.notes],
  );
  return rows[0];
}

export async function updateFile(id: string, patch: { folder?: string; notes?: string; tags?: string[] }): Promise<void> {
  const existing = await queryOne<FileRow>(`SELECT * FROM files WHERE id = $1`, [id]);
  if (!existing) return;
  const folder = patch.folder && (FOLDERS as readonly string[]).includes(patch.folder) ? patch.folder : existing.folder;
  await query(`UPDATE files SET folder=$2, notes=$3, tags=$4::text[] WHERE id=$1`, [
    id,
    folder,
    patch.notes ?? existing.notes,
    patch.tags ?? existing.tags,
  ]);
}

export async function getFile(id: string): Promise<FileRow | null> {
  return queryOne<FileRow>(`SELECT * FROM files WHERE id = $1`, [id]);
}

export async function deleteFileRow(id: string): Promise<void> {
  await query(`DELETE FROM files WHERE id = $1`, [id]);
}

export async function fileTotals(): Promise<{ count: number; bytes: number }> {
  const row = await queryOne<{ count: string; bytes: string | null }>(`SELECT COUNT(*) AS count, SUM(size_bytes) AS bytes FROM files`);
  return { count: parseInt(row?.count ?? "0", 10), bytes: parseInt(row?.bytes ?? "0", 10) || 0 };
}
