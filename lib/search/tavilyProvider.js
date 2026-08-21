import { ApiError } from "../api";
import { limits } from "../config";
import { reserveCalls, releaseCalls } from "./quota";

const ENDPOINT = process.env.TAVILY_API_ENDPOINT || "https://api.tavily.com/search";

// Tavily bills one credit per search regardless of how many results it returns,
// and caps a single search at 20 results with no result offset - so one search
// is always exactly one API call.
const MAX_RESULTS = 20;

export const tavilyProvider = {
  name: "tavily",
  label: "Tavily Search API",
  consumesQuota: true,
  defaultBudget: { calls: 1000, period: "month" },
  maxResultsPerSearch: MAX_RESULTS,

  callsFor() {
    return 1;
  },

  resultsForCalls(calls) {
    return calls > 0 ? MAX_RESULTS : 0;
  },

  isConfigured() {
    return Boolean(process.env.SEARCH_API_KEY);
  },

  async search({ keyword, location, limit, query, includeDomains }) {
    if (!this.isConfigured()) {
      throw new ApiError(
        "SEARCH_PROVIDER_NOT_CONFIGURED",
        "Tavily is selected but SEARCH_API_KEY is not set.",
        503
      );
    }

    const text = query || [keyword, location].filter(Boolean).join(" ").trim();
    const wanted = Math.min(limit, MAX_RESULTS);

    await reserveCalls(this, 1);

    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${process.env.SEARCH_API_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          query: text,
          max_results: wanted,
          search_depth: "basic",
          topic: "general",
          // Tavily filters by domain natively rather than with site: operators.
          ...(includeDomains && includeDomains.length > 0
            ? { include_domains: includeDomains }
            : {}),
        }),
        signal: AbortSignal.timeout(limits.fetchTimeoutMs),
      });
    } catch (err) {
      await releaseCalls(this, 1); // never reached the provider, so never billed
      throw new ApiError(
        "SEARCH_PROVIDER_UNREACHABLE",
        `Could not reach Tavily: ${err.message}`,
        502
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ApiError("SEARCH_PROVIDER_REJECTED", "Tavily rejected the API key.", 502);
    }
    if (response.status === 429) {
      throw new ApiError(
        "SEARCH_QUOTA_EXCEEDED",
        "Tavily reports the account allowance is exhausted. Try again after it resets.",
        429
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new ApiError(
        "SEARCH_PROVIDER_ERROR",
        `Tavily returned ${response.status}. ${body.slice(0, 180)}`,
        502
      );
    }

    const payload = await response.json();
    const items = Array.isArray(payload.results) ? payload.results : [];

    return items
      .filter((item) => item && typeof item.url === "string")
      .map((item) => ({
        title: item.title || null,
        url: item.url,
        snippet: typeof item.content === "string" ? item.content.slice(0, 500) : null,
        displayLink: safeHost(item.url),
      }));
  },
};

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
