import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionTokenFor } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ ok: true });

  // Only a request carrying the valid session may clear it — anything else
  // is a no-op, so third-party pages can't force-logout visitors.
  const accessCode = process.env.DASHBOARD_ACCESS_CODE;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (accessCode && session === (await sessionTokenFor(accessCode))) {
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
    });
  }
  return response;
}
