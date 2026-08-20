import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { providerStatus } from "@/lib/search/searchProvider";
import FindLeadsClient from "./FindLeadsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find Leads · LeadFinder" };

export default async function FindLeadsPage({ searchParams }) {
  const user = await requireUser();
  const params = await searchParams;
  const requestedLimit = Number.parseInt(params?.limit ?? "", 10);
  const keywords = await prisma.searchKeyword.findMany({
    where: { userId: user.id },
    orderBy: [{ lastRunAt: "desc" }, { createdAt: "desc" }],
    take: 12,
  });

  return (
    <FindLeadsClient
      provider={providerStatus()}
      savedKeywords={keywords.map((k) => ({ id: k.id, keyword: k.keyword, location: k.location }))}
      defaults={{
        keyword: typeof params?.keyword === "string" ? params.keyword.slice(0, 120) : "",
        location:
          typeof params?.location === "string"
            ? params.location.slice(0, 120)
            : user.defaultLocation || "",
        limit: [10, 25, 50, 100].includes(requestedLimit) ? requestedLimit : user.defaultLimit,
      }}
    />
  );
}
