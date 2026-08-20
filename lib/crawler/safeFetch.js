import dns from "node:dns/promises";
import net from "node:net";
import { limits } from "../config";

const BLOCKED_HOSTNAMES = new Set([
  "localhost", "localhost.localdomain", "ip6-localhost", "ip6-loopback",
  "metadata", "metadata.google.internal", "instance-data",
]);

function ipv4IsPrivate(ip) {
  const [a, b] = ip.split(".").map(Number);
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier grade NAT
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function ipv6IsPrivate(ip) {
  const value = ip.toLowerCase();
  if (value === "::" || value === "::1") return true;
  if (value.startsWith("fc") || value.startsWith("fd")) return true; // unique local
  if (value.startsWith("fe80")) return true; // link local
  if (value.startsWith("::ffff:")) return ipv4IsPrivate(value.slice(7));
  return false;
}

export function isPublicAddress(ip) {
  const version = net.isIP(ip);
  if (version === 4) return !ipv4IsPrivate(ip);
  if (version === 6) return !ipv6IsPrivate(ip);
  return false;
}

function bareHost(url) {
  return url.hostname.toLowerCase().replace(/\.$/, "").replace(/^\[|\]$/g, "");
}

export function parsePublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  // URL keeps IPv6 literals bracketed; strip them so they can be range-checked.
  const hostname = bareHost(url);
  if (!hostname || BLOCKED_HOSTNAMES.has(hostname)) return null;
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) return null;
  if (net.isIP(hostname) && !isPublicAddress(hostname)) return null;
  url.hash = "";
  return url;
}

// Resolves the hostname and rejects any answer pointing at a private range so a
// discovered URL cannot be used to reach internal services (SSRF).
async function assertResolvesToPublicAddress(hostname) {
  if (net.isIP(hostname)) return isPublicAddress(hostname);
  try {
    const records = await dns.lookup(hostname, { all: true });
    return records.length > 0 && records.every((r) => isPublicAddress(r.address));
  } catch {
    return false;
  }
}

/**
 * Fetches a public web page with SSRF protection, a timeout, a response size
 * cap and redirect validation. Returns { url, html } or null.
 */
export async function fetchPublicHtml(rawUrl) {
  const url = parsePublicUrl(rawUrl);
  if (!url) return null;
  if (!(await assertResolvesToPublicAddress(bareHost(url)))) return null;

  let response;
  try {
    response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(limits.fetchTimeoutMs),
      headers: {
        "user-agent": "LeadFinderBot/1.0 (+public business contact discovery)",
        accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    return null;
  }

  if (!response.ok) return null;

  // The final URL after redirects must still be public.
  const finalUrl = parsePublicUrl(response.url || url.toString());
  if (!finalUrl) return null;
  if (!(await assertResolvesToPublicAddress(bareHost(finalUrl)))) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("html")) return null;

  const declaredLength = Number.parseInt(response.headers.get("content-length") || "", 10);
  if (Number.isFinite(declaredLength) && declaredLength > limits.maxResponseBytes) return null;

  const buffer = await response.arrayBuffer().catch(() => null);
  if (!buffer) return null;
  if (buffer.byteLength > limits.maxResponseBytes) return null;

  return { url: finalUrl.toString(), html: new TextDecoder("utf-8").decode(buffer) };
}
