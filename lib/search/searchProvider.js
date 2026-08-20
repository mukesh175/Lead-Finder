import { searchProviderName } from "../config";
import { mockProvider } from "./mockProvider";
import { googleProvider } from "./googleProvider";
import { tavilyProvider } from "./tavilyProvider";
import { serperProvider } from "./serperProvider";
import { getBudget } from "./quota";

const providers = {
  mock: mockProvider,
  google: googleProvider,
  tavily: tavilyProvider,
  serper: serperProvider,
};

export function getSearchProvider() {
  return providers[searchProviderName] || mockProvider;
}

/**
 * Provider-agnostic entry point.
 * search({ keyword, location, limit }) -> [{ title, url, snippet, displayLink }]
 */
export function search(params) {
  return getSearchProvider().search(params);
}

export function providerStatus() {
  const provider = getSearchProvider();
  return {
    name: provider.name,
    configured: provider.isConfigured(),
    label: provider.label,
    consumesQuota: Boolean(provider.consumesQuota),
    maxResultsPerSearch: provider.maxResultsPerSearch ?? null,
  };
}

/** Free-tier budget for the active provider, or null if it costs nothing. */
export async function providerBudget() {
  const provider = getSearchProvider();
  if (!provider.consumesQuota) return null;
  return getBudget(provider);
}
