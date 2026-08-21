import * as cheerio from "cheerio";
import { extractEmails } from "../email/extractor";

const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,17}\d)/g;

const SOCIAL_MATCHERS = [
  ["linkedinUrl", /^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/(company|in|school)\//i],
  ["facebookUrl", /^https?:\/\/([a-z-]+\.)?facebook\.com\/[^/?#]+/i],
  ["instagramUrl", /^https?:\/\/([a-z-]+\.)?instagram\.com\/[^/?#]+/i],
  ["twitterUrl", /^https?:\/\/([a-z-]+\.)?(twitter\.com|x\.com)\/[^/?#]+/i],
];

const CONTACT_PATH = /(contact|about|team|company|get-in-touch|impressum|reach-us|support)/i;

export function phoneDigits(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  return digits.length >= 4 ? digits : null;
}

// Dates such as "18.08.2026" or "29-2026-06" look like phone numbers once the
// separators are stripped, so they are rejected on the raw string first.
const DATE_LIKE = /\b\d{1,4}[./-]\d{1,2}[./-]\d{2,4}\b/;

/**
 * `trusted` marks values that came from an explicit tel: link or structured
 * data, where the page has declared "this is a phone number". Numbers scraped
 * out of body text get stricter treatment, because timestamps, order ids and
 * pin codes all live in body text too.
 */
export function normalizePhone(raw, { trusted = false } = {}) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (DATE_LIKE.test(trimmed)) return null;

  const digits = trimmed.replace(/[^\d]/g, "");
  // E.164 allows 15 digits, but a 14-15 digit run in body text is an order id
  // or a tracking number far more often than a phone number.
  if (digits.length > (trusted ? 15 : 13)) return null;
  if (digits.length < (trusted ? 7 : 10)) return null;

  // Placeholders and sequences: 0123456789, 1111111111, 1234567890.
  if (/^(\d)\1+$/.test(digits)) return null;
  if ("01234567890123456789".includes(digits) || "98765432109876543210".includes(digits)) {
    return null;
  }
  // A bare 8-digit number reading as YYYYMMDD or DDMMYYYY is a date.
  if (!trusted && digits.length === 8) return null;

  return trimmed.replace(/\s+/g, " ");
}

export function extractPhones(html, $, { scanBodyText = true } = {}) {
  const phones = new Set();
  $("a[href^='tel:']").each((_, el) => {
    const value = normalizePhone(decodeURIComponent($(el).attr("href").slice(4)), {
      trusted: true,
    });
    if (value) phones.add(value);
  });
  if (phones.size === 0 && scanBodyText) {
    const text = $("body").text().replace(/\s+/g, " ");
    for (const match of text.matchAll(PHONE_PATTERN)) {
      const value = normalizePhone(match[1]);
      if (value) phones.add(value);
      if (phones.size >= 3) break;
    }
  }
  return [...phones];
}

/** Parses one HTML page into the publicly visible facts we care about. */
export function parsePage(html, pageUrl, { scanBodyText = true } = {}) {
  const $ = cheerio.load(html);
  const emails = new Set();

  $("a[href^='mailto:']").each((_, el) => {
    for (const email of extractEmails($(el).attr("href"))) emails.add(email);
  });
  for (const email of extractEmails($("body").text())) emails.add(email);

  const socials = {};
  const internalLinks = new Set();
  let base;
  try {
    base = new URL(pageUrl);
  } catch {
    base = null;
  }

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("mailto:") || href.startsWith("tel:")) return;
    let absolute;
    try {
      absolute = new URL(href, base || undefined).toString();
    } catch {
      return;
    }
    for (const [key, matcher] of SOCIAL_MATCHERS) {
      if (!socials[key] && matcher.test(absolute)) socials[key] = absolute.split("?")[0];
    }
    if (base) {
      try {
        const candidate = new URL(absolute);
        if (candidate.hostname === base.hostname && CONTACT_PATH.test(candidate.pathname)) {
          candidate.hash = "";
          internalLinks.add(candidate.toString());
        }
      } catch {
        /* ignore malformed link */
      }
    }
  });

  const jsonLd = readOrganization($);

  return {
    title: ($("title").first().text() || "").trim() || null,
    description:
      $('meta[name="description"]').attr("content")?.trim() ||
      $('meta[property="og:description"]').attr("content")?.trim() ||
      null,
    siteName:
      jsonLd.name ||
      $('meta[property="og:site_name"]').attr("content")?.trim() ||
      null,
    address: jsonLd.address || null,
    emails: [...emails],
    phones: jsonLd.phone
      ? [jsonLd.phone, ...extractPhones(html, $, { scanBodyText })]
      : extractPhones(html, $, { scanBodyText }),
    socials,
    contactLinks: [...internalLinks],
    isContactPage: base ? CONTACT_PATH.test(base.pathname) : false,
  };
}

// Reads schema.org Organization/LocalBusiness data when a site publishes it.
function readOrganization($) {
  const out = {};
  $('script[type="application/ld+json"]').each((_, el) => {
    let data;
    try {
      data = JSON.parse($(el).contents().text());
    } catch {
      return;
    }
    const nodes = Array.isArray(data) ? data : [data, ...(data["@graph"] || [])];
    for (const node of nodes) {
      if (!node || typeof node !== "object") continue;
      const type = String(node["@type"] || "");
      if (!/Organization|LocalBusiness|Corporation|Store/i.test(type)) continue;
      if (!out.name && typeof node.name === "string") out.name = node.name.trim();
      if (!out.phone && typeof node.telephone === "string") {
        out.phone = normalizePhone(node.telephone, { trusted: true });
      }
      if (!out.address && node.address && typeof node.address === "object") {
        out.address = [
          node.address.streetAddress,
          node.address.addressLocality,
          node.address.addressRegion,
          node.address.addressCountry,
        ]
          .filter((v) => typeof v === "string" && v.trim())
          .join(", ") || null;
      }
    }
  });
  return out;
}
