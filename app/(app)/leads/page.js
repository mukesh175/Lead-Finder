import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { phoneBudget } from "@/lib/phone/verifier";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leads · LeadFinder" };

export default async function LeadsPage({ searchParams }) {
  const user = await requireUser();
  const params = await searchParams;

  const grouped = await prisma.lead.groupBy({
    by: ["keyword"],
    where: { userId: user.id },
    _count: { _all: true },
    orderBy: { _count: { keyword: "desc" } },
    take: 100,
  });

  return (
    <LeadsClient
      keywords={grouped.map((row) => row.keyword)}
      phoneBudget={await phoneBudget()}
      initialFilters={{
        q: params?.q || "",
        keyword: params?.keyword || "",
        searchId: params?.searchId || "",
        minScore: params?.minScore || "",
        sourceType: params?.sourceType || "any",
        phoneStatus: params?.phoneStatus || "any",
      }}
    />
  );
}
