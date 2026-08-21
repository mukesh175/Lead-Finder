import { requireUser } from "@/lib/auth";
import { phoneVerificationStatus, phoneBudget } from "@/lib/phone/verifier";
import VerifyClient from "./VerifyClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Verify Phone · LeadFinder" };

export default async function VerifyPage() {
  await requireUser();
  return <VerifyClient provider={phoneVerificationStatus()} budget={await phoneBudget()} />;
}
