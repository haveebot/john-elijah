import Link from "next/link";
import { listQueue, queueCounts, sentToday } from "@/lib/db/outreach-queue";
import { venueCounts, REGIONS, REGION_LABELS, VENUE_KINDS } from "@/lib/db/venues";
import { mailEnabled } from "@/lib/mail";
import { actionBuildBatch, actionApproveQueue, actionSkipQueue, actionUpdateQueueRow, actionSendNext, actionDraftDue } from "../actions";

export const dynamic = "force-dynamic";

export default async function HqOutreach({ searchParams }: { searchParams: Promise<{ status?: string; result?: string }> }) {
  const sp = await searchParams;
  const status = sp.status ?? "draft";
  const [rows, counts, today, vc] = await Promise.all([listQueue(status), queueCounts(), sentToday(), venueCounts()]);

  return (
    <div>
      <p className="label">Outreach</p>
      <h1 className="wordmark mt-2 text-4xl">Batch mode</h1>
      <p className="mt-2 text-sm text-ink-dim">
        Build drafts for a slice of the map, read them, approve the ones you like, and the sender paces them out from booking@: six an hour in business hours, forty a day. Follow-ups draft themselves when a touch comes due and wait here for your approval.
      </p>
      {sp.result ? <p className="mt-3 rounded border border-brass/40 bg-canvas-raised px-4 py-2 text-sm text-ink">{decodeURIComponent(sp.result)}</p> : null}

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_1fr]">
        <form action={actionBuildBatch} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
          <p className="label mb-3">1 · Build a batch</p>
          <div className="grid grid-cols-2 gap-3">
            <select name="region" className="field"><option value="">Any region</option>{REGIONS.filter((r) => vc.byRegion[r]).map((r) => <option key={r} value={r}>{REGION_LABELS[r]} · {vc.byRegion[r]}</option>)}</select>
            <select name="kind" className="field"><option value="">Any kind</option>{VENUE_KINDS.map((k) => <option key={k} value={k}>{k.replace("_", " ")}</option>)}</select>
            <label className="text-xs text-ink-faint">Min fit score<input name="min_score" type="number" min="0" max="100" defaultValue={60} className="field mt-1" /></label>
            <label className="text-xs text-ink-faint">Max venues<input name="limit" type="number" min="1" max="100" defaultValue={20} className="field mt-1" /></label>
          </div>
          <p className="mt-2 text-xs text-ink-faint">Only venues with an address on file and no open draft. Sorted by fit.</p>
          <button type="submit" className="btn btn-brass btn-sm mt-3">Draft first touches</button>
        </form>

        <div className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
          <p className="label mb-3">The sender</p>
          <p className="text-sm text-ink-dim">Sent today: <span className="text-ink">{today}</span> / 40 · Drafts {counts.draft ?? 0} · Approved {counts.approved ?? 0} · Sent {counts.sent ?? 0} · Failed {counts.failed ?? 0}</p>
          <p className="mt-1 text-xs text-ink-faint">{mailEnabled() ? "Mail connected. Cron drains approved rows hourly, 9–5 Central, weekdays." : "Mail isn't connected; nothing sends."}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <form action={actionSendNext}><input type="hidden" name="n" value="10" /><button type="submit" disabled={!mailEnabled() || !(counts.approved)} className="btn btn-brass btn-sm disabled:opacity-40">Send next 10 now</button></form>
            <form action={actionDraftDue}><button type="submit" className="btn btn-ghost btn-sm">Draft due follow-ups</button></form>
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {["draft", "approved", "sent", "failed", "skipped"].map((s) => (
          <Link key={s} href={`/hq/outreach?status=${s}`} className={`btn btn-sm ${status === s ? "btn-brass" : "btn-ghost"}`}>{s} · {counts[s] ?? 0}</Link>
        ))}
      </div>

      {status === "draft" && rows.length > 0 ? (
        <form action={actionApproveQueue} className="mt-4 flex items-center gap-3">
          {rows.map((r) => <input key={r.id} type="hidden" name="ids" value={r.id} />)}
          <button type="submit" className="btn btn-brass btn-sm">Approve all {rows.length} shown</button>
          <span className="text-xs text-ink-faint">or approve one at a time below after reading it</span>
        </form>
      ) : null}

      <div className="mt-4 space-y-4">
        {rows.map((r) => (
          <div key={r.id} className="rounded-lg border border-canvas-edge/60 bg-canvas-raised p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <p className="wordmark text-xl"><Link href={`/hq/venues/${r.venue_id}`} className="brass-link">{r.venue_name}</Link> <span className="label ml-2">{r.venue_city} · fit {r.venue_score} · touch {r.touch} · {r.status}{r.sent_at ? ` · ${new Date(r.sent_at).toLocaleString()}` : ""}</span></p>
              {r.error ? <span className="text-xs text-coral">{r.error}</span> : null}
            </div>
            {r.status === "draft" || r.status === "approved" ? (
              <form action={actionUpdateQueueRow} className="mt-3 space-y-2">
                <input type="hidden" name="id" value={r.id} />
                <div className="grid gap-2 md:grid-cols-2">
                  <input name="to_email" defaultValue={r.to_email} className="field py-1.5 text-sm" />
                  <input name="subject" defaultValue={r.subject} className="field py-1.5 text-sm" />
                </div>
                <textarea name="body" defaultValue={r.body} rows={9} className="field font-mono text-xs" />
                <div className="flex flex-wrap gap-2">
                  <button type="submit" name="intent" value="save" className="btn btn-ghost btn-sm">Save edits</button>
                  {r.status === "draft" ? <button type="submit" name="intent" value="approve" className="btn btn-brass btn-sm">Approve</button> : null}
                  <button type="submit" name="intent" value="skip" className="text-xs text-coral hover:underline">Skip</button>
                </div>
              </form>
            ) : (
              <pre className="mt-3 whitespace-pre-wrap font-mono text-xs text-ink-dim">{r.to_email}\n{r.subject}\n\n{r.body}</pre>
            )}
          </div>
        ))}
        {rows.length === 0 ? <p className="text-sm text-ink-faint">Nothing in {status}.</p> : null}
      </div>
      <form action={actionSkipQueue} className="hidden"><input type="hidden" name="ids" value="" /></form>
    </div>
  );
}
