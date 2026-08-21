import { limits } from "../config";
import { reserveCalls, releaseCalls, getBudget } from "../search/quota";

/**
 * Phone verification.
 *
 * Honest scope: these APIs confirm a number is correctly formatted, allocated
 * to a real carrier and what line type it is. They do NOT prove a person will
 * answer. "valid" here means the line exists, not that the lead is reachable.
 */

/**
 * Providers rename and re-nest fields between product versions - Abstract's
 * Phone Intelligence returns phone_validation / phone_carrier / phone_location
 * where the older product returned flat fields. Rather than hard-coding one
 * shape, this walks the response and takes the first value whose key matches,
 * so a renamed wrapper does not break the reader.
 */
function deepFind(node, keyPattern, accept, depth = 0) {
  if (!node || typeof node !== "object" || depth > 5) return null;

  for (const [key, value] of Object.entries(node)) {
    if (keyPattern.test(key)) {
      const taken = accept(value);
      if (taken !== null && taken !== undefined) return taken;
    }
  }
  for (const value of Object.values(node)) {
    const found = deepFind(value, keyPattern, accept, depth + 1);
    if (found !== null && found !== undefined) return found;
  }
  return null;
}

const asBoolean = (v) => (typeof v === "boolean" ? v : null);
const asText = (v) => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  return null;
};
// A field may be the value itself or an object carrying it under `name`.
const asNamed = (v) => {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (v && typeof v === "object") return asText(v.name) || asText(v.carrier) || asText(v.country);
  return null;
};

function readAbstract(payload) {
  const valid = deepFind(payload, /^(is_valid|valid|is_valid_number|valid_number)$/i, asBoolean);
  if (typeof valid !== "boolean") return { status: "unknown" };

  return {
    status: valid ? "valid" : "invalid",
    lineType: deepFind(payload, /^(line_type|linetype|type)$/i, asText),
    carrier: deepFind(payload, /(^|_)carrier(_name)?$/i, asNamed),
    country: deepFind(payload, /(^|_)country(_name)?$/i, asNamed),
    location:
      deepFind(payload, /^(city|region|state|location)$/i, asNamed) ||
      deepFind(payload, /(^|_)location$/i, asNamed),
    formatted:
      deepFind(payload, /^(international|international_format|e164)$/i, asText) ||
      deepFind(payload, /(^|_)format$/i, (v) =>
        v && typeof v === "object" ? asText(v.international) || asText(v.e164) : asText(v)
      ),
  };
}

// Abstract's current product. Each Abstract product issues its own key, and the
// key from the Phone Intelligence dashboard only works against this host.
const abstract = {
  name: "abstract_phone",
  label: "Abstract Phone Intelligence",
  consumesQuota: true,
  defaultBudget: { calls: 250, period: "month" },
  resultsForCalls: (calls) => calls,
  callsFor: () => 1,

  isConfigured: () => Boolean(process.env.PHONE_VERIFICATION_API_KEY),

  buildUrl(phone) {
    const url = new URL(
      process.env.ABSTRACT_PHONE_ENDPOINT || "https://phoneintelligence.abstractapi.com/v1/"
    );
    url.searchParams.set("api_key", process.env.PHONE_VERIFICATION_API_KEY);
    url.searchParams.set("phone", phone);
    return url;
  },

  read: readAbstract,
};

// Abstract's older Phone Validation product, for accounts still holding one of
// those keys.
const abstractValidation = {
  ...abstract,
  name: "abstract_validation",
  label: "Abstract Phone Validation (legacy)",

  buildUrl(phone) {
    const url = new URL(
      process.env.ABSTRACT_PHONE_ENDPOINT || "https://phonevalidation.abstractapi.com/v1/"
    );
    url.searchParams.set("api_key", process.env.PHONE_VERIFICATION_API_KEY);
    url.searchParams.set("phone", phone);
    return url;
  },
};

const numverify = {
  name: "numverify",
  label: "Numverify phone validation",
  consumesQuota: true,
  defaultBudget: { calls: 100, period: "month" },
  resultsForCalls: (calls) => calls,
  callsFor: () => 1,

  isConfigured: () => Boolean(process.env.PHONE_VERIFICATION_API_KEY),

  buildUrl(phone) {
    const url = new URL(
      process.env.NUMVERIFY_ENDPOINT || "https://apilayer.net/api/validate"
    );
    url.searchParams.set("access_key", process.env.PHONE_VERIFICATION_API_KEY);
    url.searchParams.set("number", phone);
    return url;
  },

  read(payload) {
    if (typeof payload?.valid !== "boolean") return { status: "unknown" };
    return {
      status: payload.valid ? "valid" : "invalid",
      lineType: payload.line_type || null,
      carrier: payload.carrier || null,
      country: payload.country_name || null,
      location: payload.location || null,
      formatted: payload.international_format || null,
    };
  },
};

