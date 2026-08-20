import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dailyUsage } from "@/lib/leads/pipeline";
import { providerBudget } from "@/lib/search/searchProvider";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) {
    // Next-Url carries the path (plus query) the visitor actually asked for.
    const requested = (await headers()).get("next-url");
    redirect(requested ? `/login?next=${encodeURIComponent(requested)}` : "/login");
  }
  const [usage, budget] = await Promise.all([dailyUsage(user.id), providerBudget()]);

  return (
    <DashboardShell
      user={{ id: user.id, email: user.email, name: user.name }}
      usage={usage}
      budget={budget}
    >
      {children}
    </DashboardShell>
  );
}
