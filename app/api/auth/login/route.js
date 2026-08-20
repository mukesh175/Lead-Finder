import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { verifyPassword, createSession, assertSameOrigin } from "@/lib/auth";
import { loginSchema, parseOrThrow } from "@/lib/validation/schemas";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  rateLimit(clientKey(request, "login"), { max: 10, windowMs: 60_000 });

  const body = await request.json().catch(() => ({}));
  const { email, password } = parseOrThrow(loginSchema, body);

  const user = await prisma.user.findUnique({ where: { email } });
  // Same response for unknown accounts and wrong passwords.
  const valid = user ? await verifyPassword(password, user.passwordHash) : false;
  if (!user || !valid) {
    return fail("INVALID_CREDENTIALS", "Incorrect email or password.", 401);
  }

  await createSession(user.id);
  return ok({ user: { id: user.id, email: user.email, name: user.name } });
});
