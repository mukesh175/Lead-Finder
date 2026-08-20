import { prisma } from "../prisma";
import { ApiError } from "../api";
import { searchApiBudget } from "../config";

// Google's Custom Search daily quota resets at midnight Pacific Time, so the
// budget is counted against that day rather than the server's local one.
const QUOTA_TIME_ZONE = process.env.SEARCH_QUOTA_TIME_ZONE || "America/Los_Angeles";

export function quotaDate(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: QUOTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** How many API calls a request for `resultCount` results will cost. */
export function callsFor(resultCount) {
  return Math.ceil(resultCount / searchApiBudget.resultsPerCall);
}

export async function getBudget(provider) {
  const date = quotaDate();
  const row = await prisma.apiUsage.findUnique({
    where: { provider_quotaDate: { provider, quotaDate: date } },
    select: { calls: true },
  });
  const used = row?.calls ?? 0;
  const limit = searchApiBudget.callsPerDay;
  return {
    provider,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resultsRemaining: Math.max(0, limit - used) * searchApiBudget.resultsPerCall,
    resetsAt: `midnight ${QUOTA_TIME_ZONE}`,
    quotaDate: date,
  };
}

/**
 * Atomically reserves `calls` against today's budget, or throws. The conditional
 * UPDATE is what makes this safe: two concurrent searches cannot both squeeze
 * past the ceiling, because the database rejects the second one.
 */
export async function reserveCalls(provider, calls = 1) {
  const date = quotaDate();
  const limit = searchApiBudget.callsPerDay;

  await prisma.apiUsage.upsert({
    where: { provider_quotaDate: { provider, quotaDate: date } },
    update: {},
    create: { provider, quotaDate: date, calls: 0 },
  });

  const { count } = await prisma.apiUsage.updateMany({
    where: { provider, quotaDate: date, calls: { lte: limit - calls } },
    data: { calls: { increment: calls } },
  });

  if (count === 0) {
    const budget = await getBudget(provider);
    throw new ApiError(
      "SEARCH_FREE_TIER_REACHED",
      `Daily free-tier limit reached: ${budget.used} of ${budget.limit} search API calls used today. ` +
        `This search needs ${calls} more. The quota resets at ${budget.resetsAt}.`,
      429
    );
  }
}

/** Returns unused reservations after a provider call fails before it was billed. */
export async function releaseCalls(provider, calls = 1) {
  if (calls <= 0) return;
  await prisma.apiUsage
    .updateMany({
      where: { provider, quotaDate: quotaDate(), calls: { gte: calls } },
      data: { calls: { decrement: calls } },
    })
    .catch(() => {});
}
