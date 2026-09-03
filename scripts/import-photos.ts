/**
 * Imports a local folder of photos into Vercel Blob + the assets table.
 *
 * Cost-shape: originals are 6000×4000 / 12–17 MB. We never upload those.
 * Each file is resized with macOS `sips` to a ≤2400px web JPEG and a
 * ≤800px thumb, both uploaded; the site only ever serves those.
 *
 * Usage:
 *   node --env-file=.env.local --import tsx scripts/import-photos.ts <dir> [--tags stage,psc] [--credit "Name"] [--taken 2025-05-25] [--featured N]
 *
 * Idempotent: upserts on source_url = "<dirname>/<filename>". Re-running
 * refreshes blob copies; operator-edited alt/credit/tags survive.
 */

import { readdirSync, statSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join, basename, extname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { put } from "@vercel/blob";
import { upsertAssetBySource } from "../src/lib/db/gallery";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

function resize(src: string, out: string, max: number): { width: number; height: number } {
  execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "82", "-Z", String(max), src, "--out", out], { stdio: "ignore" });
  const info = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", out]).toString();
  const width = Number(/pixelWidth: (\d+)/.exec(info)?.[1] ?? 0);
  const height = Number(/pixelHeight: (\d+)/.exec(info)?.[1] ?? 0);
  return { width, height };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error("usage: import-photos <dir> [--tags a,b] [--credit X] [--taken YYYY-MM-DD] [--featured N]");
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error("BLOB_READ_WRITE_TOKEN not set");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL not set");

  const tags = (arg("tags") ?? "").split(",").map((t) => t.trim().toLowerCase()).filter(Boolean);
  const credit = arg("credit") ?? "";
  const taken = arg("taken") ?? null;
  const featuredN = Number(arg("featured") ?? 0);
  const label = basename(dir);

  const files = readdirSync(dir)
    .filter((f) => /\.(jpe?g|png)$/i.test(f) && statSync(join(dir, f)).isFile())
    .sort();
  console.log(`import-photos: ${files.length} files from ${dir} → tags [${tags.join(", ")}]`);

  const tmp = mkdtempSync(join(tmpdir(), "je-photos-"));
  let n = 0;
  for (const file of files) {
    const src = join(dir, file);
    const stem = file.replace(extname(file), "").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const webPath = join(tmp, `${stem}-web.jpg`);
    const thumbPath = join(tmp, `${stem}-thumb.jpg`);
    const dims = resize(src, webPath, 2400);
    resize(src, thumbPath, 800);

    const web = await put(`photos/${label}/${stem}.jpg`, readFileSync(webPath), { access: "public", contentType: "image/jpeg", addRandomSuffix: false });
    const thumb = await put(`photos/${label}/${stem}-thumb.jpg`, readFileSync(thumbPath), { access: "public", contentType: "image/jpeg", addRandomSuffix: false });

    n += 1;
    await upsertAssetBySource({
      source_url: `${label}/${file}`,
      blob_url: web.url,
      thumb_url: thumb.url,
      alt: `John Elijah Band — ${label.replace(/[-_]/g, " ")}`,
      width: dims.width,
      height: dims.height,
      credit,
      tags,
      featured: n <= featuredN,
      sort_weight: 100 + n,
      taken_on: taken,
    });
    console.log(`  ✓ ${file} → ${dims.width}×${dims.height}`);
  }
  rmSync(tmp, { recursive: true, force: true });
  console.log(`import-photos: done — ${n} assets`);
  process.exit(0);
}

main().catch((err) => {
  console.error("import-photos: FAILED");
  console.error(err);
  process.exit(1);
});
