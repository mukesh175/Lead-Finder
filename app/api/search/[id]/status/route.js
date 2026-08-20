import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { serializeSearch } from "@/lib/leads/serialize";

export const runtime = "nodejs";

export const GET = handler(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const record = await prisma.search.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true, keyword: true, location: true, resultLimit: true, resultsFound: true,
      processed: true, status: true, error: true, stats: true, createdAt: true,
    },
  });
  if (!record) return fail("NOT_FOUND", "Search not found.", 404);

  const total = record.resultsFound || 0;
  const percent = total === 0 ? 100 : Math.round((record.processed / total) * 100);
  return ok({ search: serializeSearch(record), percent });
});
