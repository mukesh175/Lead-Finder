import { prisma } from "../prisma";
import { ApiError } from "../api";
import { limits } from "../config";
import { search as runProviderSearch, getSearchProvider } from "../search/searchProvider";
import { getBudget } from "../search/quota";
import { analyzeWebsite } from "../crawler/crawler";
import { pickBestEmail } from "../email/extractor";
import { verifyEmail } from "../email/verifier";
import { scoreLead } from "./scorer";
import { dedupeKey, normalizeWebsite, rootDomain } from "./dedupe";

// Number of search results turned into leads per HTTP request. Keeping batches
// small keeps every invocation far below the serverless execution limit; the
// client drives the job to completion by calling the run endpoint repeatedly.
export const BATCH_SIZE = Number.parseInt(process.env.SEARCH_BATCH_SIZE || "5", 10);

const emptyStats = () => ({
  discovered: 0,
  saved: 0,
  duplicates: 0,
  unreachable: 0,
  errors: 0,
  emailsFound: 0,
});

export async function assertDailyQuota(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.search.count({
    where: { userId, createdAt: { gte: since } },
  });
  if (used >= limits.searchesPerDay) {
    throw new ApiError(
      "SEARCH_LIMIT_REACHED",
      `Daily search limit reached (${limits.searchesPerDay} searches per day).`,
      429
    );
  }
  return { used, limit: limits.searchesPerDay };
}

export async function dailyUsage(userId) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const used = await prisma.search.count({ where: { userId, createdAt: { gte: since } } });
  return { used, limit: limits.searchesPerDay };
}

/**
 * Checks the provider's free-tier budget before any work starts. Refuses
 * outright when nothing is left, and trims an oversized request down to what
 * the remaining budget covers so the ceiling is never crossed.
 */
async function planWithinBudget(requestedLimit) {
  const provider = getSearchProvider();
  if (!provider.consumesQuota) return { resultLimit: requestedLimit, notice: null };

  const budget = await getBudget(provider);
  if (budget.remaining <= 0) {
    throw new ApiError(
      "SEARCH_FREE_TIER_REACHED",
      `Free-tier limit reached: all ${budget.limit} ${provider.name} search API calls have been used. ` +
        `The allowance resets at ${budget.resetsAt}. No search was started and nothing was charged.`,
      429
    );
  }

  // A provider may also cap a single search below the requested size.
  const capped = Math.min(requestedLimit, provider.maxResultsPerSearch ?? requestedLimit);
  const needed = provider.callsFor(capped);
  if (needed <= budget.remaining) {
    return {
      resultLimit: capped,
      notice:
        capped < requestedLimit
          ? `${provider.label} returns at most ${capped} results per search, so this search was ` +
            `limited to ${capped} instead of ${requestedLimit}.`
          : null,
    };
  }

  const allowed = Math.min(capped, budget.resultsRemaining);
  return {
    resultLimit: allowed,
    notice:
      `Requested ${requestedLimit} leads, but only ${budget.remaining} free API call(s) remain ` +
      `(limit ${budget.limit} per ${budget.period}) - this search was trimmed to ${allowed} results ` +
      "to stay inside the free tier.",
  };
}

/** Creates the search job and queues the provider results for processing. */
export async function startSearch(user, { keyword, location, limit }) {
  await assertDailyQuota(user.id);
  const requested = Math.min(limit, limits.maxResultsPerSearch);
  const { resultLimit, notice } = await planWithinBudget(requested);

  const record = await prisma.search.create({
    data: {
      keyword,
      location: location || null,
      resultLimit,
      status: "PROCESSING",
      userId: user.id,
    },
  });

  try {
    const results = await runProviderSearch({ keyword, location, limit: resultLimit });
    if (results.length === 0) {
      await prisma.search.update({
        where: { id: record.id },
        data: {
          status: "COMPLETED",
          resultsFound: 0,
          stats: { ...emptyStats(), notice },
          queue: [],
        },
      });
      return { ...record, status: "COMPLETED", resultsFound: 0 };
    }
    const updated = await prisma.search.update({
      where: { id: record.id },
      data: {
        resultsFound: results.length,
        queue: results,
        stats: {
          ...emptyStats(),
          discovered: results.length,
          notice: results.truncatedByBudget
            ? `The free-tier allowance ran out during this search - ${results.length} of ${resultLimit} ` +
              "requested results were retrieved."
            : notice,
        },
      },
    });
    await upsertKeyword(user.id, keyword, location);
    return updated;
  } catch (err) {
    await prisma.search.update({
      where: { id: record.id },
      data: {
        status: "FAILED",
        error: err instanceof ApiError ? err.message : "The search provider failed.",
      },
    });
    throw err;
  }
}

