/**
 * Deposit links — an HMAC-signed URL per booking so the quote email can carry
 * a one-tap "hold the date" checkout. Stripe absent → no link is offered.
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE } from "./site";

function secret(): string {
  const s = process.env.AUTH_HMAC_SECRET;
  if (!s) throw new Error("AUTH_HMAC_SECRET not set");
  return s;
}

export function depositToken(bookingId: number): string {
  return createHmac("sha256", secret()).update(`deposit:${bookingId}`).digest("hex").slice(0, 32);
}

export function verifyDepositToken(bookingId: number, token: string): boolean {
  const expected = depositToken(bookingId);
  if (expected.length !== token.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}

export function depositUrl(bookingId: number): string {
  return `${SITE.domain}/api/stripe/deposit?booking=${bookingId}&t=${depositToken(bookingId)}`;
}
