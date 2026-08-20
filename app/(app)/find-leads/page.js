import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dailyUsage } from "@/lib/leads/pipeline";
import { providerStatus } from "@/lib/search/searchProvider";
import FindLeadsClient from "./FindLeadsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Find Leads · LeadFinder" };

export default async function FindLeadsPage() {
  const user = await requireUser();
  const [usage, keywords] = await Promise.all([
    dailyUsage(user.id),
    prisma.searchKeyword.findMany({
      where: { userId: user.id },
      orderBy: [{ lastRunAt: "desc" }, { createdAt: "desc" }],
      take: 12,
    }),
  ]);

  return (
    <FindLeadsClient
      usage={usage}
      provider={providerStatus()}
      savedKeywords={keywords.map((k) => ({ id: k.id, keyword: k.keyword, location: k.location }))}
      defaults={{ limit: user.defaultLimit, location: user.defaultLocation || "" }}
    />
  );
}
