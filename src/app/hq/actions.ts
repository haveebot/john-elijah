"use server";

/**
 * HQ server actions. Middleware gates /hq/* pages; every mutation here
 * re-verifies the session anyway — actions are network endpoints.
 */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentOperatorEmail } from "@/lib/auth/session";
import {
  updateBooking,
  addBookingEvent,
  createBooking,
  getBooking,
  setConfigurationRate,
  listConfigurations,
  BOOKING_STATUSES,
  type BookingStatus,
} from "@/lib/db/bookings";
import { upsertShow, setShowStatus, toggleShowPublic, deleteShow, upsertResidency, toggleResidency } from "@/lib/db/shows";
import { updateReleaseStory, upsertBandMember, upsertPress } from "@/lib/db/music";
import { updateAsset } from "@/lib/db/gallery";
import { query } from "@/lib/db/client";
import { createAgentToken, deleteAgentToken } from "@/lib/db/agent-tokens";
import { setOrderStatus, upsertProduct, getOrder, recordShipment, markShipmentPurchased } from "@/lib/db/commerce";
import { createShipment, purchaseLabel, stripeShippingToAddress, shippoEnabled } from "@/lib/shippo";
import { sendMail } from "@/lib/mail";
import { SITE } from "@/lib/site";

async function requireOperator(): Promise<string> {
  const email = await getCurrentOperatorEmail();
  if (!email) throw new Error("unauthorized");
  return email;
}

const PUBLIC_PATHS = ["/", "/shows", "/music", "/photos", "/band", "/book", "/shop"];
function revalidatePublic() {
  for (const p of PUBLIC_PATHS) revalidatePath(p);
}

// ── bookings ────────────────────────────────────────────────────────

export async function actionSetBookingStatus(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status")) as BookingStatus;
  if (!Number.isInteger(id) || !BOOKING_STATUSES.includes(status)) return;
  await updateBooking(id, { status });
  revalidatePath("/hq/bookings");
  revalidatePath(`/hq/bookings/${id}`);
  revalidatePath("/hq");
}

export async function actionAddBookingNote(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();
  if (!Number.isInteger(id) || !body) return;
  await addBookingEvent(id, "note", body.slice(0, 4000));
  revalidatePath(`/hq/bookings/${id}`);
}

export async function actionSetBookingQuote(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const quote = Number(formData.get("quote_dollars"));
  const deposit = Number(formData.get("deposit_dollars"));
  if (!Number.isInteger(id)) return;
  const existing = await getBooking(id);
  if (!existing) return;
  const patch: Parameters<typeof updateBooking>[1] = {};
  if (Number.isFinite(quote) && quote >= 0) patch.quote_cents = Math.round(quote * 100);
  if (Number.isFinite(deposit) && deposit >= 0) patch.deposit_cents = Math.round(deposit * 100);
  if (existing.status === "inquiry" && patch.quote_cents) patch.status = "quoted";
  await updateBooking(id, patch);
  await addBookingEvent(id, "quote", `Quote set: $${quote.toFixed(0)}${Number.isFinite(deposit) && deposit > 0 ? ` · deposit $${deposit.toFixed(0)}` : ""}`);
  revalidatePath(`/hq/bookings/${id}`);
  revalidatePath("/hq/bookings");
}

export async function actionUpdateBookingDetails(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  const date = String(formData.get("event_date") ?? "");
  const hours = Number(formData.get("hours"));
  const configs = await listConfigurations();
  const configuration = String(formData.get("configuration") ?? "");
  await updateBooking(id, {
    event_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    start_time: String(formData.get("start_time") ?? "").slice(0, 40),
    hours: Number.isFinite(hours) && hours > 0 ? String(hours) : null,
    event_kind: String(formData.get("event_kind") ?? "other").slice(0, 20),
    venue_name: String(formData.get("venue_name") ?? "").slice(0, 200),
    city: String(formData.get("city") ?? "").slice(0, 120),
    configuration: configs.some((c) => c.key === configuration) ? configuration : null,
  });
  revalidatePath(`/hq/bookings/${id}`);
  revalidatePath("/hq/bookings");
}

