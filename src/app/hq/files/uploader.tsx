"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";

const FOLDERS = ["inbox", "music", "video", "photos", "designs", "docs"];

type Job = { name: string; pct: number; state: "queued" | "uploading" | "done" | "error"; error?: string };

function safeName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\- ]+/g, "").replace(/\s+/g, "-");
}

/**
 * Drag-and-drop uploader. Files go browser → Vercel Blob directly (multipart
 * for anything over 100 MB), so a 4 GB video is fine. Each finished file is
 * recorded through /api/files as well, in case the completion callback is slow.
 */
export function Uploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [folder, setFolder] = useState("inbox");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [over, setOver] = useState(false);

  async function run(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setJobs((j) => [...j, ...list.map((f) => ({ name: f.name, pct: 0, state: "queued" as const }))]);
    for (const file of list) {
      const idx = jobs.length + list.indexOf(file);
      const setJob = (patch: Partial<Job>) =>
        setJobs((j) => j.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
      setJob({ state: "uploading" });
      try {
        const stamp = new Date().toISOString().slice(0, 10);
        const pathname = `drive/${folder}/${stamp}-${safeName(file.name)}`;
        const blob = await upload(pathname, file, {
          access: "public",
          handleUploadUrl: "/api/files/upload",
          multipart: file.size > 100 * 1024 * 1024,
          clientPayload: JSON.stringify({ folder, contentType: file.type }),
          onUploadProgress: (p) => setJob({ pct: Math.round(p.percentage) }),
        });
        await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pathname: blob.pathname, url: blob.url, filename: file.name, size: file.size, contentType: file.type || blob.contentType, folder }),
        });
        setJob({ state: "done", pct: 100 });
      } catch (err) {
        setJob({ state: "error", error: err instanceof Error ? err.message : "failed" });
      }
    }
    router.refresh();
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); void run(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-10 text-center transition-colors ${over ? "border-brass bg-brass/10" : "border-canvas-edge bg-canvas-raised hover:border-ink-faint"}`}
      >
        <p className="wordmark text-2xl">Drop files here</p>
        <p className="mt-1 text-sm text-ink-dim">Music, video, photos, designs, documents. Any size — big files upload in parts.</p>
        <div className="mt-4 flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="label">Into</span>
          <select value={folder} onChange={(e) => setFolder(e.target.value)} className="field w-40 py-1 text-sm">
            {FOLDERS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-brass btn-sm">Choose files</button>
        </div>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={(e) => { if (e.target.files) void run(e.target.files); e.target.value = ""; }} />
      </div>
      {jobs.length > 0 ? (
        <ul className="setlist mt-4 rounded-lg border border-canvas-edge/60 bg-canvas-raised text-sm">
          {jobs.map((j, i) => (
            <li key={`${j.name}-${i}`} className="flex items-center gap-4 px-4 py-2.5">
              <span className="min-w-0 flex-1 truncate">{j.name}</span>
              <span className="h-1.5 w-40 overflow-hidden rounded bg-canvas">
                <span className={`block h-full ${j.state === "error" ? "bg-coral" : "bg-brass"}`} style={{ width: `${j.pct}%` }} />
              </span>
              <span className="label w-20 text-right">{j.state === "error" ? "failed" : j.state === "done" ? "done" : `${j.pct}%`}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
