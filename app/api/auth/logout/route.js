import { handler, ok } from "@/lib/api";
import { destroySession, assertSameOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  await destroySession();
  return ok({ signedOut: true });
});
