/**
 * Server-only session helpers — wraps the edge-safe token helpers with
 * next/headers cookie operations. Never import from middleware.
 */

import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  generateSessionValue,
  verifySessionValue,
  type Session,
} from "./session-tokens";

export { SESSION_COOKIE, verifySessionValue };
export type { Session };

export async function setSessionCookie(session: Session): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE,
    value: await generateSessionValue(session),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_MS / 1000,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getCurrentOperator(): Promise<Session | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE)?.value;
  if (!value) return null;
  return await verifySessionValue(value);
}
