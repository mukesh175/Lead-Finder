import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LeadDetailClient from "./LeadDetailClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lead · LeadFinder" };

export default async function LeadDetailPage({ params }) {
  const user = await requireUser();
  const { id } = await params;

  const lead = await prisma.lead.findFirst({
    where: { id, userId: user.id },
    include: { sources: { orderBy: { createdAt: "desc" } } },
  });
  if (!lead) notFound();

  return <LeadDetailClient lead={JSON.parse(JSON.stringify(lead))} />;
}