export async function actionCreateBooking(formData: FormData) {
  await requireOperator();
  const name = String(formData.get("contact_name") ?? "").trim();
  const email = String(formData.get("contact_email") ?? "").trim();
  if (!name || !email) return;
  const date = String(formData.get("event_date") ?? "");
  const configs = await listConfigurations();
  const configuration = String(formData.get("configuration") ?? "");
  const b = await createBooking({
    contact_name: name.slice(0, 200),
    contact_email: email.slice(0, 200),
    contact_phone: String(formData.get("contact_phone") ?? "").slice(0, 50),
    event_kind: String(formData.get("event_kind") ?? "venue").slice(0, 20),
    event_date: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    venue_name: String(formData.get("venue_name") ?? "").slice(0, 200),
    city: String(formData.get("city") ?? "").slice(0, 120),
    configuration: configs.some((c) => c.key === configuration) ? configuration : null,
    details: String(formData.get("details") ?? "").slice(0, 4000),
    source: String(formData.get("source") ?? "hq").slice(0, 40) || "hq",
  });
  revalidatePath("/hq/bookings");
  redirect(`/hq/bookings/${b.id}`);
}

export async function actionPromoteToShow(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const booking = await getBooking(id);
  if (!booking || !booking.event_date) return;
  await upsertShow({
    date: booking.event_date,
    venue_name: booking.venue_name || `Private event`,
    city: booking.city,
    start_time: booking.start_time,
    configuration: booking.configuration,
    kind: booking.event_kind === "festival" ? "festival" : booking.event_kind === "venue" ? "club" : "private",
    status: booking.status === "confirmed" || booking.status === "deposit_paid" ? "confirmed" : "tentative",
    is_public: formData.get("is_public") === "on",
    booking_id: booking.id,
  });
  await addBookingEvent(id, "note", "Added to the calendar.");
  revalidatePath(`/hq/bookings/${id}`);
  revalidatePath("/hq/shows");
  revalidatePublic();
}

export async function actionSendQuoteEmail(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const booking = await getBooking(id);
  if (!booking || !booking.quote_cents) return;
  const configs = await listConfigurations();
  const lineup = configs.find((c) => c.key === booking.configuration)?.label ?? "the band";
  const text = [
    `Hi ${booking.contact_name},`,
    ``,
    `Thanks for reaching out. Here's where we land for ${lineup}${booking.event_date ? ` on ${booking.event_date}` : ""}${booking.venue_name ? ` at ${booking.venue_name}` : ""}:`,
    ``,
    `Rate: $${(booking.quote_cents / 100).toFixed(0)}`,
    booking.deposit_cents ? `Deposit to hold the date: $${(booking.deposit_cents / 100).toFixed(0)}` : null,
    ``,
    `Say the word and we'll hold it.`,
    ``,
    `— ${SITE.bandName}`,
    SITE.domain,
  ]
    .filter((l) => l !== null)
    .join("\n");
  const result = await sendMail({
    to: booking.contact_email,
    subject: `${SITE.bandName} — ${booking.event_date ?? "your date"}`,
    text,
  });
  await addBookingEvent(id, "email", result.sent ? `Quote emailed to ${booking.contact_email}.` : `Quote email NOT sent (${result.error}).`);
  if (result.sent && booking.status === "inquiry") await updateBooking(id, { status: "quoted" });
  revalidatePath(`/hq/bookings/${id}`);
}

export async function actionSetRate(formData: FormData) {
  await requireOperator();
  const key = String(formData.get("key") ?? "");
  const dollars = Number(formData.get("dollars"));
  if (!key || !Number.isFinite(dollars) || dollars < 0) return;
  await setConfigurationRate(key, Math.round(dollars * 100));
  revalidatePath("/hq/settings");
  revalidatePublic();
}

// ── shows ───────────────────────────────────────────────────────────

export async function actionUpsertShow(formData: FormData) {
  await requireOperator();
  const date = String(formData.get("date") ?? "");
  const venue = String(formData.get("venue_name") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !venue) return;
  const configs = await listConfigurations();
  const configuration = String(formData.get("configuration") ?? "");
  await upsertShow({
    date,
    venue_name: venue.slice(0, 200),
    city: String(formData.get("city") ?? "").slice(0, 120),
    start_time: String(formData.get("start_time") ?? "").slice(0, 40),
    venue_url: String(formData.get("venue_url") ?? "").slice(0, 400) || null,
    ticket_url: String(formData.get("ticket_url") ?? "").slice(0, 400) || null,
    configuration: configs.some((c) => c.key === configuration) ? configuration : null,
    kind: String(formData.get("kind") ?? "club").slice(0, 20),
    is_public: formData.get("is_public") === "on",
  });
  revalidatePath("/hq/shows");
  revalidatePublic();
}

