import { NextResponse } from "next/server";
import { addSubscriber } from "@/lib/db/engagement";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad-json" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  if (!email.includes("@") || email.length > 200) {
    return NextResponse.json({ error: "bad-email" }, { status: 400 });
  }

  await addSubscriber(email, String(body.source ?? "site").slice(0, 100));
  return NextResponse.json({ ok: true });
}
