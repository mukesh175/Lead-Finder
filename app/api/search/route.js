import { handler, ok } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { searchSchema, parseOrThrow } from "@/lib/validation/schemas";
import { startSearch, dailyUsage } from "@/lib/leads/pipeline";
import { rateLimit, clientKey } from "@/lib/rateLimit";
import { serializeSearch } from "@/lib/leads/serialize";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  rateLimit(clientKey(request, `search:${user.id}`), { max: 12, windowMs: 60_000 });

  const body = await request.json().catch(() => ({}));
  const input = parseOrThrow(searchSchema, body);

  const record = await startSearch(user, {
    keyword: input.keyword,
    location: input.location || null,
    limit: input.limit,
  });

  return ok({ search: serializeSearch(record), usage: await dailyUsage(user.id) });
});
