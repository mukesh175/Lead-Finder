"use client";

import { formatNumber } from "@/lib/format";

/** Remaining phone verification lookups on the provider's free allowance. */
export default function PhoneCredits({ budget, className = "" }) {
  if (!budget) {
    return (
      <span className={`badge text-bg-light border ${className}`} title="No provider configured">
        Verification not configured
      </span>
    );
  }

  const { remaining, limit, used, period, resetsAt } = budget;
  const tone = remaining === 0 ? "danger" : used / limit >= 0.8 ? "warning" : "success";

  return (
    <span
      className={`badge text-bg-${tone}-subtle text-${tone}-emphasis border border-${tone}-subtle ${className}`}
      title={`${used} of ${limit} lookups used - resets at ${resetsAt}`}
    >
      <strong>{formatNumber(remaining)}</strong> verify credits left this {period}
    </span>
  );
}
