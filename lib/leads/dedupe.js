const STRIPPED_PREFIX = /^www\./;

/** Normalized host+path used to compare websites across search results. */
export function normalizeWebsite(rawUrl) {
  if (!rawUrl) return null;
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase().replace(STRIPPED_PREFIX, "");
    const path = url.pathname.replace(/\/+$/, "");
    return path && path !== "/" ? `${host}${path}` : host;
  } catch {
    return null;
  }
}

export function rootDomain(rawUrl) {
  if (!rawUrl) return null;
  try {
    return new URL(rawUrl).hostname.toLowerCase().replace(STRIPPED_PREFIX, "");
  } catch {
    return null;
  }
}

/**
 * A lead is identified by its public email when one exists, otherwise by its
 * normalized website, otherwise by its source URL. Keys are scoped per user by
 * the unique index in the schema.
 */
export function dedupeKey({ email, website, sourceUrl }) {
  if (email) return `email:${email.trim().toLowerCase()}`;
  const site = normalizeWebsite(website);
  if (site) return `site:${site}`;
  return `source:${String(sourceUrl || "").trim().toLowerCase()}`;
}
