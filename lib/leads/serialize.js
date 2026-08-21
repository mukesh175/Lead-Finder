export function serializeSearch(record) {
  return {
    id: record.id,
    keyword: record.keyword,
    location: record.location,
    resultLimit: record.resultLimit,
    mode: record.mode ?? "business",
    sources: record.sources ?? [],
    resultsFound: record.resultsFound,
    processed: record.processed,
    status: record.status,
    error: record.error ?? null,
    stats: record.stats || null,
    createdAt: record.createdAt,
  };
}
