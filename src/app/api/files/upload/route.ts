import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAuth } from "@/lib/auth/require";
import { upsertFile, kindFor } from "@/lib/db/files";

/**
 * Browser-direct uploads to Vercel Blob (client uploads). The browser asks
 * here for a scoped token, then streams the file straight to Blob —
 * multipart for big video/audio, no serverless body limit. Session-gated.
 * Vercel calls back onUploadCompleted with the final blob; we record it.
 * (The uploader also records client-side as a belt-and-braces upsert.)
 */
export async function POST(request: Request): Promise<NextResponse> {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth as NextResponse;
  const who = auth.type === "user" ? auth.name : auth.tokenName;

  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const payload = clientPayload ? (JSON.parse(clientPayload) as { folder?: string; contentType?: string }) : {};
        return {
          addRandomSuffix: false,
          maximumSizeInBytes: 6 * 1024 * 1024 * 1024, // 6 GB
          tokenPayload: JSON.stringify({ who, folder: payload.folder ?? "" }),
          allowedContentTypes: undefined,
          validUntil: Date.now() + 2 * 60 * 60 * 1000,
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const meta = tokenPayload ? (JSON.parse(tokenPayload) as { who?: string; folder?: string }) : {};
        const filename = blob.pathname.split("/").pop() ?? blob.pathname;
        await upsertFile({
          pathname: blob.pathname,
          blob_url: blob.url,
          filename,
          size_bytes: 0,
          content_type: blob.contentType ?? "",
          kind: kindFor(blob.contentType ?? "", filename),
          folder: meta.folder || undefined,
          uploaded_by: meta.who ?? "",
        });
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "upload-failed" }, { status: 400 });
  }
}