const providers = { abstract, abstract_validation: abstractValidation, numverify };

export function getPhoneProvider() {
  return providers[(process.env.PHONE_VERIFICATION_PROVIDER || "abstract").toLowerCase()] || abstract;
}

/** Remaining lookups on the phone provider's free allowance, or null. */
export async function phoneBudget() {
  const provider = getPhoneProvider();
  if (!provider.isConfigured()) return null;
  return getBudget(provider);
}

export function phoneVerificationStatus() {
  const provider = getPhoneProvider();
  return {
    name: provider.name,
    label: provider.label,
    configured: provider.isConfigured(),
  };
}

const E164ish = /^\+?[0-9][0-9\s().-]{6,20}$/;

export function normalizeForLookup(phone) {
  if (!phone) return null;
  const trimmed = String(phone).trim();
  if (!E164ish.test(trimmed)) return null;
  const digits = trimmed.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+${digits}`;
}

/**
 * verifyPhone(phone) -> { status, lineType, carrier }
 * status: "valid" | "invalid" | "unknown" | "not_checked"
 *
 * Without a configured provider nothing is claimed: an unparseable number is
 * "invalid", everything else stays "not_checked".
 */
const EMPTY_RESULT = {
  status: "not_checked",
  lineType: null,
  carrier: null,
  country: null,
  location: null,
  formatted: null,
  reason: null,
};

/**
 * Turns a provider failure into something the user can act on. Abstract issues
 * a separate key per product, so a key from another product is the most common
 * cause of a rejected request.
 */
function describeFailure(status, body) {
  const snippet = String(body || "").replace(/\s+/g, " ").slice(0, 200);
  if (status === 401 || status === 403) {
    return `Provider rejected the API key (HTTP ${status}). Check the key belongs to the phone validation product. ${snippet}`;
  }
  if (status === 422) {
    return `Provider could not process this number (HTTP 422). ${snippet}`;
  }
  if (status === 429) {
    return "Provider allowance exhausted (HTTP 429).";
  }
  return `Provider returned HTTP ${status}. ${snippet}`;
}

export async function verifyPhone(phone) {
  const normalized = normalizeForLookup(phone);
  if (!phone) return { ...EMPTY_RESULT };
  if (!normalized) return { ...EMPTY_RESULT, status: "invalid" };

  const provider = getPhoneProvider();
  if (!provider.isConfigured()) return { ...EMPTY_RESULT };

  // Counted against the provider's free allowance exactly like search calls.
  await reserveCalls(provider, 1);

  let response;
  try {
    response = await fetch(provider.buildUrl(normalized), {
      signal: AbortSignal.timeout(limits.fetchTimeoutMs),
    });
  } catch (err) {
    // Never reached the provider, so it was never billed.
    await releaseCalls(provider, 1);
    return { ...EMPTY_RESULT, status: "unknown", reason: `Could not reach the provider: ${err.message}` };
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    const reason = describeFailure(response.status, body);
    console.error(`[phone:${provider.name}] ${reason}`);
    // A rejected request is not a completed lookup, so the credit is returned.
    if ([400, 401, 403, 422].includes(response.status)) await releaseCalls(provider, 1);
    return { ...EMPTY_RESULT, status: "unknown", reason };
  }

  const payload = await response.json().catch(() => null);

  // Some providers answer 200 with an error body instead of a status code.
  const embedded = payload?.error || payload?.success === false;
  if (embedded) {
    const message =
      payload?.error?.message ||
      payload?.error?.info ||
      payload?.error?.type ||
      "Provider returned an error.";
    console.error(`[phone:${provider.name}] ${message}`);
    await releaseCalls(provider, 1);
    return { ...EMPTY_RESULT, status: "unknown", reason: message };
  }

  const result = provider.read(payload || {});
  if (result.status === "unknown") {
    const keys = Object.keys(payload || {}).join(", ") || "empty response";
    // Log the body so an unrecognised shape can be mapped without guesswork.
    console.error(
      `[phone:${provider.name}] unexpected response shape: ${keys}\n` +
        JSON.stringify(payload).slice(0, 800)
    );
    return {
      ...EMPTY_RESULT,
      status: "unknown",
      reason: `Unexpected response from the provider (fields: ${keys}).`,
    };
  }
  return { ...EMPTY_RESULT, ...result };
}
