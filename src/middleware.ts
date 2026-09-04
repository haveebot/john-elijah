/**
 * Middleware — gates DANK HQ pages (`/hq/*`) behind a valid session.
 *
 * Deliberately NARROW matcher: public site routes never touch middleware,
 * so they stay fully static/CDN-served (cost-shape gate — zero edge
 * invocations on the showpiece pages). API routes self-enforce via
 * requireAuth() so agents get clean 401 JSON, not login redirects.
 */

import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionValue } from "@/lib/auth/session-tokens";

const PUBLIC_HQ_PATHS = ["/hq/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_HQ_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(SESSION_COOKIE)?.value;
  const session = cookie ? await verifySessionValue(cookie) : null;

  if (!session) {
    return NextResponse.redirect(new URL("/hq/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/hq/:path*"],
};
