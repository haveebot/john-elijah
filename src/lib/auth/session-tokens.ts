/**
 * Session token sign/verify — edge-safe (no next/headers deps) so the
 * middleware can import it. Server-only cookie ops live in session.ts.
 */

import { signToken, verifyToken } from "./hmac";

export const SESSION_COOKIE = "je_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function generateSessionValue(email: string): Promise<string> {
  return signToken(`session:${email.toLowerCase()}`, SESSION_TTL_MS);
}

export async function verifySessionValue(value: string): Promise<string | null> {
  const result = await verifyToken(value);
  if (!result.valid) return null;
  const [kind, ...rest] = result.data.split(":");
  if (kind !== "session") return null;
  return rest.join(":");
}
