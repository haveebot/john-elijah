/**
 * requireAuth — every HQ/mutating API route calls this to accept either
 * a session cookie (UI) or a Bearer token (agent). Returns the caller
 * context, or a 401 Response the route should return immediately.
 */

import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySessionValue } from "./session-tokens";
import { verifyAgentToken } from "@/lib/db/agent-tokens";

export type AuthContext =
  | { type: "user"; email: string }
  | { type: "agent"; tokenId: number; tokenName: string };

export async function requireAuth(): Promise<AuthContext | Response> {
  const headersList = await headers();
  const authHeader = headersList.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const agent = await verifyAgentToken(token);
      if (agent) {
        return { type: "agent", tokenId: agent.id, tokenName: agent.name };
      }
      return new Response(JSON.stringify({ error: "invalid-token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(SESSION_COOKIE)?.value;
  if (cookie) {
    const email = await verifySessionValue(cookie);
    if (email) return { type: "user", email };
  }

  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