export async function actionSetShowStatus(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!Number.isInteger(id) || !["confirmed", "tentative", "cancelled"].includes(status)) return;
  await setShowStatus(id, status);
  revalidatePath("/hq/shows");
  revalidatePublic();
}

export async function actionToggleShowPublic(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await toggleShowPublic(id);
  revalidatePath("/hq/shows");
  revalidatePublic();
}

export async function actionDeleteShow(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await deleteShow(id);
  revalidatePath("/hq/shows");
  revalidatePublic();
}

export async function actionUpsertResidency(formData: FormData) {
  await requireOperator();
  const venue = String(formData.get("venue_name") ?? "").trim();
  const weekdays = String(formData.get("weekdays") ?? "")
    .split(",")
    .map((w) => w.trim().toLowerCase().slice(0, 3))
    .filter((w) => ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].includes(w));
  if (!venue || weekdays.length === 0) return;
  await upsertResidency({
    venue_name: venue.slice(0, 200),
    city: String(formData.get("city") ?? "").slice(0, 120),
    venue_url: String(formData.get("venue_url") ?? "").slice(0, 400) || null,
    weekdays,
    start_time: String(formData.get("start_time") ?? "").slice(0, 40),
    label: String(formData.get("label") ?? "").slice(0, 80),
  });
  revalidatePath("/hq/shows");
  revalidatePublic();
}

export async function actionToggleResidency(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await toggleResidency(id);
  revalidatePath("/hq/shows");
  revalidatePublic();
}

// ── music / band / press ────────────────────────────────────────────

export async function actionUpdateReleaseStory(formData: FormData) {
  await requireOperator();
  const slug = String(formData.get("slug") ?? "");
  const story = String(formData.get("story") ?? "").slice(0, 8000);
  if (!slug) return;
  await updateReleaseStory(slug, story);
  revalidatePath("/hq/music");
  revalidatePublic();
}

export async function actionUpsertBandMember(formData: FormData) {
  await requireOperator();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const sort = Number(formData.get("sort"));
  await upsertBandMember({
    name: name.slice(0, 120),
    instrument: String(formData.get("instrument") ?? "").slice(0, 120),
    hometown: String(formData.get("hometown") ?? "").slice(0, 120),
    bio: String(formData.get("bio") ?? "").slice(0, 8000),
    is_active: formData.get("is_active") === "on",
    sort: Number.isFinite(sort) && sort > 0 ? sort : 100,
  });
  revalidatePath("/hq/music");
  revalidatePublic();
}

export async function actionUpsertPress(formData: FormData) {
  await requireOperator();
  const outlet = String(formData.get("outlet") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  if (!outlet || !title) return;
  const date = String(formData.get("published_on") ?? "");
  await upsertPress({
    outlet: outlet.slice(0, 120),
    title: title.slice(0, 300),
    url: String(formData.get("url") ?? "").slice(0, 400) || null,
    published_on: /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
    kind: String(formData.get("kind") ?? "web").slice(0, 20),
    pull_quote: String(formData.get("pull_quote") ?? "").slice(0, 600),
  });
  revalidatePath("/hq/music");
  revalidatePublic();
}

// ── photos ──────────────────────────────────────────────────────────

export async function actionUpdateAsset(formData: FormData) {
  await requireOperator();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const sort = Number(formData.get("sort_weight"));
  await updateAsset(id, {
    alt: String(formData.get("alt") ?? "").slice(0, 300),
    credit: String(formData.get("credit") ?? "").slice(0, 120),
    tags: String(formData.get("tags") ?? "")
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 12),
    sort_weight: Number.isFinite(sort) ? sort : 100,
  });
  revalidatePath("/hq/photos");
  revalidatePublic();
}

export async function actionToggleAssetFlag(formData: FormData) {
  await requireOperator();
  const id = String(formData.get("id") ?? "");
  const flag = String(formData.get("flag"));
  if (!id || !["featured", "is_public"].includes(flag)) return;
  await query(
    `UPDATE assets SET ${flag === "featured" ? "featured = NOT featured" : "is_public = NOT is_public"} WHERE id = $1`,
    [id],
  );
  revalidatePath("/hq/photos");
  revalidatePublic();
}

// ── merch / orders / shipping ───────────────────────────────────────

