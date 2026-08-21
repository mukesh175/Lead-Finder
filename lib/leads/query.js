/** Builds the Prisma where clause shared by the leads list and the CSV export. */
export function buildLeadWhere(userId, filters) {
  const where = { userId };

  if (filters.keyword) where.keyword = filters.keyword;
  if (filters.searchId) where.searchId = filters.searchId;
  if (filters.leadStatus && filters.leadStatus !== "any") where.leadStatus = filters.leadStatus;
  if (filters.emailStatus && filters.emailStatus !== "any") where.emailStatus = filters.emailStatus;
  if (filters.phoneStatus && filters.phoneStatus !== "any") where.phoneStatus = filters.phoneStatus;
  if (filters.sourceType && filters.sourceType !== "any") where.sourceType = filters.sourceType;
  if (filters.hasEmail === "yes") where.email = { not: null };
  if (filters.hasEmail === "no") where.email = null;
  if (typeof filters.minScore === "number") where.leadScore = { gte: filters.minScore };

  if (filters.location) where.location = { contains: filters.location, mode: "insensitive" };
  if (filters.country) where.country = { contains: filters.country, mode: "insensitive" };

  if (filters.q) {
    // Searching by email or phone number is supported directly: digits are
    // matched against the stored number ignoring spaces and punctuation.
    const digits = filters.q.replace(/[^\d]/g, "");
    where.OR = [
      { companyName: { contains: filters.q, mode: "insensitive" } },
      { name: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
      { website: { contains: filters.q, mode: "insensitive" } },
      { phone: { contains: filters.q, mode: "insensitive" } },
      ...(digits.length >= 4 ? [{ phoneDigits: { contains: digits } }] : []),
    ];
  }

  const createdAt = {};
  if (filters.from) {
    const from = new Date(filters.from);
    if (!Number.isNaN(from.valueOf())) createdAt.gte = from;
  }
  if (filters.to) {
    const to = new Date(filters.to);
    if (!Number.isNaN(to.valueOf())) {
      to.setHours(23, 59, 59, 999);
      createdAt.lte = to;
    }
  }
  if (Object.keys(createdAt).length > 0) where.createdAt = createdAt;

  return where;
}

export function buildLeadOrderBy(filters) {
  return [{ [filters.sort]: filters.dir }, { id: "desc" }];
}
