import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { leadQuerySchema, parseOrThrow, searchParamsToObject } from "@/lib/validation/schemas";
import { buildLeadWhere, buildLeadOrderBy } from "@/lib/leads/query";
import { verifyPhone, phoneBudget } from "@/lib/phone/verifier";

export const runtime = "nodejs";

export const GET = handler(async (request) => {
  const user = await requireUser();
  const filters = parseOrThrow(leadQuerySchema, searchParamsToObject(request));
  const where = buildLeadWhere(user.id, filters);

  const [total, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      orderBy: buildLeadOrderBy(filters),
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
  ]);

  return ok({
    leads,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.pageSize)),
    },
  });
});

/** Bulk actions on the current user's own leads only. */
export const PATCH = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((v) => typeof v === "string").slice(0, 500) : [];
  const statuses = [
    "NEW", "CONTACTED", "REPLIED", "QUALIFIED",
    "CONVERTED", "NOT_INTERESTED", "ARCHIVED",
  ];

  if (ids.length === 0) return ok({ updated: 0, deleted: 0 });

  if (body.action === "delete") {
    const { count } = await prisma.lead.deleteMany({ where: { id: { in: ids }, userId: user.id } });
    return ok({ deleted: count, updated: 0 });
  }

  if (body.action === "verify_phone") {
    const leads = await prisma.lead.findMany({
      where: { id: { in: ids }, userId: user.id, phone: { not: null } },
      select: { id: true, phone: true },
      take: 25, // bounded: each lookup costs one API call
    });

    let checked = 0;
    for (const lead of leads) {
      try {
        const result = await verifyPhone(lead.phone);
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            phoneStatus: result.status,
            phoneLineType: result.lineType,
            phoneCarrier: result.carrier,
          },
        });
        checked += 1;
      } catch {
        break; // allowance exhausted or provider down - stop, keep what is done
      }
    }
    return ok({ updated: checked, deleted: 0, checked, budget: await phoneBudget() });
  }

  if (body.action === "status" && statuses.includes(body.leadStatus)) {
    const { count } = await prisma.lead.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { leadStatus: body.leadStatus },
    });
    return ok({ updated: count, deleted: 0 });
  }

  return ok({ updated: 0, deleted: 0 });
});
