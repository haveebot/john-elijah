import { NextResponse } from "next/server";
import { createUser, userCount } from "@/lib/db/users";
import { setSessionCookie } from "@/lib/auth/session";

/**
 * Operator signup, gated by SIGNUP_KEY. This is how Winston (pre-reveal)
 * and Jake (post-reveal) get their accounts — nobody else.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string; display_name?: string; signup_key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const requiredKey = process.env.SIGNUP_KEY;
  if (!requiredKey || body.signup_key !== requiredKey) {
    return NextResponse.json({ error: "bad-signup-key" }, { status: 403 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  if (!email.includes("@") || password.length < 10) {
    return NextResponse.json(
      { error: "invalid-input", message: "Valid email + password of 10+ chars required." },
      { status: 400 },
    );
  }

  const existing = await userCount();
  if (existing >= 5) {
    return NextResponse.json({ error: "operator-limit" }, { status: 403 });
  }

  const user = await createUser(email, password, String(body.display_name ?? "").slice(0, 100));
  await setSessionCookie(user.email);
  return NextResponse.json({ ok: true });
}
