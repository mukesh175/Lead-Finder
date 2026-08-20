import { ApiError } from "../api";
import { limits } from "../config";

const ENDPOINT = "https://www.googleapis.com/customsearch/v1";
const PAGE_SIZE = 10; // Programmable Search returns at most 10 results per call.

// Google Programmable Search (Custom Search JSON API). This is the officially
// supported API - result pages are never scraped.
export const googleProvider = {
  name: "google",
  label: "Google Programmable Search",

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

    for (let start = 1; results.length < wanted && start <= 91; start += PAGE_SIZE) {
      const url = new URL(ENDPOINT);
      url.searchParams.set("key", process.env.SEARCH_API_KEY);
      url.searchParams.set("cx", process.env.SEARCH_ENGINE_ID);
      url.searchParams.set("q", query);
      url.searchParams.set("num", String(Math.min(PAGE_SIZE, wanted - results.length)));
      url.searchParams.set("start", String(start));

      const response = await fetch(url, {
        signal: AbortSignal.timeout(limits.fetchTimeoutMs),
      });

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

    return results.slice(0, wanted);
  },
};
