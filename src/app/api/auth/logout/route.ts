import { NextResponse } from "next/server";
import { logoutCurrentSession, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { apiHandler } from "@/server/http";

export const POST = apiHandler(async () => {
  await logoutCurrentSession();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
  return res;
});
