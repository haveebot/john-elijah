/**
 * requireAuth — every HQ/mutating API route calls this to accept either
 * a session cookie (UI) or a Bearer token (agent). Returns the caller
 * context, or a 401 Response the route should return immediately.
 */

import { cookies, headers } from "next/headers";
import { SESSION_COOKIE, verifySessionValue, type Role } from "./session-tokens";
import { verifyAgentToken } from "@/lib/db/agent-tokens";

export type AuthContext =
  | { type: "user"; name: string; role: Role }
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
    const session = await verifySessionValue(cookie);
    if (session) return { type: "user", name: session.name, role: session.role };
  }

  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
