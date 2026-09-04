import { NextResponse } from "next/server";
import { userForCode } from "@/lib/auth/session-tokens";
import { setSessionCookie } from "@/lib/auth/session";

/**
 * HQ login by per-person access code (HQ_CODES). Short memorable codes,
 * so a failed attempt eats 800ms to blunt brute force.
 */
export async function POST(request: Request) {
  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }
  const code = typeof body.code === "string" ? body.code : "";
  if (!code || code.length > 64) return NextResponse.json({ error: "bad-code" }, { status: 400 });

  const user = userForCode(code);
  if (!user) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ error: "bad-code" }, { status: 401 });
  }
  await setSessionCookie(user);
  return NextResponse.json({ ok: true, name: user.name, role: user.role });
}
