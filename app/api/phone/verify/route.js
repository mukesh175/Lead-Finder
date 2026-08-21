import { z } from "zod";
import { handler, ok } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { verifyPhone, phoneBudget, phoneVerificationStatus } from "@/lib/phone/verifier";
import { parseOrThrow } from "@/lib/validation/schemas";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  phone: z.string().trim().min(5, "Enter a phone number.").max(40),
});

/** Checks any number the user types, independently of the lead database. */
export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  rateLimit(clientKey(request, `phone-check:${user.id}`), { max: 20, windowMs: 60_000 });

  const body = await request.json().catch(() => ({}));
  const { phone } = parseOrThrow(schema, body);

  const result = await verifyPhone(phone);
  return ok({
    phone,
    result,
    provider: phoneVerificationStatus(),
    budget: await phoneBudget(),
  });
});
