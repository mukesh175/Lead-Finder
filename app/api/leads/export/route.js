import { prisma } from "@/lib/prisma";
import { handler } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { leadQuerySchema, parseOrThrow, searchParamsToObject } from "@/lib/validation/schemas";
import { buildLeadWhere, buildLeadOrderBy } from "@/lib/leads/query";
import { leadsToCsv } from "@/lib/leads/csv";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_EXPORT_ROWS = 5000;

/**
 * CSV export. Supports "export all", "export current search" (searchId),
 * "export hot leads" (minScore=80) and "export selected" (ids=a,b,c) through
 * the same filter vocabulary as the leads list.
 */
export const GET = handler(async (request) => {
  const user = await requireUser();
  const raw = searchParamsToObject(request);
  const ids = (raw.ids || "").split(",").map((v) => v.trim()).filter(Boolean).slice(0, MAX_EXPORT_ROWS);
  delete raw.ids;

  const filters = parseOrThrow(leadQuerySchema, raw);
  const where = ids.length > 0
    ? { userId: user.id, id: { in: ids } }
    : buildLeadWhere(user.id, filters);

  const leads = await prisma.lead.findMany({
    where,
    orderBy: buildLeadOrderBy(filters),
    take: MAX_EXPORT_ROWS,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response(leadsToCsv(leads), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="leadfinder-leads-${stamp}.csv"`,
      "cache-control": "no-store",
    },
  });
});
