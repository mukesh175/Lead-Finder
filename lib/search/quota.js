import { prisma } from "../prisma";
import { ApiError } from "../api";
import { budgetFor } from "../config";

// Providers reset their allowance on their own clock. Google's Custom Search
// day rolls over at midnight Pacific; monthly plans roll over on the 1st.
const QUOTA_TIME_ZONE = process.env.SEARCH_QUOTA_TIME_ZONE || "America/Los_Angeles";

export function quotaKey(period, now = new Date()) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: QUOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  return period === "month" ? date.slice(0, 7) : date;
}

export async function getBudget(provider) {
  const { calls: limit, period } = budgetFor(provider);
  const key = quotaKey(period);
  const row = await prisma.apiUsage.findUnique({
    where: { provider_quotaDate: { provider: provider.name, quotaDate: key } },
    select: { calls: true },
  });

  const used = row?.calls ?? 0;
  const remaining = Math.max(0, limit - used);
  return {
    provider: provider.name,
    used,
    limit,
    period,
    remaining,
    // How many leads the remaining allowance can still deliver.
    resultsRemaining: provider.resultsForCalls
      ? provider.resultsForCalls(remaining)
      : remaining * 10,
    resetsAt:
      period === "month"
        ? `the 1st of next month (${QUOTA_TIME_ZONE})`
        : `midnight ${QUOTA_TIME_ZONE}`,
    quotaKey: key,
  };
}

/**
 * Atomically reserves `calls` against the current allowance, or throws. The
 * conditional UPDATE is what makes this safe: two concurrent searches cannot
 * both squeeze past the ceiling, because the database rejects the second one.
 */
export async function reserveCalls(provider, calls = 1) {
  const { calls: limit, period } = budgetFor(provider);
  const key = quotaKey(period);

  await prisma.apiUsage.upsert({
    where: { provider_quotaDate: { provider: provider.name, quotaDate: key } },
    update: {},
    create: { provider: provider.name, quotaDate: key, calls: 0 },
  });

  const { count } = await prisma.apiUsage.updateMany({
    where: { provider: provider.name, quotaDate: key, calls: { lte: limit - calls } },
    data: { calls: { increment: calls } },
  });

  if (count === 0) {
    const budget = await getBudget(provider);
    throw new ApiError(
      "SEARCH_FREE_TIER_REACHED",
      `Free-tier limit reached: ${budget.used} of ${budget.limit} ${provider.name} search API calls used. ` +
        `This search needs ${calls} more. The allowance resets at ${budget.resetsAt}.`,
      429
    );
  }
}

/** Returns unused reservations after a provider call fails before it was billed. */
export async function releaseCalls(provider, calls = 1) {
  if (calls <= 0) return;
  const { period } = budgetFor(provider);
  await prisma.apiUsage
    .updateMany({
      where: { provider: provider.name, quotaDate: quotaKey(period), calls: { gte: calls } },
      data: { calls: { decrement: calls } },
    })
    .catch(() => {});
}
