import { requireUser } from "@/lib/auth";
import { providerStatus } from "@/lib/search/searchProvider";
import { verificationStatus } from "@/lib/email/verifier";
import { limits, scoreWeights } from "@/lib/config";
import { dailyUsage } from "@/lib/leads/pipeline";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings · LeadFinder" };

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <SettingsClient
      user={{
        email: user.email,
        name: user.name || "",
        defaultLimit: user.defaultLimit,
        defaultLocation: user.defaultLocation || "",
      }}
      integrations={{ search: providerStatus(), emailVerification: verificationStatus() }}
      limits={limits}
      scoreWeights={scoreWeights}
      usage={await dailyUsage(user.id)}
    />
  );
}
