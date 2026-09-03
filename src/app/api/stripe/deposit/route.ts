import { NextResponse } from "next/server";
import { getBooking } from "@/lib/db/bookings";
import { verifyDepositToken } from "@/lib/deposit";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { SITE } from "@/lib/site";

/**
 * GET /api/stripe/deposit?booking=ID&t=TOKEN → redirects to a Stripe Checkout
 * session for the booking's deposit. The webhook flips the booking to
 * deposit_paid. No-keys mode: a friendly page instead of a dead link.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("booking"));
  const token = url.searchParams.get("t") ?? "";
  if (!Number.isInteger(id) || !verifyDepositToken(id, token)) {
    return NextResponse.redirect(`${SITE.domain}/book?deposit=invalid`);
  }
  const booking = await getBooking(id);
  if (!booking || !booking.deposit_cents || booking.deposit_cents < 100) {
    return NextResponse.redirect(`${SITE.domain}/book?deposit=invalid`);
  }
  if (booking.status === "deposit_paid" || booking.status === "played") {
    return NextResponse.redirect(`${SITE.domain}/book?deposit=already`);
  }
  if (!stripeEnabled()) {
    return NextResponse.redirect(`${SITE.domain}/book?deposit=offline`);
  }

  const stripe = getStripe();
  const when = [booking.event_date, booking.venue_name, booking.city].filter(Boolean).join(" · ");
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: booking.contact_email,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: booking.deposit_cents,
          product_data: {
            name: `${SITE.bandName} — deposit to hold the date`,
            description: when || undefined,
          },
        },
      },
    ],
    metadata: { booking_id: String(booking.id), kind: "deposit" },
    success_url: `${SITE.domain}/book?deposit=paid`,
    cancel_url: `${SITE.domain}/book?deposit=cancelled`,
  });
  return NextResponse.redirect(session.url as string, { status: 303 });
}