export async function actionUpsertProduct(formData: FormData) {
  await requireOperator();
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  const price = Number(formData.get("price_dollars"));
  if (!title || !slug || !Number.isFinite(price)) return;
  const weight = Number(formData.get("weight_oz"));
  const variants = String(formData.get("variants") ?? "")
    .split(",")
    .map((v, i) => ({ label: v.trim(), sort: i + 1 }))
    .filter((v) => v.label);
  await upsertProduct(
    {
      title: title.slice(0, 200),
      slug: slug.slice(0, 80),
      kind: String(formData.get("kind") ?? "apparel").slice(0, 20),
      description: String(formData.get("description") ?? "").slice(0, 4000),
      price_cents: Math.round(price * 100),
      weight_oz: Number.isFinite(weight) && weight > 0 ? weight : 8,
      status: "draft",
    },
    variants.length > 0 ? variants : [{ label: "One size", sort: 1 }],
  );
  revalidatePath("/hq/products");
}

export async function actionSetProductStatus(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!Number.isInteger(id) || !["draft", "live", "sold_out", "archived"].includes(status)) return;
  await query(`UPDATE products SET status = $2, updated_at = now() WHERE id = $1`, [id, status]);
  revalidatePath("/hq/products");
  revalidatePublic();
}

export async function actionSetVariantInventory(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const inventory = Number(formData.get("inventory"));
  if (!Number.isInteger(id) || !Number.isFinite(inventory) || inventory < 0) return;
  await query(`UPDATE variants SET inventory = $2 WHERE id = $1`, [id, Math.round(inventory)]);
  revalidatePath("/hq/products");
  revalidatePublic();
}

export async function actionSetOrderStatus(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  const status = String(formData.get("status"));
  if (!Number.isInteger(id) || !["paid", "fulfilled", "refunded"].includes(status)) return;
  await setOrderStatus(id, status);
  revalidatePath("/hq/orders");
}

export async function actionGetRates(formData: FormData) {
  await requireOperator();
  if (!shippoEnabled()) return;
  const id = Number(formData.get("id"));
  const order = await getOrder(id);
  if (!order) return;
  const to = stripeShippingToAddress(order.shipping, order.email);
  const { shipmentId, rates } = await createShipment({ to, weightOz: order.weight_oz ?? 8 });
  const payload = {
    orderId: order.id,
    shipmentId,
    list: rates.slice(0, 6).map((r) => ({
      id: r.object_id,
      label: `${r.provider} ${r.servicelevel.name}`,
      amount: r.amount,
      days: r.estimated_days,
    })),
  };
  redirect(`/hq/orders?rates=${Buffer.from(JSON.stringify(payload)).toString("base64url")}`);
}

export async function actionBuyLabel(formData: FormData) {
  await requireOperator();
  if (!shippoEnabled()) return;
  const orderId = Number(formData.get("order_id"));
  const rateId = String(formData.get("rate_id") ?? "");
  const shipmentId = String(formData.get("shipment_id") ?? "");
  const label = String(formData.get("label") ?? "");
  const amount = Number(formData.get("amount"));
  if (!Number.isInteger(orderId) || !rateId) return;
  const shipmentRow = await recordShipment({
    order_id: orderId,
    shippo_shipment_id: shipmentId,
    shippo_rate_id: rateId,
    carrier: label.split(" ")[0] ?? "",
    service: label.split(" ").slice(1).join(" "),
    cost_cents: Number.isFinite(amount) ? Math.round(amount * 100) : 0,
  });
  const tx = await purchaseLabel(rateId);
  await markShipmentPurchased(shipmentRow.id, {
    shippo_transaction_id: tx.object_id,
    status: tx.status === "SUCCESS" ? "purchased" : "error",
    tracking_number: tx.tracking_number,
    tracking_url: tx.tracking_url_provider,
    label_url: tx.label_url,
  });
  revalidatePath("/hq/orders");
  redirect("/hq/orders");
}

// ── agent tokens ────────────────────────────────────────────────────

export async function actionCreateAgentToken(formData: FormData) {
  await requireOperator();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { token: null };
  const { token } = await createAgentToken(name.slice(0, 100));
  revalidatePath("/hq/settings");
  return { token };
}

export async function actionDeleteAgentToken(formData: FormData) {
  await requireOperator();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await deleteAgentToken(id);
  revalidatePath("/hq/settings");
}
