import Link from "next/link";
import { listFiles, fileTotals, FOLDERS } from "@/lib/db/files";
import { Uploader } from "./uploader";
import { actionUpdateFile, actionDeleteFile } from "../actions";

export const dynamic = "force-dynamic";

function fmtBytes(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)} KB`;
  return `${n} B`;
}

export default async function HqFiles({ searchParams }: { searchParams: Promise<{ folder?: string }> }) {
  const { folder } = await searchParams;
  const [files, totals] = await Promise.all([listFiles(folder), fileTotals()]);

  return (
    <div>
      <p className="label">Files</p>
      <h1 className="wordmark mt-2 text-4xl">The drive · {totals.count} files · {fmtBytes(totals.bytes)}</h1>
      <p className="mt-2 max-w-2xl text-sm text-ink-dim">
        Shared between everyone with an HQ code. John: masters, stems, video. Jacob: designs, exports, source files. Files land in a folder and can be moved; every file has a permanent link.
      </p>

      <div className="mt-6">
        <Uploader />
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href="/hq/files" className={`btn btn-sm ${!folder ? "btn-brass" : "btn-ghost"}`}>All</Link>
        {FOLDERS.map((f) => (
          <Link key={f} href={`/hq/files?folder=${f}`} className={`btn btn-sm ${folder === f ? "btn-brass" : "btn-ghost"}`}>{f}</Link>
        ))}
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-canvas-edge/60 bg-canvas-raised">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-canvas-edge/60">
              {["File", "Kind", "Size", "Folder", "By", "When", "Notes", ""].map((h) => (
                <th key={h} className="label px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-canvas-edge/40">
            {files.map((f) => (
              <tr key={f.id}>
                <td className="max-w-[280px] truncate px-4 py-2.5"><a href={f.blob_url} target="_blank" rel="noopener noreferrer" className="brass-link text-ink">{f.filename}</a></td>
                <td className="px-4 py-2.5 text-ink-dim">{f.kind}</td>
                <td className="px-4 py-2.5 text-ink-dim">{fmtBytes(Number(f.size_bytes))}</td>
                <td className="px-4 py-2.5">
                  <form action={actionUpdateFile} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={f.id} />
                    <select name="folder" defaultValue={f.folder} className="field py-1 text-xs">
                      {FOLDERS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                    <input type="hidden" name="notes" value={f.notes} />
                    <button type="submit" className="btn btn-ghost btn-sm">Move</button>
                  </form>
                </td>
                <td className="px-4 py-2.5 text-ink-dim">{f.uploaded_by || "—"}</td>
                <td className="px-4 py-2.5 text-ink-dim">{new Date(f.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2.5">
                  <form action={actionUpdateFile} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={f.id} />
                    <input type="hidden" name="folder" value={f.folder} />
                    <input name="notes" defaultValue={f.notes} placeholder="note" className="field w-40 py-1 text-xs" />
                    <button type="submit" className="btn btn-ghost btn-sm">Save</button>
                  </form>
                </td>
                <td className="px-4 py-2.5">
                  <form action={actionDeleteFile}>
                    <input type="hidden" name="id" value={f.id} />
                    <button type="submit" className="text-xs text-coral hover:underline">Delete</button>
                  </form>
                </td>
              </tr>
            ))}
            {files.length === 0 ? <tr><td className="px-4 py-3 text-ink-faint" colSpan={8}>Nothing here yet.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
