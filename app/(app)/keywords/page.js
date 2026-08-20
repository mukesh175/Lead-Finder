import { requireUser } from "@/lib/auth";
import KeywordsClient from "./KeywordsClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Keywords · LeadFinder" };

export default async function KeywordsPage() {
  await requireUser();
  return <KeywordsClient />;
}
