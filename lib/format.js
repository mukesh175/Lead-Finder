/**
 * Deterministic formatters.
 *
 * `toLocaleDateString()` and friends use the runtime's own locale and time
 * zone, which differ between the server (UTC) and the browser (the user's
 * zone). That makes the server HTML and the first client render disagree,
 * which React reports as a hydration mismatch. These formatters pin both, so
 * both sides always produce the same string.
 */
const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

const NUMBER = new Intl.NumberFormat("en-US");

export function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : DATE.format(date);
}

export function formatDateTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "" : `${DATE_TIME.format(date)} UTC`;
}

export function formatNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? NUMBER.format(num) : "0";
}
