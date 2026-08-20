import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { dailyUsage } from "@/lib/leads/pipeline";

export const runtime = "nodejs";

export const GET = handler(async () => {
  const user = await requireUser();
  const where = { userId: user.id };

  const [totalLeads, hotLeads, emailsFound, verifiedEmails, newLeads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, leadScore: { gte: 80 } } }),
    prisma.lead.count({ where: { ...where, email: { not: null } } }),
    prisma.lead.count({ where: { ...where, emailStatus: "valid" } }),
    prisma.lead.count({ where: { ...where, leadStatus: "NEW" } }),
  ]);

  return ok({
    stats: { totalLeads, hotLeads, emailsFound, verifiedEmails, newLeads },
    usage: await dailyUsage(user.id),
  });
});
