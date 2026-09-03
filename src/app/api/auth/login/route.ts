import { NextResponse } from "next/server";
import { verifyUser } from "@/lib/db/users";
import { setSessionCookie } from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const user = await verifyUser(String(body.email ?? ""), String(body.password ?? ""));
  if (!user) {
    return NextResponse.json({ error: "invalid-credentials" }, { status: 401 });
  }
  await setSessionCookie(user.email);
  return NextResponse.json({ ok: true });
}
