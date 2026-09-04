import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAuth } from "@/lib/auth/require";
import { listFiles, upsertFile, getFile, deleteFileRow, updateFile, kindFor } from "@/lib/db/files";

/** GET ?folder= → list · POST → record an uploaded blob · PATCH → folder/notes/tags · DELETE ?id= */
export async function GET(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const folder = new URL(request.url).searchParams.get("folder") ?? undefined;
  return NextResponse.json({ files: await listFiles(folder) });
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const who = auth.type === "user" ? auth.name : auth.tokenName;
  let b: { pathname?: string; url?: string; filename?: string; size?: number; contentType?: string; folder?: string; notes?: string };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!b.pathname || !b.url) return NextResponse.json({ error: "missing-fields" }, { status: 400 });
  const filename = b.filename ?? b.pathname.split("/").pop() ?? b.pathname;
  const row = await upsertFile({
    pathname: b.pathname,
    blob_url: b.url,
    filename,
    size_bytes: Number(b.size ?? 0) || 0,
    content_type: b.contentType ?? "",
    kind: kindFor(b.contentType ?? "", filename),
    folder: b.folder,
    uploaded_by: who,
    notes: b.notes ?? "",
  });
  return NextResponse.json({ ok: true, file: row });
}

export async function PATCH(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  let b: { id?: string; folder?: string; notes?: string; tags?: string[] };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  if (!b.id) return NextResponse.json({ error: "missing-id" }, { status: 400 });
  await updateFile(b.id, { folder: b.folder, notes: b.notes, tags: b.tags });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const row = await getFile(id);
  if (!row) return NextResponse.json({ error: "not-found" }, { status: 404 });
  try {
    await del(row.blob_url);
  } catch {
    /* blob already gone — still drop the row */
  }
  await deleteFileRow(id);
  return NextResponse.json({ ok: true });
}
