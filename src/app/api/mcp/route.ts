import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/require";
import {
  listBookings,
  getBooking,
  updateBooking,
  addBookingEvent,
  listBookingEvents,
  createBooking,
  listConfigurations,
  bookingCounts,
  BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/db/bookings";
import { listAllShows, listUpcomingShows, upsertShow, listResidencies } from "@/lib/db/shows";
import { listReleases, listBandMembers, listPress, updateReleaseStory } from "@/lib/db/music";
import { listAllAssets, updateAsset } from "@/lib/db/gallery";
import { listOrders, listAllProducts } from "@/lib/db/commerce";
import { subscriberCount } from "@/lib/db/engagement";
import { listFiles } from "@/lib/db/files";

/**
 * MCP over HTTP (JSON-RPC 2.0) — agent access to John Elijah HQ.
 * Auth: Bearer agent token (hub-minted). Exactly initialize / tools/list /
 * tools/call, which is all HTTP MCP needs here.
 */

type Json = Record<string, unknown>;

const TOOLS = [
  { name: "band_snapshot", description: "One-call overview: pipeline counts, next shows, orders, list size.", inputSchema: { type: "object", properties: {} } },
  { name: "list_bookings", description: "List bookings, optionally by status.", inputSchema: { type: "object", properties: { status: { type: "string", enum: [...BOOKING_STATUSES] } } } },
  { name: "get_booking", description: "One booking with its activity trail.", inputSchema: { type: "object", properties: { id: { type: "number" } }, required: ["id"] } },
  { name: "create_booking", description: "Log a booking inquiry (phone/text/DM) into the pipeline.", inputSchema: { type: "object", properties: { contact_name: { type: "string" }, contact_email: { type: "string" }, contact_phone: { type: "string" }, event_kind: { type: "string" }, event_date: { type: "string", description: "YYYY-MM-DD" }, start_time: { type: "string" }, venue_name: { type: "string" }, city: { type: "string" }, configuration: { type: "string", enum: ["solo", "duo", "trio", "four_piece", "full_band"] }, details: { type: "string" }, source: { type: "string" } }, required: ["contact_name", "contact_email"] } },
  { name: "set_booking_status", description: "Move a booking to a new status.", inputSchema: { type: "object", properties: { id: { type: "number" }, status: { type: "string", enum: [...BOOKING_STATUSES] } }, required: ["id", "status"] } },
  { name: "set_booking_quote", description: "Set quote (and optional deposit) in dollars.", inputSchema: { type: "object", properties: { id: { type: "number" }, quote_dollars: { type: "number" }, deposit_dollars: { type: "number" } }, required: ["id", "quote_dollars"] } },
  { name: "add_booking_note", description: "Append a note to a booking.", inputSchema: { type: "object", properties: { id: { type: "number" }, body: { type: "string" } }, required: ["id", "body"] } },
  { name: "list_rate_card", description: "The configurations and working rates.", inputSchema: { type: "object", properties: {} } },
  { name: "list_shows", description: "Shows on the calendar (all, or upcoming only).", inputSchema: { type: "object", properties: { upcoming_only: { type: "boolean" } } } },
  { name: "add_show", description: "Add or update a dated show (upserts by date + venue).", inputSchema: { type: "object", properties: { date: { type: "string" }, venue_name: { type: "string" }, city: { type: "string" }, start_time: { type: "string" }, venue_url: { type: "string" }, ticket_url: { type: "string" }, kind: { type: "string" }, is_public: { type: "boolean" } }, required: ["date", "venue_name"] } },
  { name: "list_residencies", description: "Standing weekly gigs.", inputSchema: { type: "object", properties: {} } },
  { name: "list_releases", description: "Releases with tracklists.", inputSchema: { type: "object", properties: {} } },
  { name: "update_release_story", description: "Rewrite a release's story text.", inputSchema: { type: "object", properties: { slug: { type: "string" }, story: { type: "string" } }, required: ["slug", "story"] } },
  { name: "list_band", description: "Band members.", inputSchema: { type: "object", properties: {} } },
  { name: "list_press", description: "Press bank.", inputSchema: { type: "object", properties: {} } },
  { name: "list_photos", description: "Photo library rows (urls, tags, credits).", inputSchema: { type: "object", properties: {} } },
  { name: "tag_photo", description: "Set tags / alt / credit on a photo.", inputSchema: { type: "object", properties: { id: { type: "string" }, tags: { type: "array", items: { type: "string" } }, alt: { type: "string" }, credit: { type: "string" }, featured: { type: "boolean" } }, required: ["id"] } },
  { name: "list_products", description: "Merch catalog with variants + stock.", inputSchema: { type: "object", properties: {} } },
  { name: "list_orders", description: "Stripe orders.", inputSchema: { type: "object", properties: {} } },
  { name: "list_files", description: "The shared drive (music, video, photos, designs, docs) with permanent links.", inputSchema: { type: "object", properties: { folder: { type: "string", enum: ["music", "video", "photos", "designs", "docs", "inbox"] } } } },
];

async function callTool(name: string, args: Json): Promise<unknown> {
  switch (name) {
    case "band_snapshot": {
      const [counts, shows, orders, subs] = await Promise.all([bookingCounts(), listUpcomingShows(5), listOrders(), subscriberCount()]);
      return { pipeline: counts, next_shows: shows, orders: orders.length, subscribers: subs };
    }
    case "list_bookings":
      return listBookings(typeof args.status === "string" ? args.status : undefined);
    case "get_booking": {
      const b = await getBooking(Number(args.id));
      if (!b) return { error: "not-found" };
      return { ...b, events: await listBookingEvents(b.id) };
    }
    case "create_booking": {
      const configs = await listConfigurations();
      const configuration = configs.some((c) => c.key === args.configuration) ? String(args.configuration) : null;
      const date = String(args.event_date ?? "");
      return createBooking({
        contact_name: String(args.contact_name).slice(0, 200),
        contact_email: String(args.contact_email).slice(0, 200),
        contact_phone: String(args.contact_phone ?? "").slice(0, 50),
        event_kind: String(args.event_kind ?? "venue").slice(0, 20),
        event_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
        start_time: String(args.start_time ?? "").slice(0, 40),
        venue_name: String(args.venue_name ?? "").slice(0, 200),
        city: String(args.city ?? "").slice(0, 120),
        configuration,
        details: String(args.details ?? "").slice(0, 4000),
        source: String(args.source ?? "agent").slice(0, 40),
      });
    }
    case "set_booking_status": {
      const status = String(args.status) as BookingStatus;
      if (!BOOKING_STATUSES.includes(status)) return { error: "bad-status" };
      return updateBooking(Number(args.id), { status });
    }
    case "set_booking_quote": {
      const id = Number(args.id);
      const quote = Number(args.quote_dollars);
      const deposit = Number(args.deposit_dollars);
      if (!Number.isFinite(quote)) return { error: "bad-quote" };
      const b = await updateBooking(id, {
        quote_cents: Math.round(quote * 100),
        deposit_cents: Number.isFinite(deposit) ? Math.round(deposit * 100) : undefined,
      });
      await addBookingEvent(id, "quote", `Quote set by agent: $${quote.toFixed(0)}`);
      return b;
    }
    case "add_booking_note":
      await addBookingEvent(Number(args.id), "note", String(args.body ?? "").slice(0, 4000));
      return { ok: true };
    case "list_rate_card":
      return listConfigurations();
    case "list_shows":
      return args.upcoming_only ? listUpcomingShows(100) : listAllShows();
    case "add_show":
      return upsertShow({
        date: String(args.date),
        venue_name: String(args.venue_name).slice(0, 200),
        city: String(args.city ?? "").slice(0, 120),
        start_time: String(args.start_time ?? "").slice(0, 40),
        venue_url: args.venue_url ? String(args.venue_url).slice(0, 400) : null,
        ticket_url: args.ticket_url ? String(args.ticket_url).slice(0, 400) : null,
        kind: String(args.kind ?? "club").slice(0, 20),
        is_public: args.is_public !== false,
      });
    case "list_residencies":
      return listResidencies(false);
    case "list_releases":
      return listReleases(false);
    case "update_release_story":
      return (await updateReleaseStory(String(args.slug), String(args.story ?? "").slice(0, 8000))) ? { ok: true } : { error: "not-found" };
    case "list_band":
      return listBandMembers(false);
    case "list_press":
      return listPress(false);
    case "list_photos":
      return listAllAssets();
    case "tag_photo":
      await updateAsset(String(args.id), {
        tags: Array.isArray(args.tags) ? (args.tags as unknown[]).map(String).slice(0, 12) : undefined,
        alt: typeof args.alt === "string" ? args.alt.slice(0, 300) : undefined,
        credit: typeof args.credit === "string" ? args.credit.slice(0, 120) : undefined,
        featured: typeof args.featured === "boolean" ? args.featured : undefined,
      });
      return { ok: true };
    case "list_products":
      return listAllProducts();
    case "list_orders":
      return listOrders();
    case "list_files":
      return listFiles(typeof args.folder === "string" ? args.folder : undefined);
    default:
      throw new Error(`unknown tool: ${name}`);
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth();
  if (auth instanceof Response) return auth;

  let rpc: { jsonrpc?: string; id?: unknown; method?: string; params?: Json };
  try {
    rpc = await request.json();
  } catch {
    return NextResponse.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "parse error" } }, { status: 400 });
  }
  const id = rpc.id ?? null;

  try {
    switch (rpc.method) {
      case "initialize":
        return NextResponse.json({
          jsonrpc: "2.0",
          id,
          result: { protocolVersion: "2025-06-18", capabilities: { tools: {} }, serverInfo: { name: "john-elijah-hq", version: "0.1.0" } },
        });
      case "notifications/initialized":
        return new Response(null, { status: 202 });
      case "tools/list":
        return NextResponse.json({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
      case "tools/call": {
        const params = (rpc.params ?? {}) as { name?: string; arguments?: Json };
        const result = await callTool(String(params.name), params.arguments ?? {});
        return NextResponse.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] } });
      }
      default:
        return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32601, message: `method not found: ${rpc.method}` } });
    }
  } catch (err) {
    return NextResponse.json({ jsonrpc: "2.0", id, error: { code: -32000, message: err instanceof Error ? err.message : "server error" } });
  }
}
