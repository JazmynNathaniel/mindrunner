import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { forbidden, tooMany, unauthorized } from "./errors";
import { rateLimit } from "./ratelimit";

export const SESSION_COOKIE = "bos_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Computed once at module load so a login attempt against an unknown username
// still pays a real bcrypt comparison (no user-enumeration timing signal).
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString("hex"), 12);

function hashToken(token: string) {
  // Only a sha256 of the session token is stored — a leaked DB can't be replayed as cookies.
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  };
}

export async function login(username: string, password: string, ip: string) {
  // Two windows: per-IP (spec §13), plus per-username so spoofed
  // X-Forwarded-For rotation can't buy unlimited guesses at one account.
  const ipOk = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  const userOk = rateLimit(`login-user:${username}`, 20, 60 * 60 * 1000);
  if (!ipOk || !userOk) {
    throw tooMany("too many attempts. the brain has locked the door for a bit.");
  }
  const user = await prisma.user.findUnique({ where: { username } });
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) throw unauthorized("access denied.");

  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  await prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } });
  return { token, user };
}

export async function logoutCurrentSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
}

export async function getSessionUser() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return { user: session.user, session };
}

/** Role is ALWAYS re-derived server-side from the session — never from the client. */
export async function requireUser() {
  const auth = await getSessionUser();
  if (!auth) throw unauthorized();
  return auth;
}

export async function requireAdmin() {
  const auth = await requireUser();
  if (auth.user.role !== "ADMIN") throw forbidden();
  return auth;
}
