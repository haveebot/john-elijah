/**
 * Stripe — org-standard archetype, with a first-class NO-KEYS MODE.
 *
 * Jake's Stripe account gets created post-reveal, so every commerce
 * surface must degrade gracefully: `stripeEnabled()` gates buy buttons
 * (they render notify-me states when false), and the checkout route
 * returns a clear 503 rather than throwing.
 */

import Stripe from "stripe";

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  if (!stripeEnabled()) {
    throw new Error("Stripe not configured (STRIPE_SECRET_KEY missing).");
  }
  if (!client) {
    client = new Stripe(process.env.STRIPE_SECRET_KEY as string);
  }
  return client;
}

export function webhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}
