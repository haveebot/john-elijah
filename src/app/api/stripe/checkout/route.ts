import { NextResponse } from "next/server";
import { getVariant } from "@/lib/db/commerce";
import { getStripe, stripeEnabled } from "@/lib/stripe";

/**
 * Creates a Stripe Checkout session for one variant. No-keys mode returns
 * a clear 503 the buy panel treats as "not purchasable" (it shouldn't be
 * reachable anyway — purchasable is computed server-side at render).
 */
export async function POST(request: Request) {
  if (!stripeEnabled()) {
    return NextResponse.json({ error: "stripe-not-configured" }, { status: 503 });
  }

  let body: { variant_id?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const variantId = Number(body.variant_id);
  if (!Number.isInteger(variantId)) {
    return NextResponse.json({ error: "bad-variant" }, { status: 400 });
  }

  const variant = await getVariant(variantId);
  if (!variant || variant.product.status !== "live") {
    return NextResponse.json({ error: "not-available" }, { status: 404 });
  }
  if (variant.inventory < 1) {
    return NextResponse.json({ error: "sold-out" }, { status: 409 });
  }

  const origin = request.headers.get("origin") ?? "https://johnelijahmusic.com";
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: variant.product.price_cents,
          product_data: {
            name: `${variant.product.title} — ${variant.label}`,
            metadata: { variant_id: String(variant.id) },
          },
        },
      },
    ],
    metadata: {
      variant_id: String(variant.id),
      product_slug: variant.product.slug,
    },
    shipping_address_collection: { allowed_countries: ["US"] },
    success_url: `${origin}/shop/${variant.product.slug}?checkout=success`,
    cancel_url: `${origin}/shop/${variant.product.slug}?checkout=cancelled`,
  });

  return NextResponse.json({ url: session.url });
}
