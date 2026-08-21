"use client";

const LEAD_STATUSES = [
  "NEW", "CONTACTED", "REPLIED", "QUALIFIED",
  "CONVERTED", "NOT_INTERESTED", "ARCHIVED",
];

export default function Filters({ value, keywords = [], onChange, onReset }) {
  const set = (patch) => onChange({ ...value, ...patch, page: 1 });

  return (
    <div className="lf-card p-3 mb-3">
      <div className="row g-2 align-items-end">
        <div className="col-12 col-md-3">
          <label className="form-label small lf-muted mb-1">Search</label>
          <input
            className="form-control form-control-sm"
            placeholder="Company, name, email or phone"
            value={value.q || ""}
            onChange={(event) => set({ q: event.target.value })}
          />
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Keyword</label>
          <select
            className="form-select form-select-sm"
            value={value.keyword || ""}
            onChange={(event) => set({ keyword: event.target.value })}
          >
            <option value="">All keywords</option>
            {keywords.map((keyword) => (
              <option key={keyword} value={keyword}>
                {keyword}
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Location</label>
          <input
            className="form-control form-control-sm"
            placeholder="Any location"
            value={value.location || ""}
            onChange={(event) => set({ location: event.target.value })}
          />
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Min score</label>
          <select
            className="form-select form-select-sm"
            value={value.minScore ?? ""}
            onChange={(event) => set({ minScore: event.target.value })}
          >
            <option value="">Any score</option>
            <option value="80">Hot (80+)</option>
            <option value="60">Warm (60+)</option>
            <option value="40">Potential (40+)</option>
          </select>
        </div>

        <div className="col-6 col-md-3 d-flex gap-2">
          <div className="flex-grow-1">
            <label className="form-label small lf-muted mb-1">Email</label>
            <select
              className="form-select form-select-sm"
              value={value.hasEmail || "any"}
              onChange={(event) => set({ hasEmail: event.target.value })}
            >
              <option value="any">Any</option>
              <option value="yes">Available</option>
              <option value="no">Missing</option>
            </select>
          </div>
          <div className="flex-grow-1">
            <label className="form-label small lf-muted mb-1">Email status</label>
            <select
              className="form-select form-select-sm"
              value={value.emailStatus || "any"}
              onChange={(event) => set({ emailStatus: event.target.value })}
            >
              <option value="any">Any</option>
              <option value="valid">Valid</option>
              <option value="invalid">Invalid</option>
              <option value="unknown">Unknown</option>
              <option value="not_checked">Not checked</option>
            </select>
          </div>
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Phone status</label>
          <select
            className="form-select form-select-sm"
            value={value.phoneStatus || "any"}
            onChange={(event) => set({ phoneStatus: event.target.value })}
          >
            <option value="any">Any</option>
            <option value="valid">Active line</option>
            <option value="invalid">Invalid</option>
            <option value="unknown">Unknown</option>
            <option value="not_checked">Not checked</option>
          </select>
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Lead type</label>
          <select
            className="form-select form-select-sm"
            value={value.sourceType || "any"}
            onChange={(event) => set({ sourceType: event.target.value })}
          >
            <option value="any">All leads</option>
            <option value="intent_post">Asked for this service</option>
            <option value="website_analysis">Business website</option>
            <option value="social_profile">Social profile</option>
            <option value="search_result">Search listing only</option>
          </select>
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Lead status</label>
          <select
            className="form-select form-select-sm"
            value={value.leadStatus || "any"}
            onChange={(event) => set({ leadStatus: event.target.value })}
          >
            <option value="any">Any status</option>
            {LEAD_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace("_", " ")}
              </option>
            ))}
          </select>
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">From</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={value.from || ""}
            onChange={(event) => set({ from: event.target.value })}
          />
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">To</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={value.to || ""}
            onChange={(event) => set({ to: event.target.value })}
          />
        </div>

        <div className="col-6 col-md-2">
          <label className="form-label small lf-muted mb-1">Country</label>
          <input
            className="form-control form-control-sm"
            placeholder="Any country"
            value={value.country || ""}
            onChange={(event) => set({ country: event.target.value })}
          />
        </div>

        <div className="col-12 col-md-auto ms-md-auto">
          <button type="button" className="btn btn-sm btn-light w-100" onClick={onReset}>
            Reset filters
          </button>
        </div>
      </div>
    </div>
  );
}
