import { searchProviderName } from "../config";
import { mockProvider } from "./mockProvider";
import { googleProvider } from "./googleProvider";

const providers = {
  mock: mockProvider,
  google: googleProvider,
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
  };
}
