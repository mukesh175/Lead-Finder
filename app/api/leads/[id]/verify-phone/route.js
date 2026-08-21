import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { verifyPhone, phoneVerificationStatus } from "@/lib/phone/verifier";
import { rateLimit, clientKey } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * On-demand phone check. Deliberately not run during a search: the free
 * allowances are small, and most leads never need verifying.
 */
export const POST = handler(async (request, { params }) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await params;
  rateLimit(clientKey(request, `phone:${user.id}`), { max: 30, windowMs: 60_000 });

  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
    select: { id: true, phone: true },
  });
  if (!lead) return fail("NOT_FOUND", "Lead not found.", 404);
  if (!lead.phone) return fail("NO_PHONE", "This lead has no phone number to check.", 422);

  const provider = phoneVerificationStatus();
  const result = await verifyPhone(lead.phone);

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: {
      phoneStatus: result.status,
      phoneLineType: result.lineType,
      phoneCarrier: result.carrier,
    },
    select: { id: true, phoneStatus: true, phoneLineType: true, phoneCarrier: true },
  });

  return ok({ lead: updated, provider: { name: provider.name, configured: provider.configured } });
});
