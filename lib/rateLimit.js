import { ApiError } from "./api";

// Lightweight in-memory limiter. It is per serverless instance, which is enough
// to blunt bursts on the free tier; durable quotas live in the database
// (see the daily search limit in lib/leads/pipeline.js).
const buckets = new Map();

export function rateLimit(key, { max = 30, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now > entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  entry.count += 1;
  if (entry.count > max) {
    throw new ApiError("RATE_LIMITED", "Too many requests. Please slow down.", 429);
  }
}

export function clientKey(request, suffix = "") {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  const ip = forwarded.split(",")[0].trim() || "local";
  return `${ip}:${suffix}`;
}
