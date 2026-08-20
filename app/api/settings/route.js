import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { settingsSchema, parseOrThrow } from "@/lib/validation/schemas";
import { providerStatus } from "@/lib/search/searchProvider";
import { verificationStatus } from "@/lib/email/verifier";
import { limits, scoreWeights } from "@/lib/config";
import { dailyUsage } from "@/lib/leads/pipeline";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await requireUser();
  return ok({
    user,
    // Only connection status is exposed - secrets never leave the server.
    integrations: { search: providerStatus(), emailVerification: verificationStatus() },
    limits,
    scoreWeights,
    usage: await dailyUsage(user.id),
  });
});

export const PATCH = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const data = parseOrThrow(settingsSchema, body);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name || null,
      defaultLimit: data.defaultLimit,
      defaultLocation: data.defaultLocation || null,
    },
    select: { id: true, email: true, name: true, defaultLimit: true, defaultLocation: true },
  });
  return ok({ user: updated });
});
