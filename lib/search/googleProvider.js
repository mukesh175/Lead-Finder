import { ApiError } from "../api";
import { limits } from "../config";
import { reserveCalls, releaseCalls } from "./quota";

// Overridable so the provider can be pointed at a stub during testing or at a
// compatible proxy; defaults to Google's own endpoint.
const ENDPOINT = process.env.SEARCH_API_ENDPOINT || "https://www.googleapis.com/customsearch/v1";
const PAGE_SIZE = 10; // Programmable Search returns at most 10 results per call.

// Google Programmable Search (Custom Search JSON API). This is the officially
// supported API - result pages are never scraped.
export const googleProvider = {
  name: "google",
  label: "Google Programmable Search",
  consumesQuota: true,

  isConfigured() {
    return Boolean(process.env.SEARCH_API_KEY && process.env.SEARCH_ENGINE_ID);
  },

  async search({ keyword, location, limit }) {
    if (!this.isConfigured()) {
      throw new ApiError(
        "SEARCH_PROVIDER_NOT_CONFIGURED",
        "Google search is selected but SEARCH_API_KEY / SEARCH_ENGINE_ID are not set.",
        503
      );
    }

    const query = [keyword, location].filter(Boolean).join(" ").trim();
    const wanted = Math.min(limit, 100);
    const results = [];
    let truncatedByBudget = false;

    for (let start = 1; results.length < wanted && start <= 91; start += PAGE_SIZE) {
      // Reserved before the request is sent, so the free-tier ceiling cannot be
      // crossed even by concurrent searches.
      try {
        await reserveCalls(this.name, 1);
      } catch (err) {
        // Budget ran out mid-search: keep what was already fetched rather than
        // throwing away paid-for results, and let the caller report the stop.
        if (results.length > 0) {
          truncatedByBudget = true;
          break;
        }
        throw err;
      }

      const url = new URL(ENDPOINT);
      url.searchParams.set("key", process.env.SEARCH_API_KEY);
      url.searchParams.set("cx", process.env.SEARCH_ENGINE_ID);
      url.searchParams.set("q", query);
      url.searchParams.set("num", String(Math.min(PAGE_SIZE, wanted - results.length)));
      url.searchParams.set("start", String(start));

      let response;
      try {
        response = await fetch(url, { signal: AbortSignal.timeout(limits.fetchTimeoutMs) });
      } catch (err) {
        // The request never reached Google, so it was never billed.
        await releaseCalls(this.name, 1);
        throw new ApiError(
          "SEARCH_PROVIDER_UNREACHABLE",
          `Could not reach the search provider: ${err.message}`,
          502
        );
      }

      if (response.status === 429) {
        throw new ApiError(
          "SEARCH_QUOTA_EXCEEDED",
          "The search provider quota has been exceeded. Try again later.",
          429
        );
      }
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new ApiError(
          "SEARCH_PROVIDER_ERROR",
          `Search provider returned ${response.status}. ${body.slice(0, 180)}`,
          502
        );
      }

      const payload = await response.json();
      const items = payload.items || [];
      if (items.length === 0) break;

      for (const item of items) {
        results.push({
          title: item.title || null,
          url: item.link,
          snippet: item.snippet || null,
          displayLink: item.displayLink || null,
        });
      }
      if (items.length < PAGE_SIZE) break;
    }

    const output = results.slice(0, wanted);
    // Carried on the array so the caller can report a budget-shortened search.
    output.truncatedByBudget = truncatedByBudget;
    return output;
  },
};
