import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await requireUser();
  const keywords = await prisma.searchKeyword.findMany({
    where: { userId: user.id },
    orderBy: [{ lastRunAt: "desc" }, { createdAt: "desc" }],
  });

  // Lead counts are recomputed here so manually deleted leads stay reflected.
  const grouped = await prisma.lead.groupBy({
    by: ["keyword"],
    where: { userId: user.id },
    _count: { _all: true },
  });
  const counts = new Map(grouped.map((row) => [row.keyword, row._count._all]));

  return ok({
    keywords: keywords.map((k) => ({ ...k, leadCount: counts.get(k.keyword) ?? 0 })),
  });
});

export const POST = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const keyword = String(body.keyword || "").trim().slice(0, 120);
  const location = String(body.location || "").trim().slice(0, 120) || null;
  if (keyword.length < 2) return fail("VALIDATION_ERROR", "Enter a keyword.", 422);

  const saved = await prisma.searchKeyword.upsert({
    where: { userId_keyword: { userId: user.id, keyword } },
    update: { location },
    create: { userId: user.id, keyword, location },
  });
  return ok({ keyword: saved });
});

export const DELETE = handler(async (request) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("VALIDATION_ERROR", "Missing keyword id.", 422);
  const { count } = await prisma.searchKeyword.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return fail("NOT_FOUND", "Keyword not found.", 404);
  return ok({ deleted: true });
});
