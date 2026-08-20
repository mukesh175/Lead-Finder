import { handler, ok } from "@/lib/api";
import { requireUser, assertSameOrigin } from "@/lib/auth";
import { processBatch } from "@/lib/leads/pipeline";
import { serializeSearch } from "@/lib/leads/serialize";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Processes one bounded batch of the search job. The client calls this until the
 * search reports COMPLETED, so no single serverless invocation runs long. The
 * same entry point can later be driven by a background queue worker.
 */
export const POST = handler(async (request, { params }) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const { id } = await params;
  const record = await processBatch(user, id);
  const total = record.resultsFound || 0;
  return ok({
    search: serializeSearch(record),
    percent: total === 0 ? 100 : Math.round((record.processed / total) * 100),
    done: record.status === "COMPLETED" || record.status === "FAILED",
  });
});
