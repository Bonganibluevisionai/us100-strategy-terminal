import { NextResponse } from "next/server";
import { SESSION_COOKIE, sessionTokenFor } from "@/lib/auth";

const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  const accessCode = process.env.DASHBOARD_ACCESS_CODE;
  if (!accessCode) {
    return NextResponse.json(
      { error: "This terminal is not access-restricted" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const submitted = typeof body?.code === "string" ? body.code : "";

  // Comparing hashes keeps the check constant-time with respect to the code.
  const expected = await sessionTokenFor(accessCode);
  const attempt = await sessionTokenFor(submitted);
  if (attempt !== expected) {
    await new Promise((resolve) => setTimeout(resolve, 500)); // blunt brute force
    return NextResponse.json({ error: "Invalid access code" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
