import { limits } from "../config";
import { fetchPublicHtml, parsePublicUrl } from "./safeFetch";
import { parsePage } from "./parse";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Politely inspects a single website: the entry page plus a small number of
 * publicly linked contact/about pages on the same domain.
 *
 * Guarantees: same-domain only, bounded page count, per-request timeout, a
 * delay between requests and duplicate-URL protection.
 */
export async function analyzeWebsite(entryUrl, { maxPages = limits.maxPagesPerLead, seedPages = null } = {}) {
  const entry = parsePublicUrl(entryUrl);
  if (!entry) return { ok: false, reason: "invalid_url", pages: [] };

  const visited = new Set();
  const queue = [entry.toString()];
  const pages = [];
  let firstFetchFailed = false;

  while (queue.length > 0 && pages.length < maxPages) {
    const next = queue.shift();
    const normalized = next.replace(/#.*$/, "");
    if (visited.has(normalized)) continue;
    visited.add(normalized);

    let fetched;
    if (seedPages && seedPages[normalized]) {
      // Used by the mock provider so the pipeline runs fully offline.
      fetched = { url: normalized, html: seedPages[normalized] };
    } else if (seedPages) {
      continue; // In mock mode nothing outside the supplied pages is fetched.
    } else {
      if (pages.length > 0) await sleep(limits.crawlDelayMs);
      fetched = await fetchPublicHtml(normalized);
    }

    if (!fetched) {
      if (pages.length === 0) firstFetchFailed = true;
      continue;
    }

    let parsed;
    try {
      parsed = parsePage(fetched.html, fetched.url);
    } catch {
      continue;
    }
    pages.push({ url: fetched.url, ...parsed });

    for (const link of parsed.contactLinks) {
      const candidate = parsePublicUrl(link);
      if (!candidate) continue;
      if (candidate.hostname !== entry.hostname) continue; // same-domain only
      if (visited.has(candidate.toString())) continue;
      queue.push(candidate.toString());
    }
  }

  if (pages.length === 0) {
    return { ok: false, reason: firstFetchFailed ? "unreachable" : "no_content", pages: [] };
  }
  return { ok: true, pages };
}
