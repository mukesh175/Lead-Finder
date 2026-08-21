/**
 * Intent search: instead of finding companies that PROVIDE a service, this
 * finds people who have publicly ASKED for it - a Reddit thread, a job post, a
 * freelance brief. Search engines never reveal who typed a query, but people
 * who post their need in public are discoverable, and that is real buying
 * intent with a citable source.
 */

export const SOURCE_GROUPS = {
  freelance: {
    label: "Freelance portals",
    hint: "Upwork, Fiverr, Freelancer, PeoplePerHour, Guru",
    domains: [
      "upwork.com",
      "fiverr.com",
      "freelancer.com",
      "peopleperhour.com",
      "guru.com",
      "truelancer.com",
      "workana.com",
    ],
  },
  jobs: {
    label: "Job boards",
    hint: "Indeed, WeWorkRemotely, RemoteOK, Wellfound",
    domains: [
      "indeed.com",
      "weworkremotely.com",
      "remoteok.com",
      "wellfound.com",
      "angel.co",
      "simplyhired.com",
      "glassdoor.com",
      "naukri.com",
    ],
  },
  communities: {
    label: "Reddit & forums",
    hint: "Reddit, Quora, Hacker News, product community forums",
    domains: [
      "reddit.com",
      "quora.com",
      "news.ycombinator.com",
      "community.shopify.com",
      "wordpress.org",
      "stackexchange.com",
      "discourse.group",
      "indiehackers.com",
    ],
  },
  social: {
    label: "LinkedIn & X posts",
    hint: "Public hiring and looking-for posts",
    domains: ["linkedin.com", "x.com", "twitter.com", "facebook.com", "medium.com"],
  },
};

export const DEFAULT_SOURCES = Object.keys(SOURCE_GROUPS);

// Phrases people actually use when they need something done. Kept generic so
// they work for any keyword - "dentist", "React developer", "SEO agency".
const INTENT_PHRASES = [
  "looking for",
  "need a",
  "hiring",
  "recommendations for",
  "want to hire",
  "anyone know a good",
];

export function resolveSources(sources) {
  const valid = (Array.isArray(sources) ? sources : []).filter((s) => SOURCE_GROUPS[s]);
  return valid.length > 0 ? valid : DEFAULT_SOURCES;
}

export function domainsFor(sources) {
  return resolveSources(sources).flatMap((key) => SOURCE_GROUPS[key].domains);
}

export function groupForUrl(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
  for (const [key, group] of Object.entries(SOURCE_GROUPS)) {
    if (group.domains.some((d) => host === d || host.endsWith(`.${d}`))) return key;
  }
  return null;
}

/** Query text that biases results towards people asking, not companies selling. */
export function intentQuery(keyword, location) {
  const phrases = INTENT_PHRASES.map((p) => `"${p}"`).join(" OR ");
  return [`"${keyword}"`, `(${phrases})`, location].filter(Boolean).join(" ").trim();
}

const EVIDENCE = new RegExp(
  `(${INTENT_PHRASES.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")}|` +
    "looking to hire|need help with|searching for|seeking|wanted|recruiting)",
  "i"
);

/**
 * Pulls the sentence that demonstrates intent. Returns null when the text does
 * not actually show anyone asking - the caller then stores no quote rather than
 * implying an intent the source never expressed.
 */
export function extractIntentQuote(text) {
  if (!text) return null;
  const clean = String(text).replace(/\s+/g, " ").trim();
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const match = sentences.find((sentence) => EVIDENCE.test(sentence));
  if (!match) return EVIDENCE.test(clean) ? clean.slice(0, 300) : null;
  return match.slice(0, 300);
}
