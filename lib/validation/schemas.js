import { z } from "zod";
import { limits, pagination } from "../config";
import { ApiError } from "../api";

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8, "Password must be at least 8 characters.").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(200),
});

export const searchSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(2, "Enter a keyword with at least 2 characters.")
    .max(120),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  limit: z.coerce.number().int().min(1).max(limits.maxResultsPerSearch).default(25),
});

export const leadUpdateSchema = z.object({
  leadStatus: z
    .enum([
      "NEW", "CONTACTED", "REPLIED", "QUALIFIED",
      "CONVERTED", "NOT_INTERESTED", "ARCHIVED",
    ])
    .optional(),
  name: z.string().trim().max(120).nullish(),
  companyName: z.string().trim().max(160).nullish(),
  email: z.string().trim().toLowerCase().email().max(254).nullish().or(z.literal("")),
  phone: z.string().trim().max(40).nullish(),
  notes: z.string().trim().max(2000).nullish(),
});

export const settingsSchema = z.object({
  name: z.string().trim().max(80).optional().or(z.literal("")),
  defaultLimit: z.coerce.number().int().min(1).max(limits.maxResultsPerSearch),
  defaultLocation: z.string().trim().max(120).optional().or(z.literal("")),
});

export const leadQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((v) => pagination.allowedPageSizes.includes(v), "Unsupported page size.")
    .default(pagination.defaultPageSize),
  keyword: z.string().trim().max(120).optional(),
  q: z.string().trim().max(120).optional(),
  location: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  minScore: z.coerce.number().int().min(0).max(100).optional(),
  hasEmail: z.enum(["any", "yes", "no"]).default("any"),
  emailStatus: z.enum(["any", "valid", "invalid", "unknown", "not_checked"]).default("any"),
  leadStatus: z
    .enum([
      "any", "NEW", "CONTACTED", "REPLIED", "QUALIFIED",
      "CONVERTED", "NOT_INTERESTED", "ARCHIVED",
    ])
    .default("any"),
  searchId: z.string().trim().max(40).optional(),
  from: z.string().trim().max(40).optional(),
  to: z.string().trim().max(40).optional(),
  sort: z
    .enum(["createdAt", "leadScore", "companyName", "email", "location", "keyword", "leadStatus"])
    .default("createdAt"),
  dir: z.enum(["asc", "desc"]).default("desc"),
});

export function parseOrThrow(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new ApiError("VALIDATION_ERROR", issue?.message || "Invalid request.", 422);
  }
  return result.data;
}

export function searchParamsToObject(request) {
  const entries = {};
  const url = new URL(request.url);
  for (const [key, value] of url.searchParams.entries()) {
    if (value !== "") entries[key] = value;
  }
  return entries;
}
