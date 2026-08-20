const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi;

const PLACEHOLDER_DOMAINS = new Set([
  "example.org", "example.net", "domain.com", "yourdomain.com", "email.com",
  "test.com", "sentry.io", "wixpress.com", "godaddy.com",
]);

const PLACEHOLDER_LOCALS = new Set([
  "noreply", "no-reply", "donotreply", "do-not-reply", "test", "example",
  "user", "username", "youremail", "your-email", "name", "email",
]);

const ASSET_EXTENSIONS = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?)$/i;

// Role based business addresses (info@, sales@, hello@ ...) are legitimate B2B
// contacts and are deliberately kept.
export function isUsableEmail(email) {
  if (!email || email.length > 254) return false;
  const [local, domain] = email.split("@");
  if (!local || !domain) return false;
  if (ASSET_EXTENSIONS.test(email)) return false;
  if (PLACEHOLDER_LOCALS.has(local)) return false;
  if (PLACEHOLDER_DOMAINS.has(domain)) return false;
  if (email === "example@example.com" || email === "test@test.com") return false;
  if (/^[0-9a-f]{16,}$/i.test(local)) return false; // tracking hashes
  return true;
}

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase().replace(/^mailto:/, "").split("?")[0];
}

/** Extracts every publicly visible email from a chunk of text/HTML. */
export function extractEmails(text) {
  if (!text) return [];
  const found = new Set();
  for (const match of String(text).matchAll(EMAIL_PATTERN)) {
    const email = normalizeEmail(match[0]).replace(/[.,;:)]+$/, "");
    if (isUsableEmail(email)) found.add(email);
  }
  return [...found];
}

/**
 * Prefers an address on the lead's own domain, then a business role address,
 * before falling back to whatever was found first. Never invents an address.
 */
export function pickBestEmail(emails, domain) {
  if (!emails || emails.length === 0) return null;
  const rolePriority = ["contact", "hello", "info", "sales", "enquiries", "inquiries", "support", "office"];
  const onDomain = domain
    ? emails.filter((e) => e.endsWith(`@${domain}`) || e.endsWith(`.${domain}`))
    : [];
  const pool = onDomain.length > 0 ? onDomain : emails;
  for (const role of rolePriority) {
    const match = pool.find((e) => e.split("@")[0] === role);
    if (match) return match;
  }
  return pool[0];
}
