import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { serializeSearch } from "@/lib/leads/serialize";

export const runtime = "nodejs";

export const GET = handler(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const record = await prisma.search.findFirst({ where: { id, userId: user.id } });
  if (!record) return fail("NOT_FOUND", "Search not found.", 404);
  return ok({ search: serializeSearch(record) });
});

export const DELETE = handler(async (request, { params }) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await params;
  const { count } = await prisma.search.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return fail("NOT_FOUND", "Search not found.", 404);
  return ok({ deleted: true });
});