async function upsertKeyword(userId, keyword, location) {
  await prisma.searchKeyword.upsert({
    where: { userId_keyword: { userId, keyword } },
    update: { lastRunAt: new Date(), location: location || null },
    create: { userId, keyword, location: location || null, lastRunAt: new Date() },
  });
}

/**
 * Processes the next bounded batch of queued results. A single failing website
 * never aborts the job - failures are counted and reported instead.
 */
export async function processBatch(user, searchId) {
  const record = await prisma.search.findFirst({ where: { id: searchId, userId: user.id } });
  if (!record) throw new ApiError("NOT_FOUND", "Search not found.", 404);
  if (record.status === "COMPLETED" || record.status === "FAILED") return record;

  const queue = Array.isArray(record.queue) ? record.queue : [];
  const start = record.processed;
  const batch = queue.slice(start, start + BATCH_SIZE);
  const stats = { ...emptyStats(), ...(record.stats || {}) };

  for (const result of batch) {
    try {
      const outcome = await ingestResult(user.id, record, result);
      if (outcome.duplicate) stats.duplicates += 1;
      else stats.saved += 1;
      if (outcome.unreachable) stats.unreachable += 1;
      if (!outcome.duplicate && outcome.emailFound) stats.emailsFound += 1;
    } catch (err) {
      console.error("[pipeline] result failed", result?.url, err?.message);
      stats.errors += 1;
    }
  }

  const processed = Math.min(start + batch.length, queue.length);
  const done = processed >= queue.length;

  const updated = await prisma.search.update({
    where: { id: record.id },
    data: {
      processed,
      stats,
      status: done ? "COMPLETED" : "PROCESSING",
      queue: done ? [] : record.queue,
    },
  });

  if (done) {
    const leadCount = await prisma.lead.count({
      where: { userId: user.id, keyword: record.keyword },
    });
    await prisma.searchKeyword
      .update({
        where: { userId_keyword: { userId: user.id, keyword: record.keyword } },
        data: { leadCount },
      })
      .catch(() => {});
  }

  return updated;
}

async function ingestResult(userId, record, result) {
  const website = result.url;
  const domain = rootDomain(website);

  const analysis = await analyzeWebsite(website, {
    maxPages: limits.maxPagesPerLead,
    seedPages: result.mockPages || null,
  });

  const pages = analysis.pages || [];
  const emails = [...new Set(pages.flatMap((p) => p.emails))];
  const phones = [...new Set(pages.flatMap((p) => p.phones))];
  const socials = pages.reduce((acc, page) => ({ ...page.socials, ...acc }), {});
  const contactPage = pages.find((p) => p.isContactPage && p.url !== website);
  const address = pages.map((p) => p.address).find(Boolean) || null;

  const email = pickBestEmail(emails, domain);
  const emailStatus = email ? await verifyEmail(email) : "not_checked";

  const companyName =
    pages.map((p) => p.siteName).find(Boolean) ||
    cleanTitle(pages[0]?.title || result.title) ||
    domain ||
    null;

  const draft = {
    name: null,
    companyName,
    website,
    websiteKey: normalizeWebsite(website),
    email: email || null,
    emailStatus,
    phone: phones[0] || null,
    location: address || record.location || null,
    country: record.location || null,
    city: null,
    keyword: record.keyword,
    sourceUrl: result.url,
    sourceType: pages.length > 0 ? "website_analysis" : "search_result",
    description: pages[0]?.description || result.snippet || null,
    contactPageUrl: contactPage?.url || null,
    linkedinUrl: socials.linkedinUrl || null,
    facebookUrl: socials.facebookUrl || null,
    instagramUrl: socials.instagramUrl || null,
    twitterUrl: socials.twitterUrl || null,
  };

  const { score } = scoreLead(draft, { keyword: record.keyword, location: record.location });
  const key = dedupeKey(draft);

  const existing = await prisma.lead.findUnique({
    where: { userId_dedupeKey: { userId, dedupeKey: key } },
    select: { id: true },
  });

  if (existing) {
    await prisma.leadSource.create({
      data: {
        leadId: existing.id,
        url: result.url,
        sourceType: draft.sourceType,
        method: pages.length > 0 ? "public_website_page" : "search_result_metadata",
        keyword: record.keyword,
      },
    });
    return { duplicate: true, unreachable: !analysis.ok, emailFound: Boolean(email) };
  }

  await prisma.lead.create({
    data: {
      ...draft,
      leadScore: score,
      dedupeKey: key,
      userId,
      searchId: record.id,
      sources: {
        create: {
          url: result.url,
          sourceType: draft.sourceType,
          method: pages.length > 0 ? "public_website_page" : "search_result_metadata",
          keyword: record.keyword,
        },
      },
    },
    select: { id: true },
  });

  return { duplicate: false, unreachable: !analysis.ok, emailFound: Boolean(email) };
}

function cleanTitle(title) {
  if (!title) return null;
  return title.split(/[|–—-]/)[0].trim().slice(0, 120) || null;
}
