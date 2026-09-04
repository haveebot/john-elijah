import { NextResponse } from "next/server";
import { drain, dueVenueIds, buildDrafts, sentToday } from "@/lib/db/outreach-queue";
import { mailEnabled } from "@/lib/mail";

export const maxDuration = 120;

/**
 * Hourly (vercel.json). Business hours only (9–17 Central, Mon–Fri):
 *   · drafts follow-ups for venues whose touch is due (they wait for approval)
 *   · sends up to PER_RUN approved rows, never past DAILY_CAP for the day
 * Auth: Vercel sends Authorization: Bearer ${CRON_SECRET}.
 */
const PER_RUN = 6;
const DAILY_CAP = 40;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const central = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const hour = central.getHours();
  const day = central.getDay();
  const inHours = day >= 1 && day <= 5 && hour >= 9 && hour < 17;

  const due = await dueVenueIds(30);
  const drafted = due.length ? await buildDrafts(due, "cron", "Winston") : { drafted: 0, skipped: 0 };

  if (!inHours || !mailEnabled()) return NextResponse.json({ ok: true, inHours, mail: mailEnabled(), drafted, sent: 0 });
  const already = await sentToday();
  const room = Math.max(0, Math.min(PER_RUN, DAILY_CAP - already));
  const result = room > 0 ? await drain(room, "cron") : { sent: 0, failed: 0, details: [] };
  return NextResponse.json({ ok: true, inHours, drafted, already, ...result });
}
