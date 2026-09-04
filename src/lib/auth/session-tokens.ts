/**
 * Session token sign/verify — edge-safe (no next/headers deps) so the
 * middleware can import it. Server-only cookie ops live in session.ts.
 *
 * Login is by PER-PERSON ACCESS CODE (the Palm Republic HQ pattern):
 * HQ_CODES = "CODE:Name:role,CODE:Name:role" — matched case-insensitively.
 * The session carries the NAME and ROLE, never the code. Magic-link on
 * admin@/john@ can replace the codes once the mailbox is live.
 */

import { signToken, verifyToken } from "./hmac";

export const SESSION_COOKIE = "je_session";
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export type Role = "owner" | "artist" | "partner";
export type Session = { name: string; role: Role };

export function userForCode(code: string): Session | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  for (const entry of (process.env.HQ_CODES ?? "").split(",")) {
    const [ec, name, role] = entry.split(":").map((s) => s?.trim());
    if (!ec || !name || (role !== "owner" && role !== "artist" && role !== "partner")) continue;
    if (c === ec.toUpperCase()) return { name, role };
  }
  return null;
}

export async function generateSessionValue(s: Session): Promise<string> {
  return signToken(`session:${s.role}:${s.name}`, SESSION_TTL_MS);
}

export async function verifySessionValue(value: string): Promise<Session | null> {
  const result = await verifyToken(value);
  if (!result.valid) return null;
  const [kind, role, ...rest] = result.data.split(":");
  if (kind !== "session") return null;
  if (role !== "owner" && role !== "artist" && role !== "partner") return null;
  const name = rest.join(":");
  if (!/^[A-Za-z][A-Za-z .'-]{0,40}$/.test(name)) return null;
  return { name, role };
}
