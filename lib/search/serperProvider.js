import { ApiError } from "../api";
import { limits } from "../config";
import { reserveCalls, releaseCalls } from "./quota";

const ENDPOINT = process.env.SERPER_API_ENDPOINT || "https://google.serper.dev/search";

// Serper charges 1 credit for a request returning up to 10 results and 2 for
// 11-100, so pages of 10 keep the accounting exact: 1 page = 1 credit.
const PAGE_SIZE = 10;
const MAX_PAGES = 10;

export const serperProvider = {
  name: "serper",
  label: "Serper (Google results)",
  consumesQuota: true,
  defaultBudget: { calls: 2500, period: "month" },
  maxResultsPerSearch: PAGE_SIZE * MAX_PAGES,

  callsFor(resultCount) {
    return Math.ceil(resultCount / PAGE_SIZE);
  },

  resultsForCalls(calls) {
    return calls * PAGE_SIZE;
  },

  isConfigured() {
    return Boolean(process.env.SEARCH_API_KEY);
  },

  async search({ keyword, location, limit }) {
    if (!this.isConfigured()) {
      throw new ApiError(
        "SEARCH_PROVIDER_NOT_CONFIGURED",
        "Serper is selected but SEARCH_API_KEY is not set.",
        503
      );
    }

    const query = [keyword, location].filter(Boolean).join(" ").trim();
    const wanted = Math.min(limit, this.maxResultsPerSearch);
    const results = [];
    let truncatedByBudget = false;

    for (let page = 1; results.length < wanted && page <= MAX_PAGES; page += 1) {
      try {
        await reserveCalls(this, 1);
      } catch (err) {
        // Keep results already paid for rather than discarding them.
        if (results.length > 0) {
          truncatedByBudget = true;
          break;
        }
        throw err;
      }

      let response;
      try {
        response = await fetch(ENDPOINT, {
          method: "POST",
          headers: {
            "x-api-key": process.env.SEARCH_API_KEY,
            "content-type": "application/json",
          },
          body: JSON.stringify({ q: query, num: PAGE_SIZE, page }),
          signal: AbortSignal.timeout(limits.fetchTimeoutMs),
        });
      } catch (err) {
        await releaseCalls(this, 1);
        throw new ApiError(
          "SEARCH_PROVIDER_UNREACHABLE",
          `Could not reach Serper: ${err.message}`,
          502
        );
      }

      if (response.status === 401 || response.status === 403) {
        throw new ApiError(
          "SEARCH_PROVIDER_REJECTED",
          "Serper rejected the API key, or the account is out of credits.",
          502
        );
      }
      if (response.status === 429) {
        throw new ApiError(
          "SEARCH_QUOTA_EXCEEDED",
          "Serper reports the account allowance is exhausted.",
          429
        );
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new ApiError(
          "SEARCH_PROVIDER_ERROR",
          `Serper returned ${response.status}. ${body.slice(0, 180)}`,
          502
        );
      }

      const payload = await response.json();
      const organic = Array.isArray(payload.organic) ? payload.organic : [];
      if (organic.length === 0) break;

      for (const item of organic) {
        if (!item || typeof item.link !== "string") continue;
        results.push({
          title: item.title || null,
          url: item.link,
          snippet: item.snippet || null,
          displayLink: safeHost(item.link),
        });
      }

      if (organic.length < PAGE_SIZE) break; // no further pages available
    }

    const output = results.slice(0, wanted);
    output.truncatedByBudget = truncatedByBudget;
    return output;
  },
};

function safeHost(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
