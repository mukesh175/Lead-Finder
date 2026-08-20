import { limits } from "../config";

const SYNTAX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i;

export const STATUSES = ["valid", "invalid", "unknown", "not_checked"];

export function verificationStatus() {
  return {
    configured: Boolean(process.env.EMAIL_VERIFICATION_API_KEY),
    label: process.env.EMAIL_VERIFICATION_API_KEY
      ? "External verification provider"
      : "Not configured - syntax check only",
  };
}

/**
 * verifyEmail(email) -> "valid" | "invalid" | "unknown" | "not_checked"
 *
 * Without a configured provider the app never claims an address is deliverable:
 * a syntactically broken address is reported "invalid" and everything else stays
 * "not_checked".
 */
export async function verifyEmail(email) {
  if (!email) return "not_checked";
  if (!SYNTAX.test(email)) return "invalid";

  const apiKey = process.env.EMAIL_VERIFICATION_API_KEY;
  if (!apiKey) return "not_checked";

  try {
    const url = new URL("https://api.eva.pingutil.com/email");
    url.searchParams.set("email", email);
    const response = await fetch(url, {
      headers: { authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(limits.fetchTimeoutMs),
    });
    if (!response.ok) return "unknown";
    const payload = await response.json();
    const data = payload?.data;
    if (!data || typeof data.deliverable !== "boolean") return "unknown";
    return data.deliverable ? "valid" : "invalid";
  } catch {
    return "unknown";
  }
}
