"use client";

import { formatNumber } from "@/lib/format";

/**
 * Running count of how many leads the provider's free allowance can still
 * deliver. Shown on every page so the balance is visible before a search, and
 * it drops as calls are spent.
 */
export default function LeadsRemaining({ budget, compact = false }) {
  if (!budget) return null;

  const { resultsRemaining, limit, used, period, resetsAt } = budget;
  const spentRatio = limit === 0 ? 1 : used / limit;
  const tone = resultsRemaining === 0 ? "danger" : spentRatio >= 0.8 ? "warning" : "success";
  const label = period === "month" ? "this month" : "today";

  const title =
    resultsRemaining === 0
      ? `No search allowance left - resets at ${resetsAt}`
      : `${used} of ${limit} API calls used - resets at ${resetsAt}`;

  if (compact) {
    return (
      <span className={`badge text-bg-${tone}`} title={title}>
        {formatNumber(resultsRemaining)} leads left
      </span>
    );
  }

  return (
    <span
      className={`badge text-bg-${tone}-subtle text-${tone}-emphasis border border-${tone}-subtle`}
      title={title}
    >
      <strong>{formatNumber(resultsRemaining)}</strong> leads left {label}
    </span>
  );
}
