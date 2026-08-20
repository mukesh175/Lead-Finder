import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "./prisma";
import { ApiError } from "./api";

const COOKIE_NAME = "lf_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const MIN_SECRET_LENGTH = 16;

export function isAuthConfigured() {
  const secret = process.env.NEXTAUTH_SECRET;
  return typeof secret === "string" && secret.length >= MIN_SECRET_LENGTH;
}

/**
 * Call before any write that a session must follow, so a misconfigured
 * deployment fails cleanly instead of leaving a half-registered account behind.
 */
export function assertAuthConfigured() {
  if (!isAuthConfigured()) {
    throw new ApiError(
      "SERVER_MISCONFIGURED",
      `Authentication is not configured: set NEXTAUTH_SECRET (at least ${MIN_SECRET_LENGTH} characters) in your environment and restart the server.`,
      503
    );
  }
}

function secretKey() {
  assertAuthConfigured();
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
}

export function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secretKey());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getCurrentUser() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (!payload.sub) return null;
    return await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        name: true,
        defaultLimit: true,
        defaultLocation: true,
        createdAt: true,
      },
    });
  } catch {
    return null;
  }
}

// Server-side guard for API routes. Frontend redirects are never the only
// protection - every protected route calls this.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError("UNAUTHORIZED", "You must be signed in.", 401);
  return user;
}

// Cookies are SameSite=Lax, which already blocks cross-site POSTs from forms in
// other origins; this adds an explicit origin check for defence in depth.
export function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = request.headers.get("host");
  try {
    if (new URL(origin).host !== host) {
      throw new ApiError("CSRF_BLOCKED", "Cross-origin request rejected.", 403);
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError("CSRF_BLOCKED", "Invalid origin header.", 403);
  }
}
