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

// Hard ceiling on external search API calls per provider quota day. Google's
// Custom Search free tier is 100 calls/day and one call returns 10 results, so
// the default keeps the app inside the free tier with no possibility of a bill.
// Raise it deliberately (and only if you have accepted paid usage).
export const searchApiBudget = {
  callsPerDay: num(process.env.SEARCH_DAILY_API_BUDGET, 100),
  resultsPerCall: 10,
};

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
};

export const searchProviderName = (process.env.SEARCH_PROVIDER || "mock").toLowerCase();
