import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionTokenFor } from "@/lib/auth";

/**
 * Optional access gate. When DASHBOARD_ACCESS_CODE is unset the terminal is
 * public. When set, every page and API route requires the session cookie
 * issued by /api/login; browsers are redirected to the login screen and API
 * callers get a 401.
 */
export async function middleware(request: NextRequest) {
  const accessCode = process.env.DASHBOARD_ACCESS_CODE;
  if (!accessCode) return NextResponse.next();

  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (session === (await sessionTokenFor(accessCode))) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Unauthorized — sign in at /login" },
      { status: 401 },
    );
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!login|api/login|api/logout|_next/static|_next/image|icon.svg).*)"],
};
