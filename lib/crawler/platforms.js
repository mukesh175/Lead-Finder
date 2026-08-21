/**
 * Big platforms whose pages show up in business searches. A Facebook or
 * Instagram page can still be a useful lead, but it is not the company's own
 * website: the page title is the platform's, the body text is full of the
 * platform's own numbers and ids, and any @google.com / @instagram.com address
 * on it belongs to the platform, not the prospect.
 */
export const PLATFORM_DOMAINS = new Set([
  "facebook.com", "instagram.com", "twitter.com", "x.com", "linkedin.com",
  "youtube.com", "youtu.be", "pinterest.com", "tiktok.com", "reddit.com",
  "quora.com", "medium.com", "tumblr.com", "threads.net",
  "google.com", "docs.google.com", "sites.google.com", "groups.google.com",
  "play.google.com", "maps.google.com", "support.google.com", "blogspot.com",
  "apple.com", "apps.apple.com", "amazon.com", "amazon.in",
  "wikipedia.org", "justdial.com", "sulekha.com", "indiamart.com",
  "yelp.com", "tripadvisor.com", "glassdoor.com", "crunchbase.com",
]);

/** Corporate domains whose addresses are never the prospect's own contact. */
const PLATFORM_EMAIL_DOMAINS = new Set([
  "google.com", "youtube.com", "facebook.com", "instagram.com", "linkedin.com",
  "twitter.com", "x.com", "quora.com", "pinterest.com", "apple.com",
  "wordpress.com", "wixpress.com", "squarespace.com", "godaddy.com",
  "shopify.com", "cloudflare.com", "sentry.io", "gravatar.com", "sentry-cdn.com",
]);

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isPlatformUrl(url) {
  const host = hostOf(url);
  if (!host) return false;
  return [...PLATFORM_DOMAINS].some((d) => host === d || host.endsWith(`.${d}`));
}

export function isPlatformEmail(email) {
  const domain = String(email || "").split("@")[1];
  if (!domain) return false;
  return [...PLATFORM_EMAIL_DOMAINS].some((d) => domain === d || domain.endsWith(`.${d}`));
}

// Titles that name the platform or the page, never the business.
const GENERIC_TITLES = new Set([
  "home", "homepage", "home page", "index", "welcome", "untitled",
  "login", "log in", "sign in", "sign up", "register", "search",
  "404", "page not found", "not found", "error", "dashboard", "profile",
  "instagram", "facebook", "youtube", "linkedin", "twitter", "x", "quora",
  "pinterest", "reddit", "medium", "google", "google docs", "gmail",
  "google drive", "google maps", "google groups", "wikipedia", "justdial",
]);

export function isGenericTitle(value) {
  if (!value) return true;
  const clean = value.trim().toLowerCase().replace(/[.!|–—-]+$/, "").trim();
  if (clean.length < 2) return true;
  return GENERIC_TITLES.has(clean);
}
