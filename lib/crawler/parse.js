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

export function normalizePhone(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  const digits = trimmed.replace(/[^\d]/g, "");
  // Reject things that are really dates, prices or ids caught by the pattern.
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^(19|20)\d{6}$/.test(digits)) return null;
  return trimmed.replace(/\s+/g, " ");
}

export function extractPhones(html, $) {
  const phones = new Set();
  $("a[href^='tel:']").each((_, el) => {
    const value = normalizePhone(decodeURIComponent($(el).attr("href").slice(4)));
    if (value) phones.add(value);
  });
  if (phones.size === 0) {
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
export function parsePage(html, pageUrl) {
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
    phones: jsonLd.phone ? [jsonLd.phone, ...extractPhones(html, $)] : extractPhones(html, $),
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
        out.phone = normalizePhone(node.telephone);
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
