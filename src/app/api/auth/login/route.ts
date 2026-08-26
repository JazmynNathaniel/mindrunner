import { NextResponse } from "next/server";
import { login, SESSION_COOKIE, sessionCookieOptions } from "@/server/auth";
import { apiHandler } from "@/server/http";
import { clientIp } from "@/server/ratelimit";
import { loginInput } from "@/server/validation";

export const POST = apiHandler(async (req) => {
  const body = loginInput.parse(await req.json());
  const { token, user } = await login(body.username, body.password, clientIp(req));
  const res = NextResponse.json({ ok: true, username: user.username, role: user.role });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
});
