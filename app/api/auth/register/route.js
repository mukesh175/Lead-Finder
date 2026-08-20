import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { hashPassword, createSession, assertSameOrigin } from "@/lib/auth";
import { registerSchema, parseOrThrow } from "@/lib/validation/schemas";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  rateLimit(clientKey(request, "register"), { max: 5, windowMs: 60_000 });

  const body = await request.json().catch(() => ({}));
  const { name, email, password } = parseOrThrow(registerSchema, body);

  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return fail("EMAIL_TAKEN", "An account with that email already exists.", 409);

  const user = await prisma.user.create({
    data: { email, name: name || null, passwordHash: await hashPassword(password) },
    select: { id: true, email: true, name: true },
  });

  await createSession(user.id);
  return ok({ user });
});
