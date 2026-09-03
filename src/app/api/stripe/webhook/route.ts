import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe, stripeEnabled, webhookSecret } from "@/lib/stripe";
import { recordOrder } from "@/lib/db/commerce";
import { updateBooking, addBookingEvent, getBooking } from "@/lib/db/bookings";
import { query } from "@/lib/db/client";

/**
 * Stripe webhook — two kinds of Checkout session:
 *   · merch (metadata.variant_id)  → orders row + inventory decrement
 *   · deposit (metadata.kind=deposit, metadata.booking_id) → booking → deposit_paid
 * Signature-verified; idempotent per session id.
 */
export async function POST(request: Request) {
  if (!stripeEnabled()) return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });
  const secret = webhookSecret();
  if (!secret) return NextResponse.json({ error: "webhook-secret-missing" }, { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "missing-signature" }, { status: 400 });

  const payload = await request.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "bad-signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.metadata?.kind === "deposit" && session.metadata.booking_id) {
      const id = Number(session.metadata.booking_id);
      const booking = await getBooking(id);
      if (booking && booking.deposit_session_id !== session.id) {
        await query(`UPDATE bookings SET deposit_session_id = $2, deposit_paid_at = now() WHERE id = $1`, [id, session.id]);
        await updateBooking(id, { status: "deposit_paid" });
        await addBookingEvent(id, "note", `Deposit paid via Stripe: $${((session.amount_total ?? 0) / 100).toFixed(2)}.`);
      }
      return NextResponse.json({ received: true });
    }

    const variantId = session.metadata?.variant_id ? Number(session.metadata.variant_id) : null;
    await recordOrder({
      stripe_session_id: session.id,
      stripe_payment_intent: typeof session.payment_intent === "string" ? session.payment_intent : null,
      email: session.customer_details?.email ?? "",
      name: session.customer_details?.name ?? "",
      shipping: session.collected_information?.shipping_details ?? null,
      amount_cents: session.amount_total ?? 0,
      items: [{ variant_id: Number.isInteger(variantId) ? variantId : null, qty: 1, unit_cents: session.amount_total ?? 0 }],
    });
  }

  return NextResponse.json({ received: true });
}
