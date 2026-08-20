import { prisma } from "@/lib/prisma";
import { handler, ok, fail } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { leadUpdateSchema, parseOrThrow } from "@/lib/validation/schemas";

export const runtime = "nodejs";

export const GET = handler(async (request, { params }) => {
  const user = await requireUser();
  const { id } = await params;
  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
    include: { sources: { orderBy: { createdAt: "desc" } }, search: true },
  });
  if (!lead) return fail("NOT_FOUND", "Lead not found.", 404);
  return ok({ lead });
});

export const PATCH = handler(async (request, { params }) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const data = parseOrThrow(leadUpdateSchema, body);

  const existing = await prisma.lead.findFirst({ where: { id, userId: user.id }, select: { id: true } });
  if (!existing) return fail("NOT_FOUND", "Lead not found.", 404);

  const patch = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    patch[key] = value === "" ? null : value;
  }

  const lead = await prisma.lead.update({ where: { id }, data: patch });
  return ok({ lead });
});

export const DELETE = handler(async (request, { params }) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await params;
  const { count } = await prisma.lead.deleteMany({ where: { id, userId: user.id } });
  if (count === 0) return fail("NOT_FOUND", "Lead not found.", 404);
  return ok({ deleted: true });
});
