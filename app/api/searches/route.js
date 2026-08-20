import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { serializeSearch } from "@/lib/leads/serialize";
import { dailyUsage } from "@/lib/leads/pipeline";

export const runtime = "nodejs";

export const GET = handler(async (request) => {
  const user = await requireUser();
  const url = new URL(request.url);
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const pageSize = 25;

  const [total, records] = await Promise.all([
    prisma.search.count({ where: { userId: user.id } }),
    prisma.search.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { leads: true } } },
    }),
  ]);

  return ok({
    searches: records.map((record) => ({
      ...serializeSearch(record),
      leadCount: record._count.leads,
    })),
    usage: await dailyUsage(user.id),
    pagination: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  });
});
