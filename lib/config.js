// Application level limits. All values can be overridden through env vars so a
// deployment can be tuned without a code change.
const num = (value, fallback) => {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const limits = {
  searchesPerDay: num(process.env.MAX_SEARCHES_PER_DAY, 10),
  maxResultsPerSearch: num(process.env.MAX_RESULTS_PER_SEARCH, 100),
  maxPagesPerLead: num(process.env.MAX_PAGES_PER_LEAD, 5),
  fetchTimeoutMs: num(process.env.FETCH_TIMEOUT_MS, 8000),
  maxResponseBytes: num(process.env.MAX_RESPONSE_BYTES, 1_500_000),
  crawlDelayMs: num(process.env.CRAWL_DELAY_MS, 250),
};

/**
 * Hard ceiling on external search API calls, resolved per provider.
 *
 * Each provider ships the free allowance its vendor actually grants; the
 * defaults keep the app inside that allowance so it cannot generate a bill.
 * Override with SEARCH_API_BUDGET / SEARCH_API_BUDGET_PERIOD (or the legacy
 * SEARCH_DAILY_API_BUDGET) only if you have deliberately accepted paid usage.
 */
export function budgetFor(provider) {
  const fallback = provider.defaultBudget || { calls: 100, period: "day" };
  const legacyDaily = Number.parseInt(process.env.SEARCH_DAILY_API_BUDGET ?? "", 10);
  const calls = num(
    process.env.SEARCH_API_BUDGET,
    Number.isFinite(legacyDaily) && legacyDaily > 0 && fallback.period === "day"
      ? legacyDaily
      : fallback.calls
  );
  const period = process.env.SEARCH_API_BUDGET_PERIOD === "month" ||
    (!process.env.SEARCH_API_BUDGET_PERIOD && fallback.period === "month")
    ? "month"
    : "day";
  return { calls, period };
}

export const pagination = {
  defaultPageSize: 25,
  allowedPageSizes: [25, 50, 100],
};

// Lead scoring weights - configurable through env, documented in the README.
export const scoreWeights = {
  website: num(process.env.SCORE_WEBSITE, 15),
  email: num(process.env.SCORE_EMAIL, 25),
  phone: num(process.env.SCORE_PHONE, 10),
  keywordMatch: num(process.env.SCORE_KEYWORD_MATCH, 20),
  locationMatch: num(process.env.SCORE_LOCATION_MATCH, 10),
  contactPage: num(process.env.SCORE_CONTACT_PAGE, 5),
  company: num(process.env.SCORE_COMPANY, 10),
  relevantSource: num(process.env.SCORE_RELEVANT_SOURCE, 5),
  // Someone publicly asking for this service is the strongest buying signal.
  intentSignal: num(process.env.SCORE_INTENT_SIGNAL, 35),
};

export const searchProviderName = (process.env.SEARCH_PROVIDER || "mock").toLowerCase();
