"use client";

const LABELS = {
  PENDING: "Queued",
  PROCESSING: "Finding leads...",
  COMPLETED: "Search complete",
  FAILED: "Search failed",
};

export default function SearchProgress({ search, percent }) {
  if (!search) return null;
  const stats = search.stats || {};
  const total = search.resultsFound || 0;
  const failed = search.status === "FAILED";

  return (
    <div className="lf-card p-4">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>
          <div className="fw-semibold">{LABELS[search.status] || search.status}</div>
          <div className="lf-muted small">
            {search.keyword}
            {search.location ? ` · ${search.location}` : " · Global"}
          </div>
        </div>
        <span className="fw-semibold">{failed ? "—" : `${percent}%`}</span>
      </div>

      <div className="progress" style={{ height: 10 }} role="progressbar" aria-valuenow={percent}>
        <div
          className={`progress-bar ${failed ? "bg-danger" : ""} ${
            search.status === "PROCESSING" ? "progress-bar-striped progress-bar-animated" : ""
          }`}
          style={{ width: `${failed ? 100 : percent}%` }}
        />
      </div>

      <div className="lf-muted small mt-2">
        {search.processed} / {total} processed
      </div>

      {failed ? (
        <div className="alert alert-danger mt-3 mb-0 py-2">
          {search.error || "The search provider failed."}
        </div>
      ) : null}

      {stats.notice ? (
        <div className="alert alert-warning mt-3 mb-0 py-2 small">{stats.notice}</div>
      ) : null}

      {search.status === "COMPLETED" ? (
        <ul className="list-unstyled small mt-3 mb-0 d-flex flex-wrap gap-3">
          <li>{total} results discovered</li>
          <li className="text-success">{stats.saved ?? 0} saved</li>
          <li className="text-secondary">{stats.duplicates ?? 0} duplicates</li>
          <li className="text-warning">{stats.unreachable ?? 0} websites unavailable</li>
          <li className="text-danger">{stats.errors ?? 0} processing errors</li>
          <li className="text-primary">{stats.emailsFound ?? 0} public emails found</li>
        </ul>
      ) : null}
    </div>
  );
}
