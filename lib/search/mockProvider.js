// Deterministic, offline provider so the full pipeline (extraction, scoring,
// dedupe, persistence, UI) can be developed without spending API credits.
// Enabled with SEARCH_PROVIDER=mock.

const SUFFIXES = [
  "Studio", "Labs", "Agency", "Collective", "Partners", "Works", "Group",
  "Consulting", "Digital", "Solutions", "Co", "House",
];
const CITIES = [
  ["Austin", "USA"], ["London", "United Kingdom"], ["Berlin", "Germany"],
  ["Toronto", "Canada"], ["Dubai", "United Arab Emirates"], ["Sydney", "Australia"],
  ["Bengaluru", "India"], ["New York", "USA"], ["Amsterdam", "Netherlands"],
  ["Singapore", "Singapore"],
];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function titleCase(value) {
  return value.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Small deterministic hash so repeated runs of the same keyword are stable.
function hash(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function buildHtml({ company, email, phone, city, country, keyword, isContact }) {
  const parts = [
    `<html><head><title>${company} | ${titleCase(keyword)}</title>`,
    `<meta name="description" content="${company} is a team specialising in ${keyword}.">`,
    "</head><body>",
    `<h1>${company}</h1>`,
    `<p>We provide ${keyword} services from ${city}, ${country}.</p>`,
    email ? `<a href="mailto:${email}">${email}</a>` : "",
    phone ? `<a href="tel:${phone}">${phone}</a>` : "",
    `<p>${city}, ${country}</p>`,
    isContact ? `<p>Head office: 100 Market Street, ${city}, ${country}</p>` : `<a href="/contact">Contact us</a>`,
    `<a href="https://www.linkedin.com/company/${slug(company)}">LinkedIn</a>`,
    "</body></html>",
  ];
  return parts.join("");
}

export const mockProvider = {
  name: "mock",
  label: "Mock provider (development data)",
  consumesQuota: false,

  isConfigured() {
    return true;
  },

  async search({ keyword, location, limit, includeDomains }) {
    const seed = hash(`${keyword}|${location || ""}`);
    const count = Math.min(limit, 100);
    const results = [];

    for (let i = 0; i < count; i += 1) {
      const n = seed + i * 7919;
      const company = `${titleCase(keyword.split(/\s+/).slice(0, 2).join(" "))} ${
        SUFFIXES[n % SUFFIXES.length]
      }`;
      // In intent mode the mock mirrors the requested sources so the intent
      // pipeline can be exercised offline too.
      const intentHost = includeDomains?.[n % (includeDomains?.length || 1)];
      const domain = intentHost
        ? intentHost
        : `${slug(company)}-${(n % 97) + 1}.example.com`;
      const [city, country] = location
        ? [location, location]
        : CITIES[n % CITIES.length];

      // Not every real prospect exposes contact details; the mock data mirrors
      // that so scoring and "email not found" states are exercised.
      const email = n % 4 === 0 ? null : `hello@${domain}`;
      const phone = n % 3 === 0 ? null : `+1 (555) ${String(100 + (n % 900))}-${String(1000 + (n % 9000))}`;

      results.push({
        title: `${company} - ${titleCase(keyword)}`,
        url: intentHost
          ? `https://${intentHost}/post/${slug(keyword)}-${n % 9973}`
          : `https://${domain}/`,
        displayLink: domain,
        snippet: intentHost
          ? `Looking for a ${keyword} to help with our store in ${city}. Budget is flexible, please reply or email ${email || "us"}.`
          : `${company} is a ${keyword} team based in ${city}, ${country}. Get in touch to discuss your project.`,
        // Offline page bodies so the analyzer runs without any network access.
        mockPages: {
          [`https://${domain}/`]: buildHtml({ company, email, phone, city, country, keyword, isContact: false }),
          [`https://${domain}/contact`]: buildHtml({ company, email, phone, city, country, keyword, isContact: true }),
        },
      });
    }

    return results;
  },
};
