import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dailyUsage } from "@/lib/leads/pipeline";
import DashboardShell from "@/components/DashboardShell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const usage = await dailyUsage(user.id);

  return (
    <DashboardShell user={{ id: user.id, email: user.email, name: user.name }} usage={usage}>
      {children}
    </DashboardShell>
  );
}
