import { redirect } from "next/navigation";
import { getCurrentUser, isAuthConfigured } from "@/lib/auth";
import AuthForm from "@/components/AuthForm";
import { safeNextPath } from "@/lib/nextPath";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create account · LeadFinder" };

export default async function RegisterPage({ searchParams }) {
  const params = await searchParams;
  const next = safeNextPath(params?.next);
  if (await getCurrentUser()) redirect(next || "/dashboard");
  return <AuthForm mode="register" next={next} configured={isAuthConfigured()} />;
}
